"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

import { ErrorState } from "@/components/ui/error-state";
import { useRoutes } from "@/features/routes";
import {
  FIT_BOUNDS_MAX_ZOOM,
  FIT_BOUNDS_PADDING,
  FLY_DURATION_MS,
  FOCUS_ZOOM,
  MAPBOX_TOKEN,
} from "@/lib/mapbox/config";
import { useMapboxMap } from "@/hooks/use-mapbox-map";
import { useTruckInterpolator } from "@/hooks/use-truck-interpolator";
import { cn } from "@/lib/utils";
import { useSelectedTruckId, useTruckStore, useUIStore } from "@/stores";
import type { YardTruck } from "@/types";

import { TruckInterpolatorProvider } from "./interpolator-context";
import { MapControls } from "./map-controls";
import { MapProvider } from "./map-context";
import { RouteLine } from "./route-line";
import { TruckMarker } from "./truck-marker";
import { WarehouseMarker, type WarehouseMarkerProps } from "./warehouse-marker";

/** Endpoints are shared across routes (the seed converges on one destination). */
function endpointKey(latitude: number, longitude: number) {
  return `${latitude.toFixed(4)},${longitude.toFixed(4)}`;
}

/**
 * Resolves a truck's position at *call* time rather than through a render
 * dependency, so the camera effects never re-run on a 2s position tick.
 */
function currentPositionOf(truck: YardTruck): [number, number] {
  const live = useTruckStore.getState().trucksById[truck.id];
  return live
    ? [live.currentLongitude, live.currentLatitude]
    : [truck.longitude, truck.latitude];
}

