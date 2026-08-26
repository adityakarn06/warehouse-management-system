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

export function connectSocket(): void {
  const instance = getSocket();
  if (instance.disconnected) {
    useRealtimeStore.getState().setConnectionStatus("CONNECTING");
    instance.connect();
  }
}

export function disconnectSocket(): void {
  socket?.disconnect();
}

export function reconnectSocket(): void {
  const instance = getSocket();
  instance.disconnect();
  useRealtimeStore.getState().setConnectionStatus("CONNECTING");
  instance.connect();
}
