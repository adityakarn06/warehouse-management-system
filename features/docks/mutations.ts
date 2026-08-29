"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { assignDock, type AssignDockBody } from "@/lib/api/assignments";
import { releaseDock, updateDockStatus, type UpdateDockStatusBody } from "@/lib/api/docks";
import { queryKeys } from "@/lib/api/query-keys";
import { useAlertStore } from "@/stores/use-alert-store";
import { useDockStore } from "@/stores/use-dock-store";
import type { DockDetail } from "@/types";

import { resolveDockCode } from "./dock-code";

/**
 * These three commands deliberately do **not** invalidate `yard.overview`.
 *
 * Every one of them returns the authoritative rows the backend just wrote, and
 * the board already overlays the live Zustand layer on its REST snapshot
 * (`live?.status ?? dock.status`), so applying the response to the store *is*
 * the update path — a refetch would only re-fetch what we were just handed.
 * Whatever the command touched beyond the row it returned (the other doors in a
 * failure cascade, the trucks it moved, the alerts it raised) arrives as
 * `DOCK_STATUS_CHANGED` / `DOCK_REASSIGNED` / `ALERT_CREATED`, which the stores
 * already reduce idempotently. Same pattern as `useDelayTruck`.
 *
 * The three snapshot endpoints added alongside the schedule/queue/allocation
 * views are different: unlike the dock board, nothing overlays their rows with
 * live Zustand state — `DockScheduleBoard`, `DockingQueueBoard` and
 * `AllocationSummaryPanel` render exactly what the last fetch returned, so a
 * stale cache would leave the operator's own action invisible on those three
 * views until `useSnapshotInvalidation`'s 5s debounce catches up. Each command
 * below therefore also invalidates them directly, on top of that debounce.
 */
const SNAPSHOT_QUERY_KEYS = [
  queryKeys.yard.dockingQueue,
  queryKeys.yard.allocationSummary,
  queryKeys.docks.schedule(),
] as const;

function invalidateSnapshots(queryClient: ReturnType<typeof useQueryClient>): void {
  for (const key of SNAPSHOT_QUERY_KEYS) {
    queryClient.invalidateQueries({ queryKey: key });
  }
}

/** `applyStatusCommandResult` is safe to call with any status response: it is
 * guarded by the server's own `dock.updatedAt`, so a socket event that already
 * moved this door past the command is not regressed. */
function applyDockResult(dock: DockDetail): void {
  useDockStore.getState().applyStatusCommandResult(dock);
}

/** "Make unavailable" / "make available" — the backend owns every consequence,
 * including the failure cascade, so this only applies what it decided. */
export function useUpdateDockStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateDockStatusBody }) =>
      updateDockStatus(id, body),
    onSuccess: (result) => {
      applyDockResult(result.dock);
      queryClient.setQueryData(queryKeys.docks.detail(result.dock.id), result.dock);

      // The one alert this command raised is in the response; pushing it beats
      // invalidating the whole alert list for a row we already hold. The
      // per-reassignment alerts arrive over ALERT_CREATED.
      if (result.alert) useAlertStore.getState().pushAlert(result.alert);
      invalidateSnapshots(queryClient);
    },
  });
}

export function useReleaseDock() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => releaseDock(id),
    onSuccess: (result) => {
      // The release response carries the resulting status but not a full dock
      // row, so there is nothing to apply directly — the DOCK_STATUS_CHANGED it
      // emits (only when the status actually moved) is the store's update.
      // Refresh just this door's detail query, plus the three snapshot views
      // whose rows a release directly changes (a freed door, a completed
      // allocation).
      queryClient.invalidateQueries({ queryKey: queryKeys.docks.detail(result.dockDoorId) });
      // And every truck detail: `GET /trucks/:id` carries `dockAssignments[]`,
      // which a release just closed out. The response names only the door, not
      // the trucks it freed, so there is no single detail key to target.
      queryClient.invalidateQueries({ queryKey: queryKeys.trucks.all });
      invalidateSnapshots(queryClient);
    },
  });
}

/** Omitting `dockId` commits the backend's top-ranked recommendation. */
export function useAssignDock() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ truckId, body }: { truckId: string; body?: AssignDockBody }) =>
      assignDock(truckId, body),
    onSuccess: (result, variables) => {
      // The assignment response is a superset of the recommendations response
      // (`dockAssignmentResultSchema` extends it), so the panel can be handed
      // the backend's own post-commit ranking with no refetch at all.
      queryClient.setQueryData(
        queryKeys.trucks.dockRecommendations(variables.truckId),
        result,
      );

      useDockStore
        .getState()
        .applyAssignmentCommandResult(
          result.assignment,
          resolveDockCode(result, result.assignment.dockDoorId),
          result.previousAssignment?.dockDoorId ?? null,
        );

      // The truck detail is the fourth view nothing overlays. `GET /trucks/:id`
      // returns `dockAssignments[]` newest-first, and a commit just wrote a row
      // into it (and cancelled the one it superseded) — unlike the dock board,
      // no live Zustand layer sits over that array, so `/truck-ops`'s activity
      // timeline would keep rendering the pre-commit history until something
      // else happened to evict the cache.
      queryClient.invalidateQueries({ queryKey: queryKeys.trucks.detail(variables.truckId) });
      invalidateSnapshots(queryClient);
    },
  });
}