export function LiveMap({ trucks, className }: { trucks: YardTruck[]; className?: string }) {
  const { containerRef, map } = useMapboxMap();
  const selectedTruckId = useSelectedTruckId();

  // Drives the truck markers' `setLngLat` from its own rAF loop, fed straight
  // from the truck store. It re-renders nothing — the camera policy below is
  // unaffected by it, and still reads *authoritative* positions only.
  const interpolator = useTruckInterpolator();

  const routeIds = useMemo(() => {
    const ids = new Set<string>();
    for (const truck of trucks) {
      if (truck.route?.id) ids.add(truck.route.id);
    }
    return [...ids].sort();
  }, [trucks]);

  const routeQueries = useRoutes(routeIds);

  // `useQueries` hands back a fresh array each render, so this is not
  // memoised. Everything downstream either takes primitive props (the
  // markers) or is guarded by a ref (the one-time fit), so the churn is free.
  const routes = routeQueries
    .map((query) => query.data)
    .filter((route) => route !== undefined);

  // The initial fit waits on this: trucks land before any route query
  // resolves, so fitting on trucks alone would push the origin/destination
  // markers and the route corridors outside the viewport. Errored queries
  // count as settled — a failed route must not block the camera forever.
  const routesSettled = routeQueries.every((query) => !query.isPending);

  const selectedRouteId = useMemo(
    () => trucks.find((truck) => truck.id === selectedTruckId)?.route?.id ?? null,
    [trucks, selectedTruckId],
  );

  const endpoints = useMemo(() => {
    const byKey = new Map<string, WarehouseMarkerProps>();

    for (const route of routes) {
      const origin: WarehouseMarkerProps = {
        latitude: route.originLatitude,
        longitude: route.originLongitude,
        name: route.originName,
        kind: "origin",
      };
      const destination: WarehouseMarkerProps = {
        latitude: route.destinationLatitude,
        longitude: route.destinationLongitude,
        name: route.destinationName,
        kind: "destination",
      };

      for (const endpoint of [origin, destination]) {
        const key = endpointKey(endpoint.latitude, endpoint.longitude);
        const existing = byKey.get(key);
        // A facility that is a destination on any route outranks its
        // appearance as an origin on another.
        if (!existing || (existing.kind === "origin" && endpoint.kind === "destination")) {
          byKey.set(key, endpoint);
        }
      }
    }

    return [...byKey.entries()].map(([key, endpoint]) => ({ key, ...endpoint }));
  }, [routes]);

  const fleetBounds = useCallback(() => {
    const bounds = new mapboxgl.LngLatBounds();
    let count = 0;

    for (const truck of trucks) {
      bounds.extend(currentPositionOf(truck));
      count += 1;
    }
    for (const endpoint of endpoints) {
      bounds.extend([endpoint.longitude, endpoint.latitude]);
      count += 1;
    }

    return count > 0 ? bounds : null;
  }, [trucks, endpoints]);

  const fitFleet = useCallback(() => {
    if (!map) return;
    const bounds = fleetBounds();
    if (!bounds) return;

    map.fitBounds(bounds, {
      padding: FIT_BOUNDS_PADDING,
      maxZoom: FIT_BOUNDS_MAX_ZOOM,
      duration: FLY_DURATION_MS,
    });
  }, [map, fleetBounds]);

  const focusTruck = useCallback(
    (truckId: string) => {
      if (!map) return;
      const truck = trucks.find((candidate) => candidate.id === truckId);
      if (!truck) return;

      map.easeTo({
        center: currentPositionOf(truck),
        zoom: Math.max(map.getZoom(), FOCUS_ZOOM),
        duration: FLY_DURATION_MS,
      });
    },
    [map, trucks],
  );

  // --- Camera policy: exactly three movers, none of them realtime ----------

  // 1. Initial load — fits once over the first fleet *and* its route
  //    endpoints, then latches. Skipped outright when the UI store already
  //    holds a viewport: `useMapboxMap` restored it into the constructor, and
  //    fitting would overwrite where the user actually left the map.
  const hasFitRef = useRef(false);
  useEffect(() => {
    if (!map || hasFitRef.current) return;

    if (useUIStore.getState().mapViewState) {
      hasFitRef.current = true;
      return;
    }

    if (!routesSettled) return;
    const bounds = fleetBounds();
    if (!bounds) return;

    hasFitRef.current = true;
    map.fitBounds(bounds, { padding: FIT_BOUNDS_PADDING, maxZoom: FIT_BOUNDS_MAX_ZOOM, duration: 0 });
  }, [map, fleetBounds, routesSettled]);

  // 2. User selects a truck — fires on identity change only, never on the
  //    position ticks that follow it.
  const lastFocusedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!map) return;
    if (selectedTruckId === lastFocusedRef.current) return;

    lastFocusedRef.current = selectedTruckId;
    if (selectedTruckId) focusTruck(selectedTruckId);
  }, [map, selectedTruckId, focusTruck]);

  // 3. The locate/fit buttons in `MapControls`, wired below.

  // Clicking bare tiles clears the selection; markers stop propagation.
  useEffect(() => {
    if (!map) return;
    const handleClick = () => useUIStore.getState().selectTruck(null);
    map.on("click", handleClick);
    return () => {
      map.off("click", handleClick);
    };
  }, [map]);

  if (!MAPBOX_TOKEN) {
    return (
      <div className={cn("flex min-h-80 flex-1 rounded-lg border border-border p-4", className)}>
        <ErrorState
          title="Map unavailable"
          message="NEXT_PUBLIC_MAPBOX_TOKEN is not set. Add it to .env and restart the dev server."
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative flex min-h-96 flex-1 overflow-hidden rounded-lg border border-border bg-muted/20",
        className,
      )}
    >
      {/* `mapbox-gl.css` forces `.mapboxgl-map { position: relative }` and is
          injected after Tailwind, so the container must not rely on absolute
          positioning — nor on a percentage height, which needs a definite
          parent. As a flex child it grows on the main axis and stretches on
          the cross axis, which holds regardless of the ancestor chain. */}
      <div ref={containerRef} className="min-w-0 flex-1" />

      <MapProvider value={map}>
        <TruckInterpolatorProvider value={interpolator}>
          {routes.map((route) => (
            <RouteLine key={route.id} routeId={route.id} isSelected={route.id === selectedRouteId} />
          ))}

          {endpoints.map(({ key, ...endpoint }) => (
            <WarehouseMarker key={key} {...endpoint} />
          ))}

          {trucks.map((truck) => (
            <TruckMarker key={truck.id} truck={truck} />
          ))}

          <MapControls
            onFitFleet={fitFleet}
            onLocateSelected={() => selectedTruckId && focusTruck(selectedTruckId)}
            canLocateSelected={Boolean(selectedTruckId)}
          />
        </TruckInterpolatorProvider>
      </MapProvider>
    </div>
  );
}
