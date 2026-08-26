import type { Socket } from "socket.io-client";

import { useAlertStore, useDockStore, useRealtimeStore, useTruckStore } from "@/stores";
import type { ClientToServerEvents, ServerToClientEvents } from "@/types";

/**
 * Registers the seven server → client events, by exact name — no generic
 * `{ type, data }` envelope exists on the wire (docs/realtime.md). Each
 * handler does exactly two things: mark liveness, dispatch the raw payload
 * into the Zustand action that owns that slice. No business logic here —
 * the reducers in `stores/*-helpers.ts` already enforce sequencing,
 * staleness and merge rules.
 *
 * Called exactly once, when the singleton socket is created (see
 * `lib/socket/client.ts`) — never re-registered on reconnect, since
 * reconnects reuse the same `Socket` instance.
 */
export function registerEventHandlers(socket: Socket<ServerToClientEvents, ClientToServerEvents>) {
  const markEventReceived = () => useRealtimeStore.getState().markEventReceived();

  socket.on("TRUCK_POSITION_UPDATED", (payload) => {
    useTruckStore.getState().applyPositionUpdate(payload);
    markEventReceived();
  });

  socket.on("TRUCK_ETA_UPDATED", (payload) => {
    useTruckStore.getState().applyEtaUpdate(payload);
    markEventReceived();
  });

  socket.on("TRUCK_STATUS_CHANGED", (payload) => {
    useTruckStore.getState().applyStatusChange(payload);
    markEventReceived();
  });

  socket.on("ALERT_CREATED", (payload) => {
    useAlertStore.getState().pushAlert(payload);
    markEventReceived();
  });

  socket.on("DOCK_STATUS_CHANGED", (payload) => {
    useDockStore.getState().applyStatusChange(payload);
    markEventReceived();
  });

  socket.on("DOCK_ASSIGNED", (payload) => {
    useDockStore.getState().applyAssigned(payload);
    markEventReceived();
  });

  socket.on("DOCK_REASSIGNED", (payload) => {
    useDockStore.getState().applyReassigned(payload);
    markEventReceived();
  });
}
