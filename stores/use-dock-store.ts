import { create } from "zustand";

import type { DockAssignedPayload, DockReassignedPayload, DockStatusChangedPayload } from "@/types";

import {
  applyDockAssignment,
  applyDockStatus,
  replaceDockSnapshot,
  type DockState,
  type LiveAssignmentEntry,
  type LiveDockEntry,
} from "./dock-helpers";

export type { LiveAssignmentEntry, LiveDockEntry };

interface DockActions {
  hydrateFromSnapshot: (docks: LiveDockEntry[]) => void;
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

  applyStatusChange: (payload) => set((state) => applyDockStatus(state, payload)),

  applyAssigned: (payload) =>
    set((state) => applyDockAssignment(state, payload)),

  applyReassigned: (payload) =>
    set((state) => applyDockAssignment(state, payload)),

  clear: () => set({ docksById: {}, assignmentsByTruckId: {} }),
}));
