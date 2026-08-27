"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/lib/api/query-keys";
import { useDockStore, useTruckStore } from "@/stores";
import type { TrucksById } from "@/stores";
import type { AssignmentsByTruckId } from "@/stores";

const MEMBERSHIP_INVALIDATING_STATUSES = new Set(["ARRIVED", "DOCKED", "COMPLETED"]);
const DEBOUNCE_MS = 5_000;

/**
 * The one place the dashboard refetches `/yard/overview` off the back of a
 * realtime event — and only for events after which a *backend-computed list*
 * (upcomingArrivals membership/order, docks[].currentAssignment,
 * activeAssignments) is definitionally stale: a truck entering a terminal
 * status, or a dock assignment/reassignment. Everything else (position, ETA,
 * progress, delay, dock status) is a pure field overlay and never triggers
 * this. Debounced so a burst of qualifying events (e.g. several trucks
 * arriving back-to-back) collapses into one refetch.
 */
export function useSnapshotInvalidation(): void {
  const queryClient = useQueryClient();

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;

    const scheduleInvalidate = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        timer = null;
        queryClient.invalidateQueries({ queryKey: queryKeys.yard.overview });
      }, DEBOUNCE_MS);
    };

    // A truck seen for the first time is not a *transition*: at mount the
    // store is still empty (the `subscribe:operations` ack hasn't landed), so
    // treating "no previous entry" as a change would fire a redundant refetch
    // for every truck the first snapshot already reports as terminal.
    let previousTrucks: TrucksById = useTruckStore.getState().trucksById;
    const unsubTrucks = useTruckStore.subscribe((state) => {
      const nextTrucks = state.trucksById;
      for (const truckId in nextTrucks) {
        const prev = previousTrucks[truckId];
        if (!prev) continue;
        const next = nextTrucks[truckId];
        if (
          MEMBERSHIP_INVALIDATING_STATUSES.has(next.status) &&
          prev.status !== next.status
        ) {
          scheduleInvalidate();
          break;
        }
      }
      previousTrucks = nextTrucks;
    });

    let previousAssignments: AssignmentsByTruckId = useDockStore.getState().assignmentsByTruckId;
    const unsubDocks = useDockStore.subscribe((state) => {
      const nextAssignments = state.assignmentsByTruckId;
      for (const truckId in nextAssignments) {
        const prev = previousAssignments[truckId];
        const next = nextAssignments[truckId];
        if (prev?.assignmentId !== next.assignmentId) {
          scheduleInvalidate();
          break;
        }
      }
      previousAssignments = nextAssignments;
    });

    return () => {
      if (timer) clearTimeout(timer);
      unsubTrucks();
      unsubDocks();
    };
  }, [queryClient]);
}
