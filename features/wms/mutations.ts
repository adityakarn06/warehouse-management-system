"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { runWmsSimulation, sendWmsEvent } from "@/lib/api/wms";
import { queryKeys } from "@/lib/api/query-keys";
import type { WmsEvent, WmsScenario } from "@/schemas/wms.schema";

/** WMS ingestion reuses the same seven realtime events every other phase writes
 * through (docs/api.md "No new realtime events") — invalidate broadly since a
 * single event can move a truck, a dock and a shipment together. */
function invalidateWmsAffected(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: queryKeys.trucks.all });
  queryClient.invalidateQueries({ queryKey: queryKeys.shipments.all });
  queryClient.invalidateQueries({ queryKey: queryKeys.docks.all });
  queryClient.invalidateQueries({ queryKey: queryKeys.dockAssignments.all });
  queryClient.invalidateQueries({ queryKey: queryKeys.alerts.all });
  queryClient.invalidateQueries({ queryKey: queryKeys.yard.overview });
  queryClient.invalidateQueries({ queryKey: queryKeys.yard.dockingQueue });
  queryClient.invalidateQueries({ queryKey: queryKeys.yard.allocationSummary });
  queryClient.invalidateQueries({ queryKey: queryKeys.docks.schedule() });
  queryClient.invalidateQueries({ queryKey: queryKeys.simulation.state });
}

export function useSendWmsEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (event: WmsEvent) => sendWmsEvent(event),
    onSuccess: () => invalidateWmsAffected(queryClient),
  });
}

export function useRunWmsSimulation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (scenario?: WmsScenario) => runWmsSimulation(scenario),
    onSuccess: () => invalidateWmsAffected(queryClient),
  });
}
