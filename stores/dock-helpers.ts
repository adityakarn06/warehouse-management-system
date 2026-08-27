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
  /** `null` on a snapshot-seeded entry: `/yard/overview` carries a shipment
   * *reference*, not an id, and this must not invent one. Live
   * `DOCK_ASSIGNED`/`DOCK_REASSIGNED` payloads always carry the real id. */
  shipmentId: string | null;
  dockDoorId: string;
  dockCode: string;
  status: string;
  /** `null` where the backend did not score the assignment. */
  score: number | null;
  reasons: string[];
  serverTimestamp: string;
  /** Present only when this entry came from `DOCK_REASSIGNED` — the door the
   * truck was moved off of, and why. Absent for a plain `DOCK_ASSIGNED`. */
  previousAssignmentId?: string;
  previousDockDoorId?: string;
  previousDockCode?: string;
  reason?: string;
}

/** The `/yard/overview` assignment row, as far as this reducer needs it. */
export interface SnapshotAssignment {
  id: string;
  status: string;
  truckId: string;
  dockDoorId: string;
  dockCode: string;
  score?: number | null;
  reasons?: string[];
}

export type DocksById = Record<string, LiveDockEntry>;
export type AssignmentsByTruckId = Record<string, LiveAssignmentEntry>;

export interface DockState {
  docksById: DocksById;
  assignmentsByTruckId: AssignmentsByTruckId;
}

/** Dock events carry no `sequenceNumber` — order them by `serverTimestamp`
 * instead. A strictly older timestamp than what's stored is dropped. */
function isOlderThanStored(storedTimestamp: string | undefined, serverTimestamp: string): boolean {
  return storedTimestamp !== undefined && serverTimestamp < storedTimestamp;
}

export function replaceDockSnapshot(docks: LiveDockEntry[]): DocksById {
  return Object.fromEntries(docks.map((dock) => [dock.dockId, dock]));
}

/**
 * Seeds `assignmentsByTruckId` from the REST snapshot's `activeAssignments`.
 *
 * Without this the map is empty until a `DOCK_ASSIGNED` happens to arrive
 * during the session, so every truck assigned *before* the page loaded shows
 * no dock in the selected-truck panel. `generatedAt` becomes each entry's
 * `serverTimestamp`, which is both the honest "as of" instant and what lets
 * the ordering guard in `applyDockAssignment` keep a newer live event from
 * being regressed by a later snapshot refetch.
 */
export function seedAssignments(
  state: DockState,
  assignments: SnapshotAssignment[],
  generatedAt: string,
): AssignmentsByTruckId {
  const seeded: AssignmentsByTruckId = {};

  for (const assignment of assignments) {
    const existing = state.assignmentsByTruckId[assignment.truckId];
    // A live event newer than this snapshot wins — the debounced refetch that
    // produces it can land after the socket already moved the truck on.
    if (existing && existing.serverTimestamp > generatedAt) {
      seeded[assignment.truckId] = existing;
      continue;
    }

    seeded[assignment.truckId] = {
      assignmentId: assignment.id,
      truckId: assignment.truckId,
      shipmentId: null,
      dockDoorId: assignment.dockDoorId,
      dockCode: assignment.dockCode,
      status: assignment.status,
      score: assignment.score ?? null,
      reasons: assignment.reasons ?? [],
      serverTimestamp: generatedAt,
    };
  }

  return seeded;
}

export function applyDockStatus(state: DockState, payload: DockStatusChangedPayload): DockState {
  const existing = state.docksById[payload.dockDoorId];
  if (isOlderThanStored(existing?.updatedAt, payload.serverTimestamp)) return state;

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
  if (!isOlderThanStored(existing?.updatedAt, payload.serverTimestamp)) {
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
        !isOlderThanStored(previousDoor.updatedAt, payload.serverTimestamp)
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
  const assignmentIsStale = isOlderThanStored(existingAssignment?.serverTimestamp, payload.serverTimestamp);

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
          previousAssignmentId: isReassignment ? payload.previousAssignmentId : undefined,
          previousDockDoorId: isReassignment ? payload.previousDockDoorId : undefined,
          previousDockCode: isReassignment ? payload.previousDockCode : undefined,
          reason: isReassignment ? payload.reason : undefined,
        },
      };

  return { docksById, assignmentsByTruckId };
}
