"use client";

import { useQuery } from "@tanstack/react-query";

import { getDock, getDocks, getDockSchedule, type DockListFilters, type DockScheduleFilters } from "@/lib/api/docks";
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

/** The dock-door assignment schedule. Kept fresh by
 * `features/yard/use-snapshot-invalidation.ts`, so `staleTime: Infinity` like
 * every other backend-recomputed snapshot in this file. */
export function useDockSchedule(filters: DockScheduleFilters = {}) {
  return useQuery({
    queryKey: queryKeys.docks.schedule(filters),
    queryFn: () => getDockSchedule(filters),
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
