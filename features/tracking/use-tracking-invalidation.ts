"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/lib/api/query-keys";
import { useDockStore, useTruckStore } from "@/stores";

/**
 * The one place `/tracking/:trackingNumber` is refetched off the back of a
 * realtime event, scoped to the single truck this page is watching.
 *
 * It exists because two things on the tracking view are *only* knowable from
 * the backend. The shipment lifecycle ends `DELIVERED`, but `TruckStatus` ends
 * `COMPLETED` — mapping one onto the other is a business decision the frontend
 * does not get to make (AGENTS.md), so a terminal transition refetches and
 * lets the backend say what the shipment status now is. Likewise `assignedDock`
 * carries the door's name, zone and scheduled window, none of which are on the
 * `DOCK_ASSIGNED` payload.
 *
 * Position, ETA, progress and delay are pure field overlays and never trigger
 * this. Debounced, and subscribed imperatively rather than through selectors,
 * so no realtime tick re-renders the page just to reach this check.
 */
const REFETCH_ON_STATUS = new Set(["ARRIVED", "DOCKED", "COMPLETED"]);
const DEBOUNCE_MS = 2_000;

export function useTrackingInvalidation(
  trackingNumber: string,
  truckId: string | null | undefined,
): void {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!truckId) return;

    let timer: ReturnType<typeof setTimeout> | null = null;

    const scheduleInvalidate = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        timer = null;
        queryClient.invalidateQueries({ queryKey: queryKeys.tracking.detail(trackingNumber) });
      }, DEBOUNCE_MS);
    };

    // A truck seen for the first time is not a *transition* — the subscribe
    // ack lands after this mounts, and treating "no previous entry" as a
    // change would refetch immediately for a shipment that is already docked.
    let previousStatus = useTruckStore.getState().trucksById[truckId]?.status ?? null;
    const unsubTrucks = useTruckStore.subscribe((state) => {
      const status = state.trucksById[truckId]?.status ?? null;
      if (status === previousStatus) return;
      const changedFrom = previousStatus;
      previousStatus = status;
      if (changedFrom !== null && status !== null && REFETCH_ON_STATUS.has(status)) {
        scheduleInvalidate();
      }
    });

    let previousAssignmentId =
      useDockStore.getState().assignmentsByTruckId[truckId]?.assignmentId ?? null;
    const unsubDocks = useDockStore.subscribe((state) => {
      const assignmentId = state.assignmentsByTruckId[truckId]?.assignmentId ?? null;
      if (assignmentId === previousAssignmentId) return;
      previousAssignmentId = assignmentId;
      // Unlike a status change, a first assignment *is* worth refetching: the
      // REST row is what carries the door's name, zone and scheduled window.
      scheduleInvalidate();
    });

    return () => {
      if (timer) clearTimeout(timer);
      unsubTrucks();
      unsubDocks();
    };
  }, [queryClient, trackingNumber, truckId]);
}
