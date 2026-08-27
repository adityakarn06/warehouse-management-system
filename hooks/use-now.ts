"use client";

import { useSyncExternalStore } from "react";

/**
 * A single shared wall clock, ticking once a second.
 *
 * One interval is shared by every subscriber rather than one per component:
 * `UpcomingArrivals` renders a row per truck, and a timer each would mean nine
 * unsynchronised intervals whose countdowns visibly disagree by a fraction of
 * a second. The interval only exists while something is subscribed, so a
 * dashboard with no countdown on screen runs no timer at all.
 *
 * Only for *displaying* a server-sent instant as time-remaining. Nothing here
 * belongs anywhere near truck movement — the map is driven by the
 * interpolator's rAF loop (`lib/mapbox/truck-interpolation.ts`), never by a
 * React clock.
 */
const TICK_MS = 1000;

const listeners = new Set<() => void>();
let handle: ReturnType<typeof setInterval> | null = null;
let now = Date.now();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);

  if (handle === null) {
    handle = setInterval(() => {
      now = Date.now();
      for (const notify of listeners) notify();
    }, TICK_MS);
  }

  return () => {
    listeners.delete(listener);
    if (listeners.size > 0 || handle === null) return;
    clearInterval(handle);
    handle = null;
  };
}

function getSnapshot(): number {
  return now;
}

/** There is no clock to read on the server, and a real one would differ from
 * the client's and break hydration. `formatCountdown` renders `0` as an
 * em-dash until the first client tick. */
function getServerSnapshot(): number {
  return 0;
}

export function useNow(): number {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
