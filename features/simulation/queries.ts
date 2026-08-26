"use client";

import { useQuery } from "@tanstack/react-query";

import { getSimulationState, getSimulationTruck } from "@/lib/api/simulation";
import { queryKeys } from "@/lib/api/query-keys";

/** Live state for every simulated truck. Used only to seed the initial snapshot —
 * subsequent movement arrives as TRUCK_POSITION_UPDATED over Socket.IO. */
export function useSimulationState() {
  return useQuery({
    queryKey: queryKeys.simulation.state,
    queryFn: () => getSimulationState(),
    staleTime: Infinity,
  });
}

export function useSimulationTruck(truckId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.simulation.truck(truckId ?? ""),
    queryFn: () => getSimulationTruck(truckId as string),
    enabled: Boolean(truckId),
    staleTime: Infinity,
  });
}
