"use client";

import { useEffect } from "react";
import type { GeoJSONSource } from "mapbox-gl";

import { useRoute } from "@/features/routes";
import type { LatLng } from "@/types";

import { useMapInstance } from "./map-context";

const CASING_COLOR = "#ffffff";
const IDLE_COLOR = "#94a3b8";
const SELECTED_COLOR = "#2563eb";

/** `@types/geojson` is not a dependency here, so the one shape we build is
 * declared locally rather than pulling in a package for a single type. */
interface LineStringFeature {
  type: "Feature";
  properties: Record<string, never>;
  geometry: { type: "LineString"; coordinates: [number, number][] };
}

function toLineString(geometry: LatLng[]): LineStringFeature {
  return {
    type: "Feature",
    properties: {},
    geometry: {
      type: "LineString",
      // The backend speaks `{ latitude, longitude }`; GeoJSON wants [lng, lat].
      coordinates: geometry.map((point) => [point.longitude, point.latitude]),
    },
  };
}

/**
 * One route corridor. `useRoute` is the *only* place geometry is requested —
 * `GET /api/v1/routes/:id`, cached with `staleTime: Infinity`, so each unique
 * route is fetched once per session and never on a realtime tick.
 */
export function RouteLine({ routeId, isSelected }: { routeId: string; isSelected: boolean }) {
  const map = useMapInstance();
  const { data } = useRoute(routeId);
  const geometry = data?.geometry;

  const sourceId = `route-${routeId}`;
  const casingLayerId = `${sourceId}-casing`;
  const lineLayerId = `${sourceId}-line`;

  useEffect(() => {
    if (!map || !geometry || geometry.length === 0) return;

    const feature = toLineString(geometry);

    // Updating in place must still fall through to the cleanup below: an
    // early `return` here would leave that run of the effect with no
    // teardown, and a `geometry` identity change (a broad invalidation, a
    // cache re-fill) would then strand the source and both layers on the map
    // for good — the corridor of a truck that has left the fleet stays
    // painted.
    const existing = map.getSource(sourceId) as GeoJSONSource | undefined;

    if (existing) {
      existing.setData(feature);
    } else {
      map.addSource(sourceId, { type: "geojson", data: feature });

      map.addLayer({
        id: casingLayerId,
        type: "line",
        source: sourceId,
        layout: { "line-cap": "round", "line-join": "round" },
        paint: { "line-color": CASING_COLOR, "line-width": 5, "line-opacity": 0.7 },
      });

      map.addLayer({
        id: lineLayerId,
        type: "line",
        source: sourceId,
        layout: { "line-cap": "round", "line-join": "round" },
        paint: { "line-color": IDLE_COLOR, "line-width": 2, "line-opacity": 0.75 },
      });
    }

    return () => {
      // Removal can race `map.remove()` during unmount, so every step is guarded.
      if (!map.getStyle()) return;
      if (map.getLayer(lineLayerId)) map.removeLayer(lineLayerId);
      if (map.getLayer(casingLayerId)) map.removeLayer(casingLayerId);
      if (map.getSource(sourceId)) map.removeSource(sourceId);
    };
  }, [map, geometry, sourceId, casingLayerId, lineLayerId]);

  // Selection repaints in place — the source and layers are never re-added.
  useEffect(() => {
    if (!map || !map.getLayer(lineLayerId)) return;

    map.setPaintProperty(lineLayerId, "line-color", isSelected ? SELECTED_COLOR : IDLE_COLOR);
    map.setPaintProperty(lineLayerId, "line-width", isSelected ? 3.5 : 2);
    map.setPaintProperty(lineLayerId, "line-opacity", isSelected ? 1 : 0.55);
    map.setPaintProperty(casingLayerId, "line-opacity", isSelected ? 0.9 : 0.5);
  }, [map, isSelected, geometry, lineLayerId, casingLayerId]);

  return null;
}
