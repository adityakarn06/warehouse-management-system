"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { getFleet, type FleetFilters } from "@/lib/api/fleet";
import { queryKeys } from "@/lib/api/query-keys";

/**
 * Unlike every other list hook in `features/*`, this one is NOT covered by a
 * Socket.IO room — `docs/fleet.md` proposes it as a plain polled projection,
 * not a realtime-backed snapshot. So `staleTime: Infinity` (the house
 * convention for socket-covered reads) would go stale silently; this refetches
 * on an interval and on refocus instead, keeping the last page on screen
 * while a refetch is in flight.
 */
export function useFleet(filters: FleetFilters = {}) {
  return useQuery({
    queryKey: queryKeys.fleet.list(filters),
    queryFn: () => getFleet(filters),
    staleTime: 30_000,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
    placeholderData: keepPreviousData,
  });
}
