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
import type { DelayResult } from "@/schemas/simulation.schema";
import { useAlertStore } from "@/stores/use-alert-store";
import { useTruckStore } from "@/stores/use-truck-store";

/**
 * Both delay endpoints return the authoritative resulting truck plus the alert
 * they raised, so the command result is applied straight into the live stores
 * and no query is invalidated — re-reading would be the exact round-trip the
 * contract says is unnecessary (docs/api.md §Delay scenarios). The truck store
 * still enforces the per-truck sequence high-water mark, so a response that
 * lost the race against a newer tick is dropped rather than rewinding state.
 *
 * The alert is deduped on `alertId` against the `ALERT_CREATED` the same
 * activation pushes over the socket, so only one entry reaches the feed.
 */
function applyDelayCommand(result: DelayResult): void {
  useTruckStore.getState().applyCommandResult(result.truck);
  if (result.alert) useAlertStore.getState().pushAlert(result.alert);
}

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
  return useMutation({
    mutationFn: ({ truckId, type }: { truckId: string; type: DelayScenario }) =>
      delayTruck(truckId, type),
    onSuccess: applyDelayCommand,
  });
}

/** The Clear button — returns to normal speed. Raises no alert (`alert: null`). */
export function useClearTruckDelay() {
  return useMutation({
    mutationFn: (truckId: string) => clearTruckDelay(truckId),
    onSuccess: applyDelayCommand,
  });
}
