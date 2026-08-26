import { create } from "zustand";

import type { Alert, AlertCreatedPayload } from "@/types";

const MAX_ALERTS = 200;

/**
 * Historical/paginated alert history from `GET /alerts` belongs in TanStack
 * Query. This store is the live-pushed feed only, seeded once from an initial
 * REST snapshot by the consuming feature.
 */
export interface RealtimeAlert extends Alert {
  receivedAt: number;
  isRead: boolean;
}

interface AlertState {
  alerts: RealtimeAlert[];
  unreadCount: number;
}

interface AlertActions {
  hydrateFromSnapshot: (alerts: Alert[]) => void;
  pushAlert: (payload: AlertCreatedPayload) => void;
  markRead: (alertId: string) => void;
  markAllRead: () => void;
  clear: () => void;
}

type AlertStore = AlertState & AlertActions;

function fromPayload(payload: AlertCreatedPayload): RealtimeAlert {
  return {
    id: payload.alertId,
    type: payload.type as Alert["type"],
    severity: payload.severity,
    title: payload.title,
    message: payload.message,
    truckId: payload.truckId,
    shipmentId: payload.shipmentId,
    dockDoorId: payload.dockDoorId,
    acknowledged: false,
    createdAt: payload.createdAt,
    receivedAt: Date.now(),
    isRead: false,
  };
}

export const useAlertStore = create<AlertStore>()((set) => ({
  alerts: [],
  unreadCount: 0,

  hydrateFromSnapshot: (alerts) =>
    set(() => {
      const hydrated = alerts.map((alert) => ({ ...alert, receivedAt: Date.now(), isRead: true }));
      return { alerts: hydrated.slice(0, MAX_ALERTS), unreadCount: 0 };
    }),

  pushAlert: (payload) =>
    set((state) => ({
      alerts: [fromPayload(payload), ...state.alerts].slice(0, MAX_ALERTS),
      unreadCount: state.unreadCount + 1,
    })),

  markRead: (alertId) =>
    set((state) => ({
      alerts: state.alerts.map((a) => (a.id === alertId ? { ...a, isRead: true } : a)),
      unreadCount: state.alerts.some((a) => a.id === alertId && !a.isRead)
        ? Math.max(0, state.unreadCount - 1)
        : state.unreadCount,
    })),

  markAllRead: () =>
    set((state) => ({
      alerts: state.alerts.map((a) => ({ ...a, isRead: true })),
      unreadCount: 0,
    })),

  clear: () => set({ alerts: [], unreadCount: 0 }),
}));
