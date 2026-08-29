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
import { resubscribeAll } from "@/lib/socket";
import type { DelayScenario } from "@/schemas/common.schema";
import type { DelayResult, SimulationLifecycle } from "@/schemas/simulation.schema";
import { useAlertStore } from "@/stores/use-alert-store";
import { useDockStore } from "@/stores/use-dock-store";
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

/**
 * Every lifecycle command answers with the authoritative post-command loop
 * state — the exact shape `GET /simulation/status` returns (docs/api.md
 * §Simulation) — so it is written straight into the status cache rather than
 * invalidated: re-reading it would be the round-trip the contract already
 * answered. `/simulation/state` (the per-truck list) *is* invalidated, since the
 * command may have changed which trucks the loop is advancing.
 */
function useLifecycleMutation(fn: () => Promise<SimulationLifecycle>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: (lifecycle) => {
      queryClient.setQueryData(queryKeys.simulation.status, lifecycle);
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

/**
 * Rewinds the whole demo world to its seeded state, keeping the loop's
 * running/stopped state.
 *
 * Reset re-seeds — trucks, docks, assignments and alerts all go back to t0 — so
 * *everything* the client holds about the world describes a world that no
 * longer exists. Recovery is
 * deliberately a full re-hydration from the server rather than a patch:
 *
 * 1. The live stores are emptied — including entities the rewind may have
 *    removed entirely, which no incoming snapshot would ever overwrite.
 *    `useAlertStore.clear()` also drops its `hasSeeded` latch, which is what
 *    lets `features/alerts/use-alert-feed.ts` seed a second time.
 * 2. `resetQueries()` (not `invalidateQueries`) drops every cached REST
 *    snapshot: the seeding effects in `use-dashboard-snapshot.ts` and
 *    `use-alert-feed.ts` are keyed on data identity / `generatedAt`, and
 *    TanStack's structural sharing would hand a refetch back under the old
 *    reference if the bytes happened to match, leaving those effects unrun.
 *    The status entry is rewritten afterwards, since it is cleared too.
 * 3. `resubscribeAll()` re-emits every joined room; each fresh `subscribe:*`
 *    ack runs `hydrateFromSnapshot` / `applySnapshot`, which is simultaneously
 *    the re-subscribe, the interpolation re-baseline (`previous*` cleared,
 *    `target*` pinned to current) and the Zustand write from the new snapshot.
 *    `sequenceNumber` survives a reset (docs/realtime.md), so nothing in the
 *    fresh snapshot is dropped as stale. If the socket is down, the stores stay
 *    empty until the reconnect handler re-subscribes on its own — the same path,
 *    not a special case.
 */
export function useResetSimulation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: resetSimulation,
    onSuccess: (lifecycle) => {
      useTruckStore.getState().clear();
      useDockStore.getState().clear();
      useAlertStore.getState().clear();

      queryClient.resetQueries();
      queryClient.setQueryData(queryKeys.simulation.status, lifecycle);

      resubscribeAll();
    },
  });
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
