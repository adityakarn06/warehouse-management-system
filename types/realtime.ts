/**
 * Hand-written (not Zod-derived): these shapes arrive on a 2s tick per truck.
 * Validating every tick with a full schema parse is a perf decision left for
 * the socket-integration phase — scaffolding only needs the compile-time shape.
 */
import type { ActiveDelay, TruckStatus } from "@/schemas/common.schema";

export interface LiveTruckView {
  truckId: string;
  reference: string;
  routeId: string | null;
  shipmentId: string | null;
  latitude: number;
  longitude: number;
  progress: number;
  speedKmph: number;
  baseSpeedKmph: number;
  eta: string | null;
  status: TruckStatus;
  activeDelay: ActiveDelay;
  arrivedAt: string | null;
  lastUpdatedAt: string;
  sequenceNumber: number;
}

export interface TruckPositionPayload {
  truckId: string;
  reference: string;
  shipmentId: string | null;
  latitude: number;
  longitude: number;
  previousLatitude?: number;
  previousLongitude?: number;
  targetLatitude: number;
  targetLongitude: number;
  progress: number;
  speedKmph: number;
  eta: string | null;
  status: TruckStatus;
  serverTimestamp: string;
  sequenceNumber: number;
}

export interface TruckEtaPayload {
  truckId: string;
  reference: string;
  shipmentId: string | null;
  eta: string | null;
  progress: number;
  speedKmph: number;
  serverTimestamp: string;
  sequenceNumber: number;
}

export interface TruckStatusChangedPayload {
  truckId: string;
  reference: string;
  shipmentId: string | null;
  previousStatus: TruckStatus;
  status: TruckStatus;
  activeDelay: ActiveDelay;
  progress: number;
  speedKmph: number;
  eta: string | null;
  serverTimestamp: string;
  sequenceNumber: number;
}

export interface AlertCreatedPayload {
  alertId: string;
  type: string;
  severity: "INFO" | "WARNING" | "CRITICAL";
  title: string;
  message: string;
  truckId: string | null;
  shipmentId: string | null;
  dockDoorId: string | null;
  createdAt: string;
}

export interface DockStatusChangedPayload {
  dockDoorId: string;
  code: string;
  previousStatus: string;
  status: string;
  unavailableReason?: string;
  serverTimestamp: string;
}

export interface DockAssignedPayload {
  assignmentId: string;
  truckId: string;
  shipmentId: string;
  dockDoorId: string;
  dockCode: string;
  status: string;
  score: number;
  reasons: string[];
  serverTimestamp: string;
}

export interface DockReassignedPayload extends DockAssignedPayload {
  previousAssignmentId: string;
  previousDockDoorId: string;
  previousDockCode: string;
  reason: string;
}

export type SubscribeAck<T> =
  | { ok: true; room: string; data: T }
  | { ok: false; error: string };

/** `subscribe:shipment` ack `data` — realtime.md's `{ shipmentId, truck }`. */
export interface ShipmentSnapshot {
  shipmentId: string;
  truck: LiveTruckView | null;
}

/** Server → client — events are emitted by name, never a `{ type, data }` envelope. */
export interface ServerToClientEvents {
  TRUCK_POSITION_UPDATED: (payload: TruckPositionPayload) => void;
  TRUCK_ETA_UPDATED: (payload: TruckEtaPayload) => void;
  TRUCK_STATUS_CHANGED: (payload: TruckStatusChangedPayload) => void;
  ALERT_CREATED: (payload: AlertCreatedPayload) => void;
  DOCK_STATUS_CHANGED: (payload: DockStatusChangedPayload) => void;
  DOCK_ASSIGNED: (payload: DockAssignedPayload) => void;
  DOCK_REASSIGNED: (payload: DockReassignedPayload) => void;
}

/** Client → server — every subscribe/unsubscribe answers through an ack. */
export interface ClientToServerEvents {
  "subscribe:operations": (ack: (res: SubscribeAck<LiveTruckView[]>) => void) => void;
  "subscribe:truck": (
    args: { truckId: string },
    ack: (res: SubscribeAck<LiveTruckView>) => void,
  ) => void;
  "subscribe:shipment": (
    args: { shipmentId: string },
    ack: (res: SubscribeAck<ShipmentSnapshot>) => void,
  ) => void;
  "unsubscribe:operations": (ack: (res: SubscribeAck<null>) => void) => void;
  "unsubscribe:truck": (args: { truckId: string }, ack: (res: SubscribeAck<null>) => void) => void;
  "unsubscribe:shipment": (
    args: { shipmentId: string },
    ack: (res: SubscribeAck<null>) => void,
  ) => void;
}
