import { useShallow } from "zustand/react/shallow";

import { useAlertStore } from "./use-alert-store";
import { useDockStore } from "./use-dock-store";
import { useRealtimeStore } from "./use-realtime-store";
import { useTruckStore } from "./use-truck-store";
import { useUIStore, type DashboardPanel } from "./use-ui-store";

/**
 * Narrow, single-purpose selectors so a component re-renders only for the
 * slice it actually reads — a map marker for one truck should not re-render
 * on every other truck's position tick, and a panel toggle should not
 * re-render the whole dashboard shell.
 *
 * Rule of thumb: a selector that returns a primitive or an existing object
 * reference is safe to use bare. One that builds a *new* array/object each
 * call (`Object.values(...)`, `.filter(...)`, a combined object literal) must
 * go through `useShallow`, or it re-renders on every store update regardless
 * of whether the derived value actually changed.
 */

// ---- UI store ----------------------------------------------------------

export const useSelectedTruckId = () => useUIStore((s) => s.selectedTruckId);
export const useSelectedShipmentId = () => useUIStore((s) => s.selectedShipmentId);
export const useSelectedDockId = () => useUIStore((s) => s.selectedDockId);
export const useActiveDashboardPanel = () => useUIStore((s) => s.activeDashboardPanel);
export const useIsPanelOpen = (panel: DashboardPanel) => useUIStore((s) => s.openPanels[panel]);
export const useMapViewState = () => useUIStore((s) => s.mapViewState);
export const useFollowSelectedTruck = () => useUIStore((s) => s.followSelectedTruck);

// ---- Realtime store -----------------------------------------------------

export const useConnectionStatus = () => useRealtimeStore((s) => s.connectionStatus);
export const useSocketId = () => useRealtimeStore((s) => s.socketId);
export const useLastEventAt = () => useRealtimeStore((s) => s.lastEventAt);
export const useSubscribedRooms = () => useRealtimeStore(useShallow((s) => s.subscribedRooms));

/**
 * What the `subscribe:shipment` ack resolved a tracking number / reference /
 * id into — `undefined` until the ack lands. Keyed by the argument that was
 * subscribed with. Returns the stored object reference, so no `useShallow`.
 */
export const useShipmentResolution = (requestedArg: string | null | undefined) =>
  useRealtimeStore((s) => (requestedArg ? s.shipmentResolutions[requestedArg] : undefined));

// ---- Truck store ----------------------------------------------------------

/** One truck's live entry — re-renders only when *this* truck's tick lands. */
export const useTruck = (truckId: string | null) =>
  useTruckStore((s) => (truckId ? s.trucksById[truckId] : undefined));

/** Roster only — re-renders on trucks added/removed, not on position ticks. */
export const useTruckIds = () => useTruckStore(useShallow((s) => Object.keys(s.trucksById)));

/** Full list — re-renders on every truck update; prefer `useTruckIds` +
 * `useTruck` per row where a list renders many items. */
export const useTruckList = () => useTruckStore(useShallow((s) => Object.values(s.trucksById)));

// ---- Dock store -----------------------------------------------------------

export const useDock = (dockId: string | null) =>
  useDockStore((s) => (dockId ? s.docksById[dockId] : undefined));

export const useDockIds = () => useDockStore(useShallow((s) => Object.keys(s.docksById)));

export const useDockList = () => useDockStore(useShallow((s) => Object.values(s.docksById)));

export const useAssignmentForTruck = (truckId: string | null) =>
  useDockStore((s) => (truckId ? s.assignmentsByTruckId[truckId] : undefined));

/**
 * Every truck the backend *moved* — the entries `DOCK_REASSIGNED` wrote, which
 * are exactly the ones carrying a `previousDockCode`. Newest first.
 *
 * Driven by the store rather than a command response, so every connected
 * operator sees the cascade, not only whoever pressed the button. `useShallow`
 * is required: this builds a new array on every call.
 */
export const useReassignments = () =>
  useDockStore(
    useShallow((s) =>
      Object.values(s.assignmentsByTruckId)
        .filter((assignment) => assignment.previousDockCode !== undefined)
        .sort((a, b) => b.serverTimestamp.localeCompare(a.serverTimestamp)),
    ),
  );

// ---- Alert store ----------------------------------------------------------

export const useAlerts = () => useAlertStore((s) => s.alerts);
export const useUnreadAlertCount = () => useAlertStore((s) => s.unreadCount);

/**
 * Trucks *this session's* cascade left with nowhere to go. There is no
 * `DOCK_REASSIGNED` and no store entry for these — a CRITICAL
 * `NO_DOCK_AVAILABLE` alert is the only record (docs/realtime.md), and no dock
 * is invented to stand in.
 *
 * Restricted to live-pushed rows on purpose. The feed is seeded from
 * `GET /alerts?limit=100`, which is newest-first with no time bound, so
 * without this a board would render every stranding of the past several days
 * as a red "needs a human now" row. That history belongs on `/alerts`; this
 * selector answers "what just happened", which is a different question.
 */
export const useNoDockAvailableAlerts = () =>
  useAlertStore(
    useShallow((s) =>
      s.alerts.filter(
        (alert) => alert.type === "NO_DOCK_AVAILABLE" && alert.source === "live",
      ),
    ),
  );

/** Highest severity among unread alerts, for the header bell's tone. */
export const useHighestUnreadSeverity = () =>
  useAlertStore((s) => {
    let highest: "INFO" | "WARNING" | "CRITICAL" | null = null;
    for (const alert of s.alerts) {
      if (alert.isRead) continue;
      if (alert.severity === "CRITICAL") return "CRITICAL";
      if (alert.severity === "WARNING") highest = "WARNING";
      else if (highest === null) highest = "INFO";
    }
    return highest;
  });

/** The newest alert naming this truck. The feed is already newest-first and
 * `.find` hands back an existing reference, so this needs no `useShallow`. */
export const useLatestAlertForTruck = (truckId: string | null) =>
  useAlertStore((s) => (truckId ? s.alerts.find((alert) => alert.truckId === truckId) : undefined));

/**
 * Every alert naming this door, in feed order (newest-first). Unlike
 * `useNoDockAvailableAlerts` this is *not* restricted to live-pushed rows: a
 * door's own history is exactly what an operator opening its detail is asking
 * for, and it is bounded by the one door rather than the whole yard.
 */
export const useAlertsForDock = (dockId: string | null) =>
  useAlertStore(
    useShallow((s) =>
      dockId ? s.alerts.filter((alert) => alert.dockDoorId === dockId) : [],
    ),
  );

/**
 * Every alert naming this truck, in feed order (newest-first). Same reasoning
 * as `useAlertsForDock`: a single truck's own history is exactly what an
 * operator opening its operations page is asking for, so snapshot rows are
 * included rather than restricted to live pushes, and the whole thing is
 * bounded by the one truck.
 */
export const useAlertsForTruck = (truckId: string | null) =>
  useAlertStore(
    useShallow((s) =>
      truckId ? s.alerts.filter((alert) => alert.truckId === truckId) : [],
    ),
  );
