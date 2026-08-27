"use client";

import { createContext, useContext } from "react";

import type { TruckInterpolator } from "@/lib/mapbox/truck-interpolation";

const TruckInterpolatorContext = createContext<TruckInterpolator | null>(null);

export const TruckInterpolatorProvider = TruckInterpolatorContext.Provider;

/**
 * The map's truck interpolator. Mirrors `useMapInstance` — `null` outside a
 * `LiveMap`, so a marker rendered without one simply never animates rather
 * than throwing.
 */
export function useMapInterpolator(): TruckInterpolator | null {
  return useContext(TruckInterpolatorContext);
}
