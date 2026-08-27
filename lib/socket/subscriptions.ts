import { getSocket } from "./client";
import { useRealtimeStore, useTruckStore } from "@/stores";
import type { SubscribeAck } from "@/types";

/**
 * Ack-driven, ref-counted subscription registry.
 *
 * Two components asking for the same room (e.g. the dashboard and a truck
 * detail panel both watching `TRK-101`) must produce exactly one
 * `subscribe:*` emit and, on release, exactly one `unsubscribe:*` emit — the
 * refcount here is what makes that true. On reconnect (`resubscribeAll`),
 * every entry still in the registry is re-emitted regardless of its
 * refcount, since room membership is dropped by the server on disconnect
 * (docs/realtime.md) and must be rebuilt from scratch.
 */

type Kind = "operations" | "truck" | "shipment";

interface RegistryEntry {
  kind: Kind;
  /** The id/reference this subscription was requested with — may not be canonical. */
  arg: string | null;
  refCount: number;
  /** The canonical room name reported by the ack, once joined. */
  room: string | null;
  /** Set when refCount hit 0 while the subscribe ack was still in flight —
   * the entry is kept around (rather than deleted) purely so the ack handler
   * knows to unsubscribe immediately on arrival instead of leaving an
   * unreleasable room joined forever. */
  pendingRelease: boolean;
}

const registry = new Map<string, RegistryEntry>();

function keyFor(kind: Kind, arg: string | null): string {
  return arg ? `${kind}:${arg}` : kind;
}

function emitUnsubscribe(entry: RegistryEntry): void {
  if (!entry.room) return;
  useRealtimeStore.getState().removeSubscribedRoom(entry.room);

  if (entry.kind === "operations") {
    getSocket().emit("unsubscribe:operations", () => {});
  } else if (entry.kind === "truck" && entry.arg) {
    getSocket().emit("unsubscribe:truck", { truckId: entry.arg }, () => {});
  } else if (entry.kind === "shipment" && entry.arg) {
    useRealtimeStore.getState().clearShipmentResolution(entry.arg);
    getSocket().emit("unsubscribe:shipment", { shipmentId: entry.arg }, () => {});
  }
}

function applyAck<T>(
  key: string,
  entry: RegistryEntry,
  res: SubscribeAck<T>,
  onOk: (data: T, room: string) => void,
): void {
  // The last consumer released this subscription while the ack was still in
  // flight — the room was only just joined server-side and nothing wants it
  // any more, so tear it down immediately instead of leaving it stuck.
  if (entry.pendingRelease) {
    registry.delete(key);
    if (res.ok) {
      entry.room = res.room;
      emitUnsubscribe(entry);
    }
    return;
  }

  if (res.ok) {
    entry.room = res.room;
    // A previous ack's failure ("Shipment X was not found") is a lookup miss,
    // not a connection fault, and would otherwise sit in the connection
    // indicator forever. A successful ack is proof the socket is fine.
    useRealtimeStore.getState().setError(null);
    useRealtimeStore.getState().addSubscribedRoom(res.room);
    onOk(res.data, res.room);
  } else {
    useRealtimeStore.getState().setError(res.error);
  }
}

function emitSubscribeOperations(key: string, entry: RegistryEntry): void {
  getSocket().emit("subscribe:operations", (res) => {
    applyAck(key, entry, res, (trucks) => useTruckStore.getState().hydrateFromSnapshot(trucks));
  });
}

function emitSubscribeTruck(key: string, entry: RegistryEntry, truckId: string): void {
  getSocket().emit("subscribe:truck", { truckId }, (res) => {
    applyAck(key, entry, res, (truck) => useTruckStore.getState().applySnapshot(truck));
  });
}

/**
 * The one subscribe whose ack carries more than a truck snapshot. The caller
 * may have asked with a tracking number or a reference, and only `res.room`
 * plus `data.shipmentId` / `data.truck.truckId` say what that resolved to —
 * `GET /tracking/:trackingNumber` returns no truck id, so this is the sole
 * authoritative link from what the customer typed to the live truck entry.
 * Recorded under the *requested* arg, which is what a consumer holds.
 */
function emitSubscribeShipment(key: string, entry: RegistryEntry, shipmentId: string): void {
  getSocket().emit("subscribe:shipment", { shipmentId }, (res) => {
    applyAck(key, entry, res, (snapshot, room) => {
      // Ordered before the store write so a component reading both in one
      // render pass never sees the truck without the id that points at it.
      useRealtimeStore.getState().recordShipmentResolution(shipmentId, {
        room,
        shipmentId: snapshot.shipmentId,
        truckId: snapshot.truck?.truckId ?? null,
      });
      if (snapshot.truck) useTruckStore.getState().applySnapshot(snapshot.truck);
    });
  });
}

function emit(key: string, entry: RegistryEntry): void {
  if (entry.kind === "operations") return emitSubscribeOperations(key, entry);
  if (entry.kind === "truck" && entry.arg) return emitSubscribeTruck(key, entry, entry.arg);
  if (entry.kind === "shipment" && entry.arg) return emitSubscribeShipment(key, entry, entry.arg);
}

function acquire(kind: Kind, arg: string | null): () => void {
  const key = keyFor(kind, arg);
  const existing = registry.get(key);

  if (existing) {
    existing.refCount += 1;
    existing.pendingRelease = false; // cancel a teardown that hadn't landed yet
  } else {
    const entry: RegistryEntry = { kind, arg, refCount: 1, room: null, pendingRelease: false };
    registry.set(key, entry);
    emit(key, entry);
  }

  return () => release(kind, arg);
}

function release(kind: Kind, arg: string | null): void {
  const key = keyFor(kind, arg);
  const entry = registry.get(key);
  if (!entry) return;

  entry.refCount -= 1;
  if (entry.refCount > 0) return;

  if (!entry.room) {
    // Ack still in flight — let applyAck finish the teardown once it lands,
    // rather than deleting the entry now and orphaning the room it's about
    // to join.
    entry.pendingRelease = true;
    return;
  }

  registry.delete(key);
  emitUnsubscribe(entry);
}

export function subscribeOperations(): () => void {
  return acquire("operations", null);
}

export function subscribeTruck(truckId: string): () => void {
  return acquire("truck", truckId);
}

export function subscribeShipment(shipmentId: string): () => void {
  return acquire("shipment", shipmentId);
}

/**
 * Re-establishes every still-desired room after a reconnect. Room
 * membership is per-socket and dropped on disconnect, so each entry is
 * re-emitted from scratch — the fresh ack re-baselines that room's
 * `sequenceNumber` high-water mark via `hydrateFromSnapshot` /
 * `applySnapshot`, exactly as it would on first subscribe.
 */
export function resubscribeAll(): void {
  for (const [key, entry] of registry.entries()) {
    entry.room = null;
    emit(key, entry);
  }
}

/** Test/debug hook — not used by app code. */
export function _debugRegistrySize(): number {
  return registry.size;
}
