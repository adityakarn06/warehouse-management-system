/**
 * Visual truck interpolation — the render layer between the authoritative
 * truck store and Mapbox.
 *
 * The backend is authoritative every ~2 s (docs/realtime.md); everything here
 * exists only to fill the gap between two server-sent coordinate pairs so the
 * fleet glides instead of teleporting. Per AGENTS.md this is a *rendering*
 * interpolation: nothing computed here is ever written back to the store, and
 * `progress`, `eta`, `speedKmph` and route position are never derived — only
 * longitude/latitude, only for the frame currently being painted.
 *
 * Deliberately free of React, Zustand and Mapbox imports (types only, which
 * erase at runtime): the whole module is drivable by a plain node harness with
 * an injected clock — see `scripts/interpolation-verify.mjs`.
 */

import type { TruckStatus } from "@/schemas/common.schema";
import type { LiveTruckEntry } from "@/stores/truck-helpers";

// ---- Tuning ---------------------------------------------------------------

/** `SIMULATION_TICK_MS` default (docs/api.md) — the seed for a truck whose
 * real cadence has not been observed yet. */
export const DEFAULT_TICK_MS = 2000;

/** A leg is stretched or compressed to the cadence actually observed, but
 * never outside this band: below `MIN` the truck would visibly sprint then
 * park, above `MAX` it would lag the authoritative position by too much. */
export const MIN_LEG_MS = 1200;
export const MAX_LEG_MS = 4000;

/** ~2 km. A truck cannot cover this between ticks at any plausible speed, so
 * a visual position this far from the authoritative one means a reconnect
 * snapshot, a simulation reset, or a long background-tab throttle — never
 * motion to be animated. */
export const SNAP_DISTANCE_DEG = 0.02;

/** Squared-distance slack for "the marker is roughly where the backend says
 * it is": the visual position may sit up to 2 leg-lengths off `current*`
 * (factor 4 in squared space) and still count as a healthy cadence. */
export const NORMAL_DRIFT_FACTOR = 4;

/** Below this the two coordinate pairs are the same point — a snapshot entry
 * (`target* === current*`) or a trailer parked in the yard. */
export const EPSILON_DEG = 1e-9;

/**
 * `ARRIVED`, `DOCKED` and `COMPLETED` trucks are not going anywhere: they are
 * rendered at the authoritative position and never animated.
 */
const MOVING_STATUSES: ReadonlySet<TruckStatus> = new Set<TruckStatus>([
  "IN_TRANSIT",
  "DELAYED",
  "ARRIVING",
]);

export function isMovingStatus(status: TruckStatus): boolean {
  return MOVING_STATUSES.has(status);
}

// ---- Geometry -------------------------------------------------------------

/** Squared degree distance. Only ever compared against other squared degree
 * distances, so the missing `sqrt` and the missing latitude correction cancel
 * out — this is a threshold test, not a measurement anyone reads. */
export function squaredDistanceDeg(
  aLongitude: number,
  aLatitude: number,
  bLongitude: number,
  bLatitude: number,
): number {
  const dx = aLongitude - bLongitude;
  const dy = aLatitude - bLatitude;
  return dx * dx + dy * dy;
}

export function clamp(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value;
}

// ---- Legs -----------------------------------------------------------------

/** One truck's in-flight animation. Held outside React state — no render, and
 * no store write, ever happens per frame. */
export interface Leg {
  startLongitude: number;
  startLatitude: number;
  targetLongitude: number;
  targetLatitude: number;
  /** Interpolator-clock ms at which the leg was planned. */
  startTime: number;
  duration: number;
  /** Carried for diagnostics only — sequencing is enforced by the store. */
  sequenceNumber: number;
}

/**
 * Position along a leg at `now`, linear and clamped at both ends.
 *
 * Linear on purpose: easing would render a constant-speed truck as
 * accelerating, which misreports the one thing the map is for. Clamped at 1 on
 * purpose too — when no further update arrives the truck stops at the
 * backend's target rather than inventing continued movement.
 */
export function positionAtLeg(leg: Leg, now: number): [longitude: number, latitude: number] {
  const t = leg.duration <= 0 ? 1 : clamp((now - leg.startTime) / leg.duration, 0, 1);
  return [
    leg.startLongitude + (leg.targetLongitude - leg.startLongitude) * t,
    leg.startLatitude + (leg.targetLatitude - leg.startLatitude) * t,
  ];
}

