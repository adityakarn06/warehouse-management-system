import type { ActiveDelay, TruckStatus } from "@/schemas/common.schema";

/**
 * The minimum a truck must expose to be drawn on `LiveMap`.
 *
 * Deliberately structural rather than a domain type: `YardTruck` (the
 * `/yard/overview` row) satisfies it as-is, and so does an adapter over a
 * `LiveTruckEntry` — which is what the tracking page has, since
 * `GET /tracking/:trackingNumber` carries neither a truck id nor a route.
 * Widening the map's prop type is what keeps there being exactly one map
 * implementation instead of a second one for the single-shipment view.
 *
 * Positions here are the *REST snapshot* fallback only. Every live truck's
 * position is owned by the interpolator, fed from the truck store.
 */
export interface MapTruck {
  id: string;
  reference: string;
  latitude: number;
  longitude: number;
  status: TruckStatus;
  activeDelay: ActiveDelay;
  progress: number;
  speedKmph: number;
  eta?: string | null;
  /** Drives the route corridor. Only `id` is read. */
  route?: { id: string } | null;
}
