import { create } from "zustand";

import type { DockAssignedPayload, DockReassignedPayload, DockStatusChangedPayload } from "@/types";

import {
  applyDockAssignment,
  applyDockStatus,
  replaceDockSnapshot,
  seedAssignments,
  type DockState,
  type LiveAssignmentEntry,
  type LiveDockEntry,
  type SnapshotAssignment,
} from "./dock-helpers";

export type { LiveAssignmentEntry, LiveDockEntry, SnapshotAssignment };

interface DockActions {
  hydrateFromSnapshot: (docks: LiveDockEntry[]) => void;
  /** Seeds `activeAssignments` from the same REST snapshot, so a truck
   * assigned before the page loaded shows its dock. */
  seedAssignmentsFromSnapshot: (assignments: SnapshotAssignment[], generatedAt: string) => void;
  applyStatusChange: (payload: DockStatusChangedPayload) => void;
  applyAssigned: (payload: DockAssignedPayload) => void;
  applyReassigned: (payload: DockReassignedPayload) => void;
  clear: () => void;
}

type DockStore = DockState & DockActions;

export const useDockStore = create<DockStore>()((set) => ({
  docksById: {},
  assignmentsByTruckId: {},

  hydrateFromSnapshot: (docks) => set(() => ({ docksById: replaceDockSnapshot(docks) })),

  seedAssignmentsFromSnapshot: (assignments, generatedAt) =>
    set((state) => ({ assignmentsByTruckId: seedAssignments(state, assignments, generatedAt) })),

  applyStatusChange: (payload) => set((state) => applyDockStatus(state, payload)),

  applyAssigned: (payload) =>
    set((state) => applyDockAssignment(state, payload)),

  applyReassigned: (payload) =>
    set((state) => applyDockAssignment(state, payload)),

  clear: () => set({ docksById: {}, assignmentsByTruckId: {} }),
}));