export function isLegFinished(leg: Leg, now: number): boolean {
  return now - leg.startTime >= leg.duration;
}

/** Where the marker currently is on screen, when it is on screen at all. */
export interface VisualPosition {
  longitude: number;
  latitude: number;
}

export type LegPlan =
  | { kind: "snap"; longitude: number; latitude: number }
  | { kind: "animate"; leg: Leg };

/**
 * Chooses the coordinate a new leg starts from.
 *
 * Normally the marker's own visual position, which at a healthy cadence is
 * last leg's target and sits within a leg-length of the new authoritative
 * `current*` — starting there is what removes the sub-pixel jolt at every tick
 * boundary. Two exceptions, in priority order:
 *
 *  - the marker is implausibly far away (reconnect snapshot, reset, throttled
 *    tab): start from `current*`, so the gap is crossed as a snap and never
 *    animated;
 *  - the marker is behind by more than a leg but still nearby, and the payload
 *    carries `previous*` closer to where it actually is: start from
 *    `previous*`, so a late or dropped tick reads as the movement it was
 *    rather than a rubber-band (docs/realtime.md).
 */
function chooseStart(entry: LiveTruckEntry, visual: VisualPosition | null): VisualPosition {
  const current = { longitude: entry.currentLongitude, latitude: entry.currentLatitude };
  if (!visual) return current;

  const legLength = squaredDistanceDeg(
    entry.currentLongitude,
    entry.currentLatitude,
    entry.targetLongitude,
    entry.targetLatitude,
  );
  const drift = squaredDistanceDeg(
    visual.longitude,
    visual.latitude,
    entry.currentLongitude,
    entry.currentLatitude,
  );

  if (drift <= legLength * NORMAL_DRIFT_FACTOR) {
    return { longitude: visual.longitude, latitude: visual.latitude };
  }

  if (drift > SNAP_DISTANCE_DEG * SNAP_DISTANCE_DEG) return current;

  if (entry.previousLongitude !== null && entry.previousLatitude !== null) {
    const toPrevious = squaredDistanceDeg(
      visual.longitude,
      visual.latitude,
      entry.previousLongitude,
      entry.previousLatitude,
    );
    if (toPrevious <= drift) {
      return { longitude: entry.previousLongitude, latitude: entry.previousLatitude };
    }
  }

  return current;
}

/**
 * Turns one authoritative entry into either a snap or an animated leg. Pure —
 * the whole leg policy lives here so the verify script can assert it directly.
 */
export function planLeg(
  entry: LiveTruckEntry,
  visual: VisualPosition | null,
  now: number,
  duration: number,
): LegPlan {
  // Parked, docked or done: render the backend's position, animate nothing.
  if (!isMovingStatus(entry.status)) {
    return { kind: "snap", longitude: entry.currentLongitude, latitude: entry.currentLatitude };
  }

  // Degenerate segment — every snapshot entry pins `target*` to `current*`
  // (stores/truck-helpers.ts), as does a trailer standing in the yard.
  const legLength = squaredDistanceDeg(
    entry.currentLongitude,
    entry.currentLatitude,
    entry.targetLongitude,
    entry.targetLatitude,
  );
  if (legLength < EPSILON_DEG * EPSILON_DEG) {
    return { kind: "snap", longitude: entry.currentLongitude, latitude: entry.currentLatitude };
  }

  const start = chooseStart(entry, visual);

  return {
    kind: "animate",
    leg: {
      startLongitude: start.longitude,
      startLatitude: start.latitude,
      targetLongitude: entry.targetLongitude,
      targetLatitude: entry.targetLatitude,
      startTime: now,
      duration,
      sequenceNumber: entry.sequenceNumber,
    },
  };
}

// ---- The manager ----------------------------------------------------------

/** How a track pushes a position at its marker. `mapboxgl.Marker.setLngLat`
 * in the app; a recorder in the verify script. */
export type ApplyPosition = (longitude: number, latitude: number) => void;

export interface TruckInterpolatorOptions {
  now?: () => number;
  requestFrame?: (callback: () => void) => number;
  cancelFrame?: (handle: number) => void;
}

