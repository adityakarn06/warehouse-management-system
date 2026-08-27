import { create } from "zustand";

import type { Alert, AlertCreatedPayload } from "@/types";

import {
  hydrateAlerts,
  markAllAlertsRead,
  markAlertRead,
  prependAlert,
  type AlertState,
  type RealtimeAlert,
} from "./alert-helpers";

export type { RealtimeAlert };

interface AlertActions {
  seedFromSnapshot: (alerts: Alert[]) => void;
  pushAlert: (payload: AlertCreatedPayload) => void;
  markRead: (alertId: string) => void;
  markAllRead: () => void;
  clear: () => void;
}

/**
 * `hasSeeded` lives in the store, not in the seeding component: the store is
 * a module singleton that outlives any mount, so a per-mount latch would let
 * a remount replay the REST snapshot over live-pushed alerts, resetting
 * `isRead`/`unreadCount` on alerts the socket already delivered.
 */
type AlertStore = AlertState & { hasSeeded: boolean } & AlertActions;

export const useAlertStore = create<AlertStore>()((set) => ({
  alerts: [],
  unreadCount: 0,
  hasSeeded: false,

  seedFromSnapshot: (alerts) =>
    set((state) =>
      state.hasSeeded ? state : { ...hydrateAlerts(alerts, Date.now()), hasSeeded: true },
    ),

  pushAlert: (payload) => set((state) => prependAlert(state, payload, Date.now())),

  markRead: (alertId) => set((state) => markAlertRead(state, alertId)),

  markAllRead: () => set((state) => markAllAlertsRead(state)),

  clear: () => set({ alerts: [], unreadCount: 0, hasSeeded: false }),
}));
