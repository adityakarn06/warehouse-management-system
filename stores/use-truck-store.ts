import { create } from "zustand";

import type { DelayResult } from "@/schemas/simulation.schema";
import type { LiveTruckView, TruckEtaPayload, TruckPositionPayload, TruckStatusChangedPayload } from "@/types";

import {
  acceptTruckPosition,
  applyDelayResult,
  removeTruckEntry,
  replaceAllTruckSnapshots,
  replaceTruckSnapshot,
  updateTruckEta,
  updateTruckStatus,
  type LiveTruckEntry,
  type TrucksById,
} from "./truck-helpers";

export type { LiveTruckEntry };

interface TruckState {
  trucksById: TrucksById;
}

interface TruckActions {
  /** Full-fleet snapshot — `subscribe:operations` ack, including reconnect. */
  hydrateFromSnapshot: (trucks: LiveTruckView[]) => void;
  /** Single-truck snapshot — `subscribe:truck` / `subscribe:shipment` ack,
   * including reconnect. Upserts one truck without disturbing the rest. */
  applySnapshot: (truck: LiveTruckView) => void;
  applyPositionUpdate: (payload: TruckPositionPayload) => void;
  applyEtaUpdate: (payload: TruckEtaPayload) => void;
  applyStatusChange: (payload: TruckStatusChangedPayload) => void;
  /** Authoritative truck state returned by a delay / clear-delay command —
   * applied directly so the command needs no follow-up GET. */
  applyCommandResult: (truck: DelayResult["truck"]) => void;
  removeTruck: (truckId: string) => void;
  clear: () => void;
}

type TruckStore = TruckState & TruckActions;

export const useTruckStore = create<TruckStore>()((set) => ({
  trucksById: {},

  hydrateFromSnapshot: (trucks) =>
    set(() => ({ trucksById: replaceAllTruckSnapshots(trucks, Date.now()) })),

  applySnapshot: (truck) =>
    set((state) => ({ trucksById: replaceTruckSnapshot(state.trucksById, truck, Date.now()) })),

  applyPositionUpdate: (payload) =>
    set((state) => ({ trucksById: acceptTruckPosition(state.trucksById, payload, Date.now()) })),

  applyEtaUpdate: (payload) =>
    set((state) => ({ trucksById: updateTruckEta(state.trucksById, payload, Date.now()) })),

  applyStatusChange: (payload) =>
    set((state) => ({ trucksById: updateTruckStatus(state.trucksById, payload, Date.now()) })),

  applyCommandResult: (truck) =>
    set((state) => ({ trucksById: applyDelayResult(state.trucksById, truck, Date.now()) })),

  removeTruck: (truckId) => set((state) => ({ trucksById: removeTruckEntry(state.trucksById, truckId) })),

  clear: () => set({ trucksById: {} }),
}));