interface Track {
  apply: ApplyPosition | null;
  hasVisual: boolean;
  visualLongitude: number;
  visualLatitude: number;
  leg: Leg | null;
  /** Adaptive leg length for this truck, in ms. */
  duration: number;
  /** Interpolator-clock ms of the last position-bearing update. */
  lastPositionAt: number | null;
  /** The previous plan was a snap, so the gap either side of it is a
   * re-baseline rather than a tick and must not feed the cadence estimate. */
  baselined: boolean;
  /** Change detection — an ETA or status tick bumps `receivedAt` without
   * moving the truck, and must not restart an in-flight leg. */
  seen: boolean;
  seenCurrentLongitude: number;
  seenCurrentLatitude: number;
  seenTargetLongitude: number;
  seenTargetLatitude: number;
  seenMoving: boolean;
}

export interface TruckInterpolator {
  /** Binds a marker. Returns the unregister fn; the marker instance itself is
   * never touched, created or destroyed by the interpolator. */
  registerMarker: (truckId: string, apply: ApplyPosition) => () => void;
  sync: (entry: LiveTruckEntry, force?: boolean) => void;
  syncAll: (trucksById: Record<string, LiveTruckEntry>, force?: boolean) => void;
  /** Drops tracks for trucks the store no longer holds. */
  prune: (liveTruckIds: Iterable<string>) => void;
  destroy: () => void;
  /** Diagnostics, used by the verify script. */
  isRunning: () => boolean;
  getVisualPosition: (truckId: string) => VisualPosition | null;
  getLeg: (truckId: string) => Leg | null;
}

function defaultNow(): number {
  return typeof performance === "undefined" ? Date.now() : performance.now();
}

/**
 * One manager per mounted map. Holds every truck's leg outside React, runs a
 * single shared rAF loop for the whole fleet, and goes fully idle the moment
 * no truck has an active leg — so a stopped simulation costs nothing.
 */
