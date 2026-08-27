"use client";

import { useQueries, useQuery } from "@tanstack/react-query";

import { getRoute } from "@/lib/api/routes";
import { queryKeys } from "@/lib/api/query-keys";

/** Includes `geometry` for the map polyline — static per route, so cached indefinitely. */
export function useRoute(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.routes.detail(id ?? ""),
    queryFn: () => getRoute(id as string),
    enabled: Boolean(id),
    staleTime: Infinity,
  });
}

/**
 * Several routes at once, sharing the exact cache entries `useRoute` uses —
 * so a route already fetched for its polyline is never fetched again for the
 * map's initial bounds, and vice versa. One request per *unique* id.
 */
export function useRoutes(ids: string[]) {
  return useQueries({
    queries: ids.map((id) => ({
      queryKey: queryKeys.routes.detail(id),
      queryFn: () => getRoute(id),
      staleTime: Infinity,
    })),
  });
}
