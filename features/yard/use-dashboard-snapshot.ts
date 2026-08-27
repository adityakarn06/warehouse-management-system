"use client";

import { useEffect } from "react";

import { useOperationsSubscription } from "@/hooks/use-realtime";
import { useDockStore, useTruck } from "@/stores";
import type { LiveDockEntry } from "@/stores";
import type { MapTruck } from "@/types";

import { useYardOverview } from "./queries";

/**
 * The seam between the REST snapshot and the realtime layer.
 *
 * `subscribe:operations` (joined via `useOperationsSubscription`) only ever
 * hydrates the truck store — its ack is `LiveTruckView[]`, nothing about
 * docks or alerts. So the dock store is seeded here, straight from the same
 * REST snapshot the page renders, the moment it lands. This is a field
 * rename only: no value is invented, and dock membership stays exactly what
 * the backend returned.
 *
 * The alert store is deliberately *not* seeded here. `GET /api/v1/alerts` is
 * its single snapshot source (`features/alerts/use-alert-feed.ts`, mounted
 * app-wide), because this overview only runs on `/dashboard` and its `alerts`
 * array is a trimmed slice. Seeding from both would race two snapshots through
 * one `hasSeeded` latch and let whichever landed first win arbitrarily.
 */
export function useDashboardSnapshot() {
  const query = useYardOverview();
  useOperationsSubscription();

  const generatedAt = query.data?.generatedAt;

  useEffect(() => {
    if (!query.data) return;
    const data = query.data;

    const existingDocks = useDockStore.getState().docksById;
    const docks: LiveDockEntry[] = data.docks.map((dock) => {
      // A live dock event newer than this REST snapshot must not be
      // regressed by it — the debounced refetch that seeds this effect can
      // land after a subsequent socket event already advanced the dock.
      const existing = existingDocks[dock.id];
      if (existing && existing.updatedAt > data.generatedAt) return existing;

      return {
        dockId: dock.id,
        code: dock.code,
        status: dock.status,
        occupyingTruckId: dock.currentAssignment?.truckId ?? null,
        activeAssignmentId: dock.currentAssignment?.id ?? null,
        unavailableReason: dock.status === "UNAVAILABLE" ? (dock.unavailableReason ?? null) : null,
        updatedAt: data.generatedAt,
      };
    });

    useDockStore.getState().hydrateFromSnapshot(docks);
    // `subscribe:operations` acks with trucks only, so the assignment map has
    // no other source for anything assigned before this page loaded.
    useDockStore.getState().seedAssignmentsFromSnapshot(data.activeAssignments, data.generatedAt);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [generatedAt]);

  return {
    overview: query.data,
    isPending: query.isPending,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

export interface LiveTruckFields {
  status: MapTruck["status"];
  eta: string | null;
  progress: number;
  speedKmph: number;
  activeDelay: MapTruck["activeDelay"];
}

/**
 * Per-row overlay: prefers the live truck-store entry's server-sent fields
 * over the REST row's, falling back to REST when the truck isn't (yet) held
 * live. Never derives a value neither side actually sent.
 */
export function useLiveTruckFields(truck: MapTruck): LiveTruckFields {
  const live = useTruck(truck.id);

  if (!live) {
    return {
      status: truck.status,
      eta: truck.eta ?? null,
      progress: truck.progress,
      speedKmph: truck.speedKmph,
      activeDelay: truck.activeDelay,
    };
  }

  return {
    status: live.status,
    eta: live.eta,
    progress: live.progress,
    speedKmph: live.speedKmph,
    activeDelay: live.activeDelay,
  };
}
