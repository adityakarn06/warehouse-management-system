import { create } from "zustand";

import type { ActiveDelay, TruckStatus } from "@/types";
import type {
  LiveTruckView,
  TruckEtaPayload,
  TruckPositionPayload,
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
  eta: string | null;
  serverTimestamp: string;
  receivedAt: number;
  sequenceNumber: number;
}

interface TruckState {
  trucksById: Record<string, LiveTruckEntry>;
}

interface TruckActions {
  hydrateFromSnapshot: (trucks: LiveTruckView[]) => void;
  applyPositionUpdate: (payload: TruckPositionPayload) => void;
  applyEtaUpdate: (payload: TruckEtaPayload) => void;
  applyStatusChange: (payload: TruckStatusChangedPayload) => void;
  removeTruck: (truckId: string) => void;
  clear: () => void;
}

type TruckStore = TruckState & TruckActions;

function fromLiveTruckView(view: LiveTruckView): LiveTruckEntry {
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
    eta: view.eta,
    serverTimestamp: view.lastUpdatedAt,
    receivedAt: Date.now(),
    sequenceNumber: view.sequenceNumber,
  };
}

function isStale(existing: LiveTruckEntry | undefined, sequenceNumber: number) {
  return existing !== undefined && sequenceNumber < existing.sequenceNumber;
}

export const useTruckStore = create<TruckStore>()((set) => ({
  trucksById: {},

  hydrateFromSnapshot: (trucks) =>
    set(() => ({
      trucksById: Object.fromEntries(trucks.map((t) => [t.truckId, fromLiveTruckView(t)])),
    })),

  applyPositionUpdate: (payload) =>
    set((state) => {
      if (isStale(state.trucksById[payload.truckId], payload.sequenceNumber)) return state;
      const existing = state.trucksById[payload.truckId];
      return {
        trucksById: {
          ...state.trucksById,
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
            eta: payload.eta,
            serverTimestamp: payload.serverTimestamp,
            receivedAt: Date.now(),
            sequenceNumber: payload.sequenceNumber,
          },
        },
      };
    }),

  applyEtaUpdate: (payload) =>
    set((state) => {
      const existing = state.trucksById[payload.truckId];
      if (!existing || isStale(existing, payload.sequenceNumber)) return state;
      return {
        trucksById: {
          ...state.trucksById,
          [payload.truckId]: {
            ...existing,
            eta: payload.eta,
            progress: payload.progress,
            speedKmph: payload.speedKmph,
            serverTimestamp: payload.serverTimestamp,
            sequenceNumber: payload.sequenceNumber,
          },
        },
      };
    }),

  applyStatusChange: (payload) =>
    set((state) => {
      const existing = state.trucksById[payload.truckId];
      if (!existing || isStale(existing, payload.sequenceNumber)) return state;
      return {
        trucksById: {
          ...state.trucksById,
          [payload.truckId]: {
            ...existing,
            status: payload.status,
            activeDelay: payload.activeDelay,
            progress: payload.progress,
            speedKmph: payload.speedKmph,
            eta: payload.eta,
            serverTimestamp: payload.serverTimestamp,
            sequenceNumber: payload.sequenceNumber,
          },
        },
      };
    }),

  removeTruck: (truckId) =>
    set((state) => {
      const next = { ...state.trucksById };
      delete next[truckId];
      return { trucksById: next };
    }),

  clear: () => set({ trucksById: {} }),
}));
