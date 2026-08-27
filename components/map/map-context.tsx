"use client";

import { createContext, useContext } from "react";
import type mapboxgl from "mapbox-gl";

const MapContext = createContext<mapboxgl.Map | null>(null);

export const MapProvider = MapContext.Provider;

/**
 * The loaded map instance, or `null` while it is still initialising. Every
 * child that owns an imperative Mapbox resource (a marker, a source, a layer)
 * returns `null` on `null` and does its work in an effect keyed on the
 * instance, so nothing touches `mapboxgl` before `load`.
 */
export function useMapInstance(): mapboxgl.Map | null {
  return useContext(MapContext);
}
