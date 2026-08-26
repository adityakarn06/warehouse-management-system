import type {
  DockAssignedPayload,
  DockReassignedPayload,
  DockStatus,
  DockStatusChangedPayload,
} from "@/types";

export interface LiveDockEntry {
  dockId: string;
  code: string;
  status: DockStatus;
  occupyingTruckId: string | null;
  activeAssignmentId: string | null;
  updatedAt: string;
}

/** The "current assignments" view — exactly the fields the server sends on a
 * `DOCK_ASSIGNED` / `DOCK_REASSIGNED` event, keyed by truck. */
export interface LiveAssignmentEntry {
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

export type DocksById = Record<string, LiveDockEntry>;
export type AssignmentsByTruckId = Record<string, LiveAssignmentEntry>;

export interface DockState {
  docksById: DocksById;
  assignmentsByTruckId: AssignmentsByTruckId;
}

/** Dock events carry no `sequenceNumber` — order them by `serverTimestamp`
 * instead. A strictly older timestamp than what's stored is dropped. */
function isOlderThanStored(existing: { updatedAt: string } | undefined, serverTimestamp: string): boolean {
  return existing !== undefined && serverTimestamp < existing.updatedAt;
}

export function replaceDockSnapshot(docks: LiveDockEntry[]): DocksById {
  return Object.fromEntries(docks.map((dock) => [dock.dockId, dock]));
}

export function applyDockStatus(state: DockState, payload: DockStatusChangedPayload): DockState {
  const existing = state.docksById[payload.dockDoorId];
  if (isOlderThanStored(existing, payload.serverTimestamp)) return state;

  // A door going back into service (AVAILABLE) is no longer occupied or
  // assigned; any other resulting status leaves the current occupant as-is.
  const clearsOccupant = payload.status === "AVAILABLE";

  const docksById: DocksById = {
    ...state.docksById,
    [payload.dockDoorId]: {
      dockId: payload.dockDoorId,
      code: payload.code,
      status: payload.status as DockStatus,
      occupyingTruckId: clearsOccupant ? null : (existing?.occupyingTruckId ?? null),
      activeAssignmentId: clearsOccupant ? null : (existing?.activeAssignmentId ?? null),
      updatedAt: payload.serverTimestamp,
    },
  };

  // A door freed back to AVAILABLE strands its former occupant's assignment
  // record unless it's dropped here too — otherwise `assignmentsByTruckId`
  // keeps pointing that truck at a door it no longer holds.
  let assignmentsByTruckId = state.assignmentsByTruckId;
  if (clearsOccupant && existing?.occupyingTruckId && existing.occupyingTruckId in assignmentsByTruckId) {
    const next = { ...assignmentsByTruckId };
    delete next[existing.occupyingTruckId];
    assignmentsByTruckId = next;
  }

  return { docksById, assignmentsByTruckId };
}

/**
 * `DOCK_ASSIGNED` and `DOCK_REASSIGNED` share this reducer — a reassignment
 * is the same "truck now occupies this door" fact, plus it must free the
 * `previousDockDoorId` the truck just left. Guarded by `serverTimestamp`
 * (dock events carry no sequence number) so a replayed/out-of-order event
 * can't regress state a newer event already applied.
 */
export function applyDockAssignment(
  state: DockState,
  payload: DockAssignedPayload | DockReassignedPayload,
): DockState {
  const isReassignment = "previousDockDoorId" in payload;
  const existing = state.docksById[payload.dockDoorId];

  let docksById = state.docksById;
  if (!isOlderThanStored(existing, payload.serverTimestamp)) {
    // Only a door already known gets updated in place — one never seen
    // before is left for the next DOCK_STATUS_CHANGED or snapshot to
    // populate its real status, rather than guessing one here.
    if (existing) {
      docksById = {
        ...docksById,
        [payload.dockDoorId]: {
          ...existing,
          occupyingTruckId: payload.truckId,
          activeAssignmentId: payload.assignmentId,
          updatedAt: payload.serverTimestamp,
        },
      };
    }

    if (isReassignment) {
      const previousDoor = docksById[payload.previousDockDoorId];
      if (
        previousDoor &&
        previousDoor.occupyingTruckId === payload.truckId &&
        !isOlderThanStored(previousDoor, payload.serverTimestamp)
      ) {
        docksById = {
          ...docksById,
          [payload.previousDockDoorId]: {
            ...previousDoor,
            occupyingTruckId: null,
            activeAssignmentId: null,
            updatedAt: payload.serverTimestamp,
          },
        };
      }
    }
  }

  const existingAssignment = state.assignmentsByTruckId[payload.truckId];
  const assignmentIsStale =
    existingAssignment !== undefined && payload.serverTimestamp < existingAssignment.serverTimestamp;

  const assignmentsByTruckId: AssignmentsByTruckId = assignmentIsStale
    ? state.assignmentsByTruckId
    : {
        ...state.assignmentsByTruckId,
        [payload.truckId]: {
          assignmentId: payload.assignmentId,
          truckId: payload.truckId,
          shipmentId: payload.shipmentId,
          dockDoorId: payload.dockDoorId,
          dockCode: payload.dockCode,
          status: payload.status,
          score: payload.score,
          reasons: payload.reasons,
          serverTimestamp: payload.serverTimestamp,
        },
      };

  return { docksById, assignmentsByTruckId };
}
