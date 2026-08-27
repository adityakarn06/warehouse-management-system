"use client";

import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";

import {
  DEFAULT_MAP_CENTER,
  DEFAULT_MAP_ZOOM,
  MAP_STYLE_URL,
  MAPBOX_TOKEN,
} from "@/lib/mapbox/config";
import { useUIStore } from "@/stores";

interface UseMapboxMapResult {
  /** Attach to the element the map renders into. */
  containerRef: React.RefObject<HTMLDivElement | null>;
  /** `null` until the map has fired `load` — children must not touch it before then. */
  map: mapboxgl.Map | null;
}

/**
 * Creates the `mapboxgl.Map` exactly once for the lifetime of the component
 * that calls it. The instance lives in a ref so no React render can recreate
 * it; it is mirrored into state only so consumers re-render the single time
 * it becomes available.
 *
 * Camera movement is deliberately *not* handled here — see the three-effect
 * policy in `components/map/live-map.tsx`. This hook only records where the
 * user left the viewport, into the UI store fields already reserved for it.
 */
export function useMapboxMap(): UseMapboxMapResult {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const [map, setMap] = useState<mapboxgl.Map | null>(null);

  useEffect(() => {
    // Guard against StrictMode's double-invoke and against any render that
    // might otherwise re-enter before cleanup has run.
    const container = containerRef.current;
    if (mapRef.current || !container || !MAPBOX_TOKEN) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;

    const restored = useUIStore.getState().mapViewState;
    const instance = new mapboxgl.Map({
      container,
      style: MAP_STYLE_URL,
      center: restored
        ? [restored.longitude, restored.latitude]
        : [DEFAULT_MAP_CENTER.longitude, DEFAULT_MAP_CENTER.latitude],
      zoom: restored ? restored.zoom : DEFAULT_MAP_ZOOM,
      attributionControl: false,
    });

    mapRef.current = instance;

    const handleLoad = () => setMap(instance);
    const handleMoveStart = () => useUIStore.getState().setMapInteracting(true);
    const handleMoveEnd = () => {
      const center = instance.getCenter();
      useUIStore.getState().setMapViewState({
        longitude: center.lng,
        latitude: center.lat,
        zoom: instance.getZoom(),
      });
      useUIStore.getState().setMapInteracting(false);
    };

    instance.on("load", handleLoad);
    instance.on("movestart", handleMoveStart);
    instance.on("moveend", handleMoveEnd);

    // Mapbox only watches the window, so a container that changes size on its
    // own — the sidebar collapsing, the side panel opening — would leave the
    // canvas at a stale size.
    const observer = new ResizeObserver(() => instance.resize());
    observer.observe(container);

    return () => {
      observer.disconnect();
      mapRef.current = null;
      setMap(null);
      instance.remove();
    };
  }, []);

  return { containerRef, map };
}
