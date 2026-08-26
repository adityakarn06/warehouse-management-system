"use client";

import { useQuery } from "@tanstack/react-query";

import { getDock, getDocks, type DockListFilters } from "@/lib/api/docks";
import { getDockAssignments, type DockAssignmentListFilters } from "@/lib/api/assignments";
import { queryKeys } from "@/lib/api/query-keys";

export function useDocks(filters: DockListFilters = {}) {
  return useQuery({
    queryKey: queryKeys.docks.list(filters),
    queryFn: () => getDocks(filters),
    staleTime: Infinity,
  });
}

export function useDock(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.docks.detail(id ?? ""),
    queryFn: () => getDock(id as string),
    enabled: Boolean(id),
    staleTime: Infinity,
  });
}

export function useDockAssignments(filters: DockAssignmentListFilters = {}) {
  return useQuery({
    queryKey: queryKeys.dockAssignments.list(filters),
    queryFn: () => getDockAssignments(filters),
    staleTime: Infinity,
  });
}
