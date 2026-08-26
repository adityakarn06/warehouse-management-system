"use client";

import { useQuery } from "@tanstack/react-query";

import { getYardOverview } from "@/lib/api/yard";
import { queryKeys } from "@/lib/api/query-keys";

/** The operations dashboard snapshot. Realtime deltas (trucks, docks, alerts)
 * arrive over Socket.IO — this is only ever fetched once per mount/refresh. */
export function useYardOverview() {
  return useQuery({
    queryKey: queryKeys.yard.overview,
    queryFn: () => getYardOverview(),
    staleTime: Infinity,
  });
}
