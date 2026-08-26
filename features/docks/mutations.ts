"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { assignDock, type AssignDockBody } from "@/lib/api/assignments";
import { releaseDock, updateDockStatus, type UpdateDockStatusBody } from "@/lib/api/docks";
import { queryKeys } from "@/lib/api/query-keys";

/** "Make unavailable" / "make available" — the backend owns every consequence,
 * including the failure cascade, so this only invalidates and returns what it decided. */
export function useUpdateDockStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateDockStatusBody }) => updateDockStatus(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.docks.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dockAssignments.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.alerts.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.trucks.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.yard.overview });
    },
  });
}

export function useReleaseDock() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => releaseDock(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.docks.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dockAssignments.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.yard.overview });
    },
  });
}

/** Omitting `dockId` commits the backend's top-ranked recommendation. */
export function useAssignDock() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ truckId, body }: { truckId: string; body?: AssignDockBody }) =>
      assignDock(truckId, body),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.trucks.detail(variables.truckId) });
      queryClient.invalidateQueries({
        queryKey: queryKeys.trucks.dockRecommendations(variables.truckId),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.docks.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dockAssignments.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.yard.overview });
    },
  });
}
