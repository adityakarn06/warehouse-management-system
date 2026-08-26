import type { Alert, AlertCreatedPayload } from "@/types";

export const MAX_ALERTS = 200;

/**
 * Historical/paginated alert history from `GET /alerts` belongs in TanStack
 * Query. This store is the live-pushed feed only, seeded once from an initial
 * REST snapshot by the consuming feature.
 */
export interface RealtimeAlert extends Alert {
  receivedAt: number;
  isRead: boolean;
}

export interface AlertState {
  alerts: RealtimeAlert[];
  unreadCount: number;
}

export function alertFromPayload(payload: AlertCreatedPayload, now: number): RealtimeAlert {
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
    receivedAt: now,
    isRead: false,
  };
}

export function hydrateAlerts(alerts: Alert[], now: number): AlertState {
  const hydrated = alerts.map((alert) => ({ ...alert, receivedAt: now, isRead: true }));
  return { alerts: hydrated.slice(0, MAX_ALERTS), unreadCount: 0 };
}

export function prependAlert(state: AlertState, payload: AlertCreatedPayload, now: number): AlertState {
  return {
    alerts: [alertFromPayload(payload, now), ...state.alerts].slice(0, MAX_ALERTS),
    unreadCount: state.unreadCount + 1,
  };
}

export function markAlertRead(state: AlertState, alertId: string): AlertState {
  const target = state.alerts.find((alert) => alert.id === alertId);
  if (!target || target.isRead) return state;

  return {
    alerts: state.alerts.map((alert) => (alert.id === alertId ? { ...alert, isRead: true } : alert)),
    unreadCount: Math.max(0, state.unreadCount - 1),
  };
}

export function markAllAlertsRead(state: AlertState): AlertState {
  if (state.unreadCount === 0) return state;
  return {
    alerts: state.alerts.map((alert) => (alert.isRead ? alert : { ...alert, isRead: true })),
    unreadCount: 0,
  };
}
