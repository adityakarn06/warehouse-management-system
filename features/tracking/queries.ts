"use client";

import { useQuery } from "@tanstack/react-query";

import { getTracking } from "@/lib/api/tracking";
import { queryKeys } from "@/lib/api/query-keys";

/** The customer-facing lookup. Disabled until a non-empty tracking number is typed. */
export function useTracking(trackingNumber: string | undefined) {
  const trimmed = trackingNumber?.trim();
  return useQuery({
    queryKey: queryKeys.tracking.detail(trimmed ?? ""),
    queryFn: () => getTracking(trimmed as string),
    enabled: Boolean(trimmed),
    staleTime: Infinity,
  });
}
