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
  /** Where this row entered the feed. `isRead` cannot stand in for this — the
   * operator can mark anything read — and surfaces that mean "this just
   * happened" (the reassignment panel) must not replay seeded history as if it
   * were the current cascade. */
  source: "live" | "snapshot";
}

export interface AlertState {
  alerts: RealtimeAlert[];
  unreadCount: number;
}

export function alertFromPayload(payload: AlertCreatedPayload, now: number): RealtimeAlert {
  return {
    id: payload.alertId,
    type: payload.type,
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
    source: "live",
  };
}

/**
 * Seeds the feed from the initial REST snapshot, *underneath* anything the
 * socket already pushed.
 *
 * `RealtimeProvider` connects while `GET /yard/overview` is still in flight,
 * so an `ALERT_CREATED` can land before the snapshot does. Replacing the array
 * outright would drop that alert or bring it back marked read, and would reset
 * `unreadCount` to 0 — the badge would silently miss an alert the user was
 * never shown. Live entries therefore win on id, snapshot rows fill in the
 * rest, and the count is recomputed from what actually survives the cap.
 */
export function seedAlerts(state: AlertState, alerts: Alert[], now: number): AlertState {
  const live = new Set(state.alerts.map((alert) => alert.id));

  const seeded: RealtimeAlert[] = alerts
    .filter((alert) => !live.has(alert.id))
    .map((alert) => ({ ...alert, receivedAt: now, isRead: true, source: "snapshot" as const }));

  const merged = [...state.alerts, ...seeded]
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
    .slice(0, MAX_ALERTS);

  return { alerts: merged, unreadCount: merged.filter((alert) => !alert.isRead).length };
}

/**
 * Both the socket's `ALERT_CREATED` and a delay command's response `alert` land
 * here, and a single activation produces both — so the feed dedupes on the
 * server's `alertId` (normalised to `id`) and keeps whichever arrived first.
 * The same guard absorbs a same-scenario double-press, which the backend
 * answers with the *existing* alert rather than a second one (docs/api.md).
 */
export function prependAlert(state: AlertState, payload: AlertCreatedPayload, now: number): AlertState {
  if (state.alerts.some((alert) => alert.id === payload.alertId)) return state;

  const alerts = [alertFromPayload(payload, now), ...state.alerts].slice(0, MAX_ALERTS);

  // Recomputed from what survives the cap rather than incremented, exactly as
  // `seedAlerts` does. Incrementing drifts once the feed is full and the row
  // pushed off the tail was itself unread — the bell would then show a count
  // with no unread alert behind it, and its severity lookup would find none.
  return { alerts, unreadCount: alerts.filter((alert) => !alert.isRead).length };
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
