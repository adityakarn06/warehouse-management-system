import { useEffect } from "react";

import { connectSocket, disconnectSocket, reconnectSocket, subscribeOperations, subscribeShipment, subscribeTruck } from "@/lib/socket";
import {
  useConnectionStatus,
  useLastEventAt,
  useSocketId,
  useSubscribedRooms,
} from "@/stores/selectors";
import { useRealtimeStore } from "@/stores/use-realtime-store";

/** Connection status + controls. Does not itself join any room. */
export function useRealtime() {
  const status = useConnectionStatus();
  const socketId = useSocketId();
  const subscribedRooms = useSubscribedRooms();
  const lastEventAt = useLastEventAt();
  const lastConnectedAt = useRealtimeStore((s) => s.lastConnectedAt);
  const lastError = useRealtimeStore((s) => s.lastError);

  return {
    status,
    socketId,
    lastConnectedAt,
    lastError,
    subscribedRooms,
    lastEventAt,
    connect: connectSocket,
    disconnect: disconnectSocket,
    reconnect: reconnectSocket,
  };
}

/** Joins `operations` for as long as the calling component is mounted.
 * Ref-counted — multiple mounts (e.g. dashboard + yard view) share one room. */
export function useOperationsSubscription(): void {
  useEffect(() => subscribeOperations(), []);
}

/** Joins `truck:{truckId}`. No-op while `truckId` is null/undefined. */
export function useTruckSubscription(truckId: string | null | undefined): void {
  useEffect(() => {
    if (!truckId) return;
    return subscribeTruck(truckId);
  }, [truckId]);
}

/** Joins `shipment:{shipmentId}`. No-op while `shipmentId` is null/undefined. */
export function useShipmentSubscription(shipmentId: string | null | undefined): void {
  useEffect(() => {
    if (!shipmentId) return;
    return subscribeShipment(shipmentId);
  }, [shipmentId]);
}
