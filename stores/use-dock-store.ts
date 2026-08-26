import { create } from "zustand";

import type { DockStatus } from "@/types";
import type { DockAssignedPayload, DockReassignedPayload, DockStatusChangedPayload } from "@/types";

export interface LiveDockEntry {
  dockId: string;
  code: string;
  status: DockStatus;
  occupyingTruckId: string | null;
  activeAssignmentId: string | null;
  updatedAt: string;
}

interface DockState {
  docksById: Record<string, LiveDockEntry>;
}

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

  hydrateFromSnapshot: (docks) =>
    set(() => ({ docksById: Object.fromEntries(docks.map((d) => [d.dockId, d])) })),

  applyStatusChange: (payload) =>
    set((state) => {
      const existing = state.docksById[payload.dockDoorId];
      return {
        docksById: {
          ...state.docksById,
          [payload.dockDoorId]: {
            dockId: payload.dockDoorId,
            code: payload.code,
            status: payload.status as DockStatus,
            occupyingTruckId: existing?.occupyingTruckId ?? null,
            activeAssignmentId: existing?.activeAssignmentId ?? null,
            updatedAt: payload.serverTimestamp,
          },
        },
      };
    }),

  applyAssigned: (payload) =>
    set((state) => {
      const existing = state.docksById[payload.dockDoorId];
      return {
        docksById: {
          ...state.docksById,
          [payload.dockDoorId]: {
            dockId: payload.dockDoorId,
            code: payload.dockCode,
            status: existing?.status ?? "RESERVED",
            occupyingTruckId: payload.truckId,
            activeAssignmentId: payload.assignmentId,
            updatedAt: payload.serverTimestamp,
          },
        },
      };
    }),

  applyReassigned: (payload) =>
    set((state) => {
      const existing = state.docksById[payload.dockDoorId];
      return {
        docksById: {
          ...state.docksById,
          [payload.dockDoorId]: {
            dockId: payload.dockDoorId,
            code: payload.dockCode,
            status: existing?.status ?? "RESERVED",
            occupyingTruckId: payload.truckId,
            activeAssignmentId: payload.assignmentId,
            updatedAt: payload.serverTimestamp,
          },
        },
      };
    }),

  clear: () => set({ docksById: {} }),
}));
