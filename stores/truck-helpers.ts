import type { DelayResult } from "@/schemas/simulation.schema";
import type {
  ActiveDelay,
  LiveTruckView,
  TruckEtaPayload,
  TruckPositionPayload,
  TruckStatus,
  TruckStatusChangedPayload,
} from "@/types";

/**
 * Raw, server-sourced fields only. `receivedAt` is the sole client-invented
 * field, used purely to time a render-time RAF interpolation between
 * current/target coordinates — it is never fed back into `progress`.
 */
export interface LiveTruckEntry {
  truckId: string;
  reference: string;
  shipmentId: string | null;
  status: TruckStatus;
  activeDelay: ActiveDelay;
  currentLatitude: number;
  currentLongitude: number;
  previousLatitude: number | null;
  previousLongitude: number | null;
  targetLatitude: number;
  targetLongitude: number;
  progress: number;
  speedKmph: number;
  /** Server-sent base (undelayed) speed. `null` for a truck first seen through a
   * live position tick, whose payload does not carry it. Never derived. */
  baseSpeedKmph: number | null;
  eta: string | null;
  serverTimestamp: string;
  receivedAt: number;
  sequenceNumber: number;
}

export type TrucksById = Record<string, LiveTruckEntry>;

/**
 * The per-truck high-water-mark rule (docs/realtime.md): a truck seen for the
 * first time is never stale; otherwise only a strictly lower sequence number
 * is dropped — an equal sequence (idempotent re-delivery) is still applied.
 */
export function isStaleSequence(
  existing: LiveTruckEntry | undefined,
  sequenceNumber: number,
): boolean {
  return existing !== undefined && sequenceNumber < existing.sequenceNumber;
}

/**
 * Builds an entry from a snapshot (`subscribe:*` ack or reconnect). A
 * snapshot has no interpolation leg yet, so `previous*` is cleared and
 * `target*` starts pinned to the current position.
 */
export function truckEntryFromSnapshot(view: LiveTruckView, now: number): LiveTruckEntry {
  return {
    truckId: view.truckId,
    reference: view.reference,
    shipmentId: view.shipmentId,
    status: view.status,
    activeDelay: view.activeDelay,
    currentLatitude: view.latitude,
    currentLongitude: view.longitude,
    previousLatitude: null,
    previousLongitude: null,
    targetLatitude: view.latitude,
    targetLongitude: view.longitude,
    progress: view.progress,
    speedKmph: view.speedKmph,
    baseSpeedKmph: view.baseSpeedKmph,
    eta: view.eta,
    serverTimestamp: view.lastUpdatedAt,
    receivedAt: now,
    sequenceNumber: view.sequenceNumber,
  };
}

/**
 * Upserts a single truck from a snapshot (`subscribe:truck` /
 * `subscribe:shipment`, including on reconnect) without disturbing any other
 * truck already held. Snapshots always re-baseline the high-water mark, even
 * to a lower value than what was previously applied (docs/realtime.md).
 */
export function replaceTruckSnapshot(
  trucksById: TrucksById,
  view: LiveTruckView,
  now: number,
): TrucksById {
  return { ...trucksById, [view.truckId]: truckEntryFromSnapshot(view, now) };
}

/** Full-fleet snapshot from `subscribe:operations` — replaces the whole map. */
export function replaceAllTruckSnapshots(views: LiveTruckView[], now: number): TrucksById {
  return Object.fromEntries(views.map((view) => [view.truckId, truckEntryFromSnapshot(view, now)]));
}

/**
 * `TRUCK_POSITION_UPDATED` — the only live event that can introduce a truck
 * that has not been seen yet, since it is the one payload that carries a
 * full position. `activeDelay` is not on this payload, so it is preserved
 * from the existing entry (defaulting to `NORMAL` for a truck seen for the
 * first time via a live tick, matching a freshly-seeded fleet).
 */
