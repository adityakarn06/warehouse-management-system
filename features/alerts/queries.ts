"use client";

import { useQuery } from "@tanstack/react-query";

import { getAlerts, type AlertListFilters } from "@/lib/api/alerts";
import { queryKeys } from "@/lib/api/query-keys";

/** REST is the initial snapshot only — subsequent alerts arrive via `ALERT_CREATED`.
 * Never poll this (docs/api.md "Do not poll — alerts especially"). */
export function useAlerts(filters: AlertListFilters = {}) {
  return useQuery({
    queryKey: queryKeys.alerts.list(filters),
    queryFn: () => getAlerts(filters),
    staleTime: Infinity,
  });
}
