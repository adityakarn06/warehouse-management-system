"use client";

import { useQuery } from "@tanstack/react-query";

import { getAllocationSummary, getDockingQueue, getYardOverview } from "@/lib/api/yard";
import { queryKeys } from "@/lib/api/query-keys";

/** The operations dashboard snapshot. Realtime deltas (trucks, docks, alerts)
 * arrive over Socket.IO — this is only ever fetched once per mount/refresh. */
export function useYardOverview() {
  return useQuery({
    queryKey: queryKeys.yard.overview,
    queryFn: () => getYardOverview(),
    staleTime: Infinity,
  });
}

/** Which trailer needs a door for each arrival window (problem statement §4).
 * Backend-grouped and backend-sorted; kept fresh by
 * `use-snapshot-invalidation.ts`. */
export function useDockingQueue() {
  return useQuery({
    queryKey: queryKeys.yard.dockingQueue,
    queryFn: () => getDockingQueue(),
    staleTime: Infinity,
  });
}

/** The trailer-to-door allocation summary (problem statement §7 output). */
export function useAllocationSummary() {
  return useQuery({
    queryKey: queryKeys.yard.allocationSummary,
    queryFn: () => getAllocationSummary(),
    staleTime: Infinity,
  });
}
