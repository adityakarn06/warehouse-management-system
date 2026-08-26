"use client";

import { useQuery } from "@tanstack/react-query";

import { getDockRecommendations, getTruck, getTrucks, type TruckListFilters } from "@/lib/api/trucks";
import { queryKeys } from "@/lib/api/query-keys";

/** Realtime-covered by the `operations` room — REST is the initial snapshot only. */
export function useTrucks(filters: TruckListFilters = {}) {
  return useQuery({
    queryKey: queryKeys.trucks.list(filters),
    queryFn: () => getTrucks(filters),
    staleTime: Infinity,
  });
}

export function useTruck(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.trucks.detail(id ?? ""),
    queryFn: () => getTruck(id as string),
    enabled: Boolean(id),
    staleTime: Infinity,
  });
}

/** Side-effect free on the backend — safe to refetch on demand (e.g. a "refresh" button). */
export function useDockRecommendations(truckId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.trucks.dockRecommendations(truckId ?? ""),
    queryFn: () => getDockRecommendations(truckId as string),
    enabled: Boolean(truckId),
  });
}
