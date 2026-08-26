"use client";

import { useQuery } from "@tanstack/react-query";

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
