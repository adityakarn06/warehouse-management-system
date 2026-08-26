"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import {
  clearTruckDelay,
  delayTruck,
  resetSimulation,
  startSimulation,
  stopSimulation,
} from "@/lib/api/simulation";
import { queryKeys } from "@/lib/api/query-keys";
import type { DelayScenario } from "@/schemas/common.schema";

function useLifecycleMutation(fn: () => ReturnType<typeof startSimulation>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.simulation.state });
    },
  });
}

/** Idempotent on the backend — a second call is ignored, never a second loop. */
export function useStartSimulation() {
  return useLifecycleMutation(startSimulation);
}

/** Stops the loop and flushes unpersisted movement. */
export function useStopSimulation() {
  return useLifecycleMutation(stopSimulation);
}

/** Reloads the world from the database, keeping the loop's running/stopped state. */
export function useResetSimulation() {
  return useLifecycleMutation(resetSimulation);
}

/** The Rain / Traffic / Road Closure buttons — the backend owns speed, ETA,
 * status, the alert and the realtime events (docs/api.md §Delay scenarios). */
export function useDelayTruck() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ truckId, type }: { truckId: string; type: DelayScenario }) =>
      delayTruck(truckId, type),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.simulation.truck(variables.truckId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.simulation.state });
      queryClient.invalidateQueries({ queryKey: queryKeys.trucks.detail(variables.truckId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.alerts.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.yard.overview });
    },
  });
}

/** The Clear button — returns to normal speed. Raises no alert (`alert: null`). */
export function useClearTruckDelay() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (truckId: string) => clearTruckDelay(truckId),
    onSuccess: (_data, truckId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.simulation.truck(truckId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.simulation.state });
      queryClient.invalidateQueries({ queryKey: queryKeys.trucks.detail(truckId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.yard.overview });
    },
  });
}
