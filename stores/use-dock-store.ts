import { create } from "zustand";

import type {
  DockAssignedPayload,
  DockDetail,
  DockReassignedPayload,
  DockStatusChangedPayload,
} from "@/types";

import {
  applyDockAssignment,
  applyDockCommandAssignment,
  applyDockCommandStatus,
  applyDockStatus,
  mergeDockSnapshot,
  replaceDockSnapshot,
  seedAssignments,
  type CommandAssignment,
  type DockState,
  type LiveAssignmentEntry,
  type LiveDockEntry,
  type SnapshotAssignment,
} from "./dock-helpers";

export type { CommandAssignment, LiveAssignmentEntry, LiveDockEntry, SnapshotAssignment };

interface DockActions {
  hydrateFromSnapshot: (docks: LiveDockEntry[]) => void;
  /** Seeds only doors the store has never seen — for a second board that must
   * not clobber live state the dashboard already established. */
  mergeFromSnapshot: (docks: LiveDockEntry[]) => void;
  /** Seeds `activeAssignments` from the same REST snapshot, so a truck
   * assigned before the page loaded shows its dock. */
  seedAssignmentsFromSnapshot: (assignments: SnapshotAssignment[], generatedAt: string) => void;
  applyStatusChange: (payload: DockStatusChangedPayload) => void;
  applyAssigned: (payload: DockAssignedPayload) => void;
  applyReassigned: (payload: DockReassignedPayload) => void;
  /** Applies the dock row a status/release command returned, so the board
   * reflects the backend's decision without waiting for the socket echo.
   * The matching `DOCK_STATUS_CHANGED` re-applies the same fact harmlessly. */
  applyStatusCommandResult: (dock: DockDetail) => void;
  /** Applies the assignment row `POST /dock-assignment` returned. */
  applyAssignmentCommandResult: (
    assignment: CommandAssignment,
    dockCode: string | null,
    previousDockDoorId: string | null,
  ) => void;
  clear: () => void;
}

type DockStore = DockState & DockActions;

export const useDockStore = create<DockStore>()((set) => ({
  docksById: {},
  assignmentsByTruckId: {},

  hydrateFromSnapshot: (docks) => set(() => ({ docksById: replaceDockSnapshot(docks) })),

  mergeFromSnapshot: (docks) => set((state) => ({ docksById: mergeDockSnapshot(state, docks) })),

  seedAssignmentsFromSnapshot: (assignments, generatedAt) =>
    set((state) => ({ assignmentsByTruckId: seedAssignments(state, assignments, generatedAt) })),

  applyStatusChange: (payload) => set((state) => applyDockStatus(state, payload)),

  applyAssigned: (payload) =>
    set((state) => applyDockAssignment(state, payload)),

  applyReassigned: (payload) =>
    set((state) => applyDockAssignment(state, payload)),

  applyStatusCommandResult: (dock) => set((state) => applyDockCommandStatus(state, dock)),

  applyAssignmentCommandResult: (assignment, dockCode, previousDockDoorId) =>
    set((state) => applyDockCommandAssignment(state, assignment, dockCode, previousDockDoorId)),

  clear: () => set({ docksById: {}, assignmentsByTruckId: {} }),
}));
