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
  hydrateFromSnapshot: (alerts: Alert[]) => void;
  pushAlert: (payload: AlertCreatedPayload) => void;
  markRead: (alertId: string) => void;
  markAllRead: () => void;
  clear: () => void;
}

type AlertStore = AlertState & AlertActions;

export const useAlertStore = create<AlertStore>()((set) => ({
  alerts: [],
  unreadCount: 0,

  hydrateFromSnapshot: (alerts) => set(() => hydrateAlerts(alerts, Date.now())),

  pushAlert: (payload) => set((state) => prependAlert(state, payload, Date.now())),

  markRead: (alertId) => set((state) => markAlertRead(state, alertId)),

  markAllRead: () => set((state) => markAllAlertsRead(state)),

  clear: () => set({ alerts: [], unreadCount: 0 }),
}));
