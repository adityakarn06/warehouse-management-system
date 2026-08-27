"use client";

import { useQuery } from "@tanstack/react-query";

import { getSimulationState, getSimulationStatus, getSimulationTruck } from "@/lib/api/simulation";
import { queryKeys } from "@/lib/api/query-keys";

const STATUS_POLL_MS = 5_000;

/**
 * The simulation loop's own health, for the demo operator's control popover.
 *
 * This is the one query in the app that polls. `docs/api.md` §Simulation calls
 * out `/simulation/status` as the read-only, pollable counterpart to the three
 * lifecycle commands, and there is no socket event for loop health — a loop that
 * has silently wedged emits nothing at all, which is exactly the state the
 * operator needs to see. `enabled` is wired to the popover's open state, so a
 * closed popover costs nothing.
 */
export function useSimulationStatus(enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.simulation.status,
    queryFn: () => getSimulationStatus(),
    enabled,
    refetchInterval: enabled ? STATUS_POLL_MS : false,
    staleTime: 0,
  });
}

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
