import { io, type Socket } from "socket.io-client";

import { useRealtimeStore } from "@/stores";
import type { ClientToServerEvents, ServerToClientEvents } from "@/types";

import { SOCKET_PATH, SOCKET_URL } from "./config";
import { registerEventHandlers } from "./events";
import { resubscribeAll } from "./subscriptions";

type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

/**
 * Module-level singleton — created lazily, once, and never recreated across
 * renders or Fast Refresh/StrictMode remounts. `registerEventHandlers` and
 * the lifecycle listeners below are attached exactly once here, at creation,
 * so a reconnect (which reuses this same `Socket` instance) can never
 * duplicate a handler.
 */
let socket: AppSocket | null = null;

function createSocket(): AppSocket {
  const instance: AppSocket = io(SOCKET_URL, {
    path: SOCKET_PATH,
    transports: ["websocket"],
    autoConnect: false,
  });

  registerEventHandlers(instance);

  instance.on("connect", () => {
    useRealtimeStore.getState().setConnectionStatus("CONNECTED");
    useRealtimeStore.getState().setSocketId(instance.id ?? null);
    useRealtimeStore.getState().setError(null);
    // Room membership is per-socket and dropped on disconnect (docs/realtime.md) —
    // every subscription must be rebuilt, whether this is the first connect
    // or a reconnect.
    resubscribeAll();
  });

  instance.on("disconnect", () => {
    useRealtimeStore.getState().setConnectionStatus("DISCONNECTED");
    useRealtimeStore.getState().setSocketId(null);
    // Room membership is per-socket and the server drops it on every
    // disconnect (docs/realtime.md) — `resubscribeAll` rebuilds the rooms
    // themselves on reconnect, but the store's view must reflect "joined
    // nothing" in the meantime rather than showing stale rooms.
    useRealtimeStore.getState().clearSubscribedRooms();
  });

  instance.on("connect_error", (error) => {
    useRealtimeStore.getState().setConnectionStatus("ERROR");
    useRealtimeStore.getState().setError(error.message);
  });

  instance.io.on("reconnect_attempt", () => {
    useRealtimeStore.getState().setConnectionStatus("RECONNECTING");
  });

  return instance;
}

export function getSocket(): AppSocket {
  if (!socket) socket = createSocket();
  return socket;
}

/**
 * A teardown that has been scheduled but not yet performed. StrictMode (and
 * Fast Refresh) mount, unmount and remount `RealtimeProvider` in a single
 * flush, so a synchronous `disconnect()` in its cleanup closes a websocket
 * that is still in `CONNECTING` — the browser reports that as "WebSocket is
 * closed before the connection is established", and the remount then has to
 * open a second one. Deferring by a task lets the remount cancel it, exactly
 * as `pendingRelease` does for an in-flight subscribe ack in
 * `subscriptions.ts`. A real unmount has nothing to cancel it, so the
 * disconnect still happens.
 */
let pendingDisconnect: ReturnType<typeof setTimeout> | null = null;

function cancelPendingDisconnect(): void {
  if (pendingDisconnect === null) return;
  clearTimeout(pendingDisconnect);
  pendingDisconnect = null;
}

export function connectSocket(): void {
  cancelPendingDisconnect();

  const instance = getSocket();
  // `disconnected` stays true for as long as the handshake is in flight, so
  // this can be reached while the socket is already opening — `connect()` is
  // a no-op in that state and does not open a second transport.
  if (instance.disconnected) {
    useRealtimeStore.getState().setConnectionStatus("CONNECTING");
    instance.connect();
  }
}

export function disconnectSocket(): void {
  if (!socket || pendingDisconnect !== null) return;

  pendingDisconnect = setTimeout(() => {
    pendingDisconnect = null;
    socket?.disconnect();
  }, 0);
}

export function reconnectSocket(): void {
  cancelPendingDisconnect();

  const instance = getSocket();
  instance.disconnect();
  useRealtimeStore.getState().setConnectionStatus("CONNECTING");
  instance.connect();
}
