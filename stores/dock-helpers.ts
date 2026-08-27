import type { DockDetail, DockStatus, DockStatusChangedPayload } from "@/types";

export interface LiveDockEntry {
  dockId: string;
  code: string;
  status: DockStatus;
  occupyingTruckId: string | null;
  activeAssignmentId: string | null;
  /** Why the door is out of service, as the server reported it. `null` for any
   * status other than `UNAVAILABLE` — carrying a stale reason on a repaired
   * door would let the board explain an outage that is over. */
  unavailableReason: string | null;
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

/**
 * What `applyDockAssignment` actually needs: the "this truck now holds this
 * door" fact. `DockAssignedPayload` and `DockReassignedPayload` are both
 * assignable to it, and so is a row returned by the assignment command — which
 * is why `score` is nullable here while the socket contract keeps it required.
 * The four `previous*`/`reason` fields are what mark a fact as a reassignment.
 */
export interface AssignmentFact {
  assignmentId: string;
  truckId: string;
  shipmentId: string | null;
  dockDoorId: string;
  dockCode: string;
  status: string;
  score: number | null;
  reasons: string[];
  serverTimestamp: string;
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
 * Fills in doors the store has never seen, leaving every existing entry alone.
 *
 * Unlike `replaceDockSnapshot` this never discards live state, so a second
 * board can seed from its own REST list without clobbering what the dashboard
 * (or a socket event) already established. It exists because
 * `DOCK_STATUS_CHANGED` creates an entry for an unknown door with
 * `occupyingTruckId: null` — accurate about the status it carries, but silently
 * read as "this door is empty" by anything that trusts the live entry over its
 * REST row.
 */
export function mergeDockSnapshot(state: DockState, docks: LiveDockEntry[]): DocksById {
  let docksById = state.docksById;

  for (const dock of docks) {
    if (dock.dockId in docksById) continue;
    docksById = { ...docksById, [dock.dockId]: dock };
  }

  return docksById;
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
      unavailableReason: payload.status === "UNAVAILABLE" ? (payload.unavailableReason ?? null) : null,
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
export function applyDockAssignment(state: DockState, payload: AssignmentFact): DockState {
  const previousDockDoorId = payload.previousDockDoorId;
  const isReassignment = previousDockDoorId !== undefined;
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

    if (previousDockDoorId !== undefined) {
      const previousDoor = docksById[previousDockDoorId];
      if (
        previousDoor &&
        previousDoor.occupyingTruckId === payload.truckId &&
        !isOlderThanStored(previousDoor.updatedAt, payload.serverTimestamp)
      ) {
        docksById = {
          ...docksById,
          [previousDockDoorId]: {
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
          previousDockDoorId: previousDockDoorId,
          previousDockCode: isReassignment ? payload.previousDockCode : undefined,
          reason: isReassignment ? payload.reason : undefined,
        },
      };

  return { docksById, assignmentsByTruckId };
}

/** The `POST /trucks/:truckId/dock-assignment` assignment row, as far as this
 * reducer needs it. Narrower than the schema type so the reducer stays usable
 * from both the command path and a future snapshot path. */
export interface CommandAssignment {
  id: string;
  truckId: string;
  shipmentId: string;
  dockDoorId: string;
  status: string;
  score?: number | null;
  reasons?: string[];
}

/**
 * Applies the authoritative dock row returned by
 * `PATCH /docks/:dockId/status` (and the status carried by
 * `POST /docks/:dockId/release`) without waiting for the socket round-trip.
 *
 * `updatedAt` from the server row is reused as this entry's timestamp so the
 * shared `isOlderThanStored` guard still orders it against live events — the
 * matching `DOCK_STATUS_CHANGED` is the same fact and simply re-applies.
 *
 * The occupant comes from the server's own `ASSIGNED` row; nothing is derived.
 */
export function applyDockCommandStatus(state: DockState, dock: DockDetail): DockState {
  const existing = state.docksById[dock.id];
  if (isOlderThanStored(existing?.updatedAt, dock.updatedAt)) return state;

  // `assignments` is optional on the detail schema, so an absent array means
  // "not reported" — distinct from "reported empty". Treating the two alike
  // would free a door the backend never said was free: putting a booked door
  // back into service returns it as RESERVED, and clearing the occupant there
  // would show a reserved-but-empty door and drop the truck's dock from the
  // selected-truck panel.
  const reportsAssignments = dock.assignments !== undefined;
  const assigned = dock.assignments?.find((assignment) => assignment.status === "ASSIGNED") ?? null;

  const docksById: DocksById = {
    ...state.docksById,
    [dock.id]: {
      dockId: dock.id,
      code: dock.code,
      status: dock.status,
      occupyingTruckId: reportsAssignments
        ? (assigned?.truck.id ?? null)
        : (existing?.occupyingTruckId ?? null),
      activeAssignmentId: reportsAssignments
        ? (assigned?.id ?? null)
        : (existing?.activeAssignmentId ?? null),
      unavailableReason: dock.status === "UNAVAILABLE" ? (dock.unavailableReason ?? null) : null,
      updatedAt: dock.updatedAt,
    },
  };

  // The door no longer holds an ASSIGNED row, so its former occupant's
  // assignment entry must go with it — see `applyDockStatus`.
  let assignmentsByTruckId = state.assignmentsByTruckId;
  const strandedTruckId = existing?.occupyingTruckId;
  if (
    reportsAssignments &&
    !assigned &&
    strandedTruckId &&
    strandedTruckId in assignmentsByTruckId &&
    assignmentsByTruckId[strandedTruckId].dockDoorId === dock.id
  ) {
    const next = { ...assignmentsByTruckId };
    delete next[strandedTruckId];
    assignmentsByTruckId = next;
  }

  return { docksById, assignmentsByTruckId };
}

/**
 * Applies the assignment row returned by `POST /trucks/:truckId/dock-assignment`.
 *
 * Deliberately **not** guarded by `isOlderThanStored`: this is the response to
 * the very command that caused the change, so it is the newest truth at the
 * moment it returns. It is also stamped with the timestamp already stored
 * rather than a client clock — a client running ahead of the server would
 * otherwise poison the guard and silently drop the next few minutes of genuine
 * socket events for this truck and door. The `DOCK_ASSIGNED` that follows
 * carries the real server time and re-applies the same fact.
 */
export function applyDockCommandAssignment(
  state: DockState,
  assignment: CommandAssignment,
  /** Resolved by the caller from a row that carries a real code; `null` when no
   * such row exists anywhere in the response or the store. */
  dockCode: string | null,
  previousDockDoorId: string | null,
): DockState {
  const door = state.docksById[assignment.dockDoorId];
  const existingAssignment = state.assignmentsByTruckId[assignment.truckId];

  let docksById = state.docksById;

  // Only a door already known is updated in place — one never seen before is
  // left for the next DOCK_STATUS_CHANGED or snapshot to give a real status,
  // rather than guessing one here.
  if (door) {
    docksById = {
      ...docksById,
      [assignment.dockDoorId]: {
        ...door,
        occupyingTruckId: assignment.truckId,
        activeAssignmentId: assignment.id,
      },
    };
  }

  // Moving a truck by hand frees the door it came off (docs/api.md: the old row
  // is CANCELLED and its door released).
  if (previousDockDoorId && previousDockDoorId !== assignment.dockDoorId) {
    const previousDoor = docksById[previousDockDoorId];
    if (previousDoor && previousDoor.occupyingTruckId === assignment.truckId) {
      docksById = {
        ...docksById,
        [previousDockDoorId]: {
          ...previousDoor,
          occupyingTruckId: null,
          activeAssignmentId: null,
        },
      };
    }
  }

  return {
    docksById,
    assignmentsByTruckId: {
      ...state.assignmentsByTruckId,
      [assignment.truckId]: {
        assignmentId: assignment.id,
        truckId: assignment.truckId,
        shipmentId: assignment.shipmentId,
        dockDoorId: assignment.dockDoorId,
        // Keep whatever real code is already known before giving up. The final
        // fallback to the id is unreachable in practice — the caller has
        // already tried the ranking, the exclusions, the current assignment and
        // this store — and exists only to keep the field total.
        dockCode: dockCode ?? existingAssignment?.dockCode ?? door?.code ?? assignment.dockDoorId,
        status: assignment.status,
        score: assignment.score ?? null,
        reasons: assignment.reasons ?? [],
        serverTimestamp:
          existingAssignment?.serverTimestamp ?? door?.updatedAt ?? new Date().toISOString(),
      },
    },
  };
}