export function createTruckInterpolator(
  options: TruckInterpolatorOptions = {},
): TruckInterpolator {
  const now = options.now ?? defaultNow;
  const requestFrame =
    options.requestFrame ?? ((callback: () => void) => requestAnimationFrame(() => callback()));
  const cancelFrame = options.cancelFrame ?? ((handle: number) => cancelAnimationFrame(handle));

  const tracks = new Map<string, Track>();
  let frameHandle: number | null = null;

  function createTrack(): Track {
    return {
      apply: null,
      hasVisual: false,
      visualLongitude: 0,
      visualLatitude: 0,
      leg: null,
      duration: DEFAULT_TICK_MS,
      lastPositionAt: null,
      baselined: true,
      seen: false,
      seenCurrentLongitude: 0,
      seenCurrentLatitude: 0,
      seenTargetLongitude: 0,
      seenTargetLatitude: 0,
      seenMoving: false,
    };
  }

  function trackFor(truckId: string): Track {
    const existing = tracks.get(truckId);
    if (existing) return existing;
    const created = createTrack();
    tracks.set(truckId, created);
    return created;
  }

  function setVisual(track: Track, longitude: number, latitude: number): void {
    track.hasVisual = true;
    track.visualLongitude = longitude;
    track.visualLatitude = latitude;
    track.apply?.(longitude, latitude);
  }

  function schedule(): void {
    if (frameHandle !== null) return;
    frameHandle = requestFrame(frame);
  }

  function frame(): void {
    frameHandle = null;

    const time = now();
    let active = false;

    for (const track of tracks.values()) {
      const leg = track.leg;
      if (!leg) continue;

      const [longitude, latitude] = positionAtLeg(leg, time);
      setVisual(track, longitude, latitude);

      // Retired at the target, never past it — no extrapolation.
      if (isLegFinished(leg, time)) track.leg = null;
      else active = true;
    }

    if (active) schedule();
  }

  function sync(entry: LiveTruckEntry, force = false): void {
    const track = trackFor(entry.truckId);
    const moving = isMovingStatus(entry.status);

    const positionChanged =
      !track.seen ||
      entry.currentLongitude !== track.seenCurrentLongitude ||
      entry.currentLatitude !== track.seenCurrentLatitude ||
      entry.targetLongitude !== track.seenTargetLongitude ||
      entry.targetLatitude !== track.seenTargetLatitude;

    // An ETA-only tick moves nothing and must leave the in-flight leg alone.
    if (!force && !positionChanged && moving === track.seenMoving) return;

    const time = now();

    if (positionChanged || force) {
      // Cadence is measured between two *animating* updates only: the gap
      // across a re-baseline is an outage, not a tick.
      track.duration =
        track.lastPositionAt !== null && !track.baselined
          ? clamp(time - track.lastPositionAt, MIN_LEG_MS, MAX_LEG_MS)
          : DEFAULT_TICK_MS;
      track.lastPositionAt = time;
    }

    track.seen = true;
    track.seenCurrentLongitude = entry.currentLongitude;
    track.seenCurrentLatitude = entry.currentLatitude;
    track.seenTargetLongitude = entry.targetLongitude;
    track.seenTargetLatitude = entry.targetLatitude;
    track.seenMoving = moving;

    const visual: VisualPosition | null = track.hasVisual
      ? { longitude: track.visualLongitude, latitude: track.visualLatitude }
      : null;

    const plan = planLeg(entry, visual, time, track.duration);

    if (plan.kind === "snap") {
      track.leg = null;
      track.baselined = true;
      setVisual(track, plan.longitude, plan.latitude);
      return;
    }

    // A start chosen away from the visual position is a correction, not
    // motion: land it in the same frame so nothing slides across the gap.
    if (
      !track.hasVisual ||
      track.visualLongitude !== plan.leg.startLongitude ||
      track.visualLatitude !== plan.leg.startLatitude
    ) {
      setVisual(track, plan.leg.startLongitude, plan.leg.startLatitude);
    }

    track.leg = plan.leg;
    track.baselined = false;
    schedule();
  }

  function syncAll(trucksById: Record<string, LiveTruckEntry>, force = false): void {
    for (const entry of Object.values(trucksById)) sync(entry, force);
  }

  /**
   * Drops the state of every truck the store no longer holds.
   *
   * A track whose marker is still mounted is *reset* rather than deleted:
   * `registerMarker` runs once per marker and its effect never re-runs while
   * the marker lives, so deleting the track would strand it with a null
   * `apply` if the truck came back in a later snapshot (a reconnect ack whose
   * fleet omits it, then includes it again) — the marker would be frozen for
   * good while positions flowed past it. Resetting clears the leg and the
   * visual baseline, so its return is re-baselined exactly like a first
   * sighting.
   */
  function prune(liveTruckIds: Iterable<string>): void {
    const live = new Set(liveTruckIds);
    for (const [truckId, track] of tracks) {
      if (live.has(truckId)) continue;

      if (track.apply === null) {
        tracks.delete(truckId);
        continue;
      }

      tracks.set(truckId, { ...createTrack(), apply: track.apply });
    }
  }

  function registerMarker(truckId: string, apply: ApplyPosition): () => void {
    const track = trackFor(truckId);
    track.apply = apply;

    // A marker mounting mid-flight adopts the position already known for it,
    // rather than flashing wherever it was constructed.
    if (track.hasVisual) apply(track.visualLongitude, track.visualLatitude);

    return () => {
      if (track.apply === apply) track.apply = null;
    };
  }

  /**
   * Releases everything the manager holds: the pending frame and every track.
   *
   * Deliberately *not* a one-way kill switch. StrictMode and Fast Refresh run
   * a hook's cleanup and then re-run the effect against the same instance, so
   * a permanent "destroyed" flag here would silently freeze the whole fleet in
   * development. A later `sync` simply rebuilds the tracks it needs.
   */
  function destroy(): void {
    if (frameHandle !== null) cancelFrame(frameHandle);
    frameHandle = null;
    tracks.clear();
  }

  return {
    registerMarker,
    sync,
    syncAll,
    prune,
    destroy,
    isRunning: () => frameHandle !== null,
    getVisualPosition: (truckId) => {
      const track = tracks.get(truckId);
      if (!track || !track.hasVisual) return null;
      return { longitude: track.visualLongitude, latitude: track.visualLatitude };
    },
    getLeg: (truckId) => tracks.get(truckId)?.leg ?? null,
  };
}
