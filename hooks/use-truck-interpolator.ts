"use client";

import { useEffect, useState } from "react";

import { createTruckInterpolator, type TruckInterpolator } from "@/lib/mapbox/truck-interpolation";
import { useTruckStore } from "@/stores";

/**
 * Owns one `TruckInterpolator` for the lifetime of the map that mounts it, and
 * feeds it authoritative positions straight from the truck store.
 *
 * The subscription is taken imperatively (`useTruckStore.subscribe`) rather
 * than through a selector on purpose: position ticks must reach the markers
 * without re-rendering anything at all. Nothing in this hook re-renders after
 * the first commit, and no store write ever happens per frame — the animation
 * lives entirely in the manager's own rAF loop.
 */
export function useTruckInterpolator(): TruckInterpolator {
  // Created during render, so the value handed to the context provider is
  // stable from the first commit and the marker effects can register against
  // it immediately. Construction has no side effects, so StrictMode's
  // double-invoke simply discards one instance.
  const [interpolator] = useState(createTruckInterpolator);

  useEffect(() => {
    interpolator.syncAll(useTruckStore.getState().trucksById);

    const unsubscribe = useTruckStore.subscribe((state, previous) => {
      const next = state.trucksById;
      const before = previous.trucksById;
      if (next === before) return;

      // Entry identity is the diff: every store reducer rebuilds only the
      // truck it touched, so an untouched truck is skipped outright.
      for (const truckId of Object.keys(next)) {
        const entry = next[truckId];
        if (entry !== before[truckId]) interpolator.sync(entry);
      }

      interpolator.prune(Object.keys(next));
    });

    // rAF is throttled to a crawl in a background tab, so a returning tab can
    // hold markers many ticks behind. Re-planning from the authoritative
    // snapshot lets the interpolator's own snap rule close the gap.
    const handleVisibility = () => {
      if (document.visibilityState !== "visible") return;
      interpolator.syncAll(useTruckStore.getState().trucksById, true);
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      unsubscribe();
      document.removeEventListener("visibilitychange", handleVisibility);
      interpolator.destroy();
    };
  }, [interpolator]);

  return interpolator;
}