export function acceptTruckPosition(
  trucksById: TrucksById,
  payload: TruckPositionPayload,
  now: number,
): TrucksById {
  const existing = trucksById[payload.truckId];
  if (isStaleSequence(existing, payload.sequenceNumber)) return trucksById;

  return {
    ...trucksById,
    [payload.truckId]: {
      truckId: payload.truckId,
      reference: payload.reference,
      shipmentId: payload.shipmentId,
      status: payload.status,
      activeDelay: existing?.activeDelay ?? "NORMAL",
      currentLatitude: payload.latitude,
      currentLongitude: payload.longitude,
      previousLatitude: payload.previousLatitude ?? existing?.currentLatitude ?? null,
      previousLongitude: payload.previousLongitude ?? existing?.currentLongitude ?? null,
      targetLatitude: payload.targetLatitude,
      targetLongitude: payload.targetLongitude,
      progress: payload.progress,
      speedKmph: payload.speedKmph,
      baseSpeedKmph: existing?.baseSpeedKmph ?? null,
      eta: payload.eta,
      serverTimestamp: payload.serverTimestamp,
      receivedAt: now,
      sequenceNumber: payload.sequenceNumber,
    },
  };
}

/**
 * `TRUCK_ETA_UPDATED` — carries no position, so a truck not already held is
 * dropped rather than fabricated; the next snapshot re-baselines it.
 */
export function updateTruckEta(
  trucksById: TrucksById,
  payload: TruckEtaPayload,
  now: number,
): TrucksById {
  const existing = trucksById[payload.truckId];
  if (!existing || isStaleSequence(existing, payload.sequenceNumber)) return trucksById;

  return {
    ...trucksById,
    [payload.truckId]: {
      ...existing,
      eta: payload.eta,
      progress: payload.progress,
      speedKmph: payload.speedKmph,
      serverTimestamp: payload.serverTimestamp,
      receivedAt: now,
      sequenceNumber: payload.sequenceNumber,
    },
  };
}

/**
 * `TRUCK_STATUS_CHANGED` — carries no position either; same drop-if-unknown
 * rule as `updateTruckEta`.
 */
export function updateTruckStatus(
  trucksById: TrucksById,
  payload: TruckStatusChangedPayload,
  now: number,
): TrucksById {
  const existing = trucksById[payload.truckId];
  if (!existing || isStaleSequence(existing, payload.sequenceNumber)) return trucksById;

  return {
    ...trucksById,
    [payload.truckId]: {
      ...existing,
      status: payload.status,
      activeDelay: payload.activeDelay,
      progress: payload.progress,
      speedKmph: payload.speedKmph,
      eta: payload.eta,
      serverTimestamp: payload.serverTimestamp,
      receivedAt: now,
      sequenceNumber: payload.sequenceNumber,
    },
  };
}

/**
 * The authoritative truck state returned by `POST .../delay` and
 * `.../clear-delay`. The backend owns speed, ETA, status and the scenario, so
 * this is applied verbatim and no follow-up GET is issued (docs/api.md).
 *
 * Same rules as the two events above: no position on the payload, so an
 * unknown truck is dropped rather than fabricated, and a response that lost
 * the race against a tick which already advanced the high-water mark is stale.
 * `serverTimestamp` is left alone — the command response carries none.
 */
export function applyDelayResult(
  trucksById: TrucksById,
  truck: DelayResult["truck"],
  now: number,
): TrucksById {
  const existing = trucksById[truck.truckId];
  if (!existing || isStaleSequence(existing, truck.sequenceNumber)) return trucksById;

  return {
    ...trucksById,
    [truck.truckId]: {
      ...existing,
      status: truck.status,
      activeDelay: truck.activeDelay,
      progress: truck.progress,
      speedKmph: truck.speedKmph,
      baseSpeedKmph: truck.baseSpeedKmph,
      eta: truck.eta ?? null,
      receivedAt: now,
      sequenceNumber: truck.sequenceNumber,
    },
  };
}

export function removeTruckEntry(trucksById: TrucksById, truckId: string): TrucksById {
  if (!(truckId in trucksById)) return trucksById;
  const next = { ...trucksById };
  delete next[truckId];
  return next;
}
