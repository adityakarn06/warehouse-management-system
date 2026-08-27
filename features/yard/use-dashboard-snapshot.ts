"use client";

import { useEffect } from "react";

import { useOperationsSubscription } from "@/hooks/use-realtime";
import { useAlertStore, useDockStore, useTruck } from "@/stores";
import type { LiveDockEntry } from "@/stores";
import type { YardTruck } from "@/types";

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
 * The alert store is different: it is (per `stores/alert-helpers.ts`) "the
 * live-pushed feed only, seeded *once* from an initial REST snapshot" — a
 * later debounced refetch (`useSnapshotInvalidation`), or a remount of this
 * hook, must not re-hydrate it, or it would silently reset
 * `unreadCount`/`isRead` on alerts the socket has already delivered and the
 * user may have already read. `seedFromSnapshot` holds that latch in the
 * store itself, which is what outlives the mount.
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
        updatedAt: data.generatedAt,
      };
    });

    useDockStore.getState().hydrateFromSnapshot(docks);

    useAlertStore.getState().seedFromSnapshot(data.alerts);
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
  status: YardTruck["status"];
  eta: YardTruck["eta"];
  progress: number;
  speedKmph: number;
  activeDelay: YardTruck["activeDelay"];
}

/**
 * Per-row overlay: prefers the live truck-store entry's server-sent fields
 * over the REST row's, falling back to REST when the truck isn't (yet) held
 * live. Never derives a value neither side actually sent.
 */
export function useLiveTruckFields(truck: YardTruck): LiveTruckFields {
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

/**
 * Same overlay rule as `useLiveTruckFields`, for the map: the live store's
 * server-sent `current*` position when the truck is held live, else the REST
 * row's. `target*`/`previous*` are deliberately not read — they exist for the
 * render-time interpolation phase, and a lerped coordinate is never
 * authoritative (AGENTS.md).
 */
export function useLiveTruckPosition(truck: YardTruck): { latitude: number; longitude: number } {
  const live = useTruck(truck.id);

  if (!live) return { latitude: truck.latitude, longitude: truck.longitude };

  return { latitude: live.currentLatitude, longitude: live.currentLongitude };
}
