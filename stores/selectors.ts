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

// ---- Alert store ----------------------------------------------------------

export const useAlerts = () => useAlertStore((s) => s.alerts);
export const useUnreadAlertCount = () => useAlertStore((s) => s.unreadCount);

/** The newest alert naming this truck. The feed is already newest-first and
 * `.find` hands back an existing reference, so this needs no `useShallow`. */
export const useLatestAlertForTruck = (truckId: string | null) =>
  useAlertStore((s) => (truckId ? s.alerts.find((alert) => alert.truckId === truckId) : undefined));
