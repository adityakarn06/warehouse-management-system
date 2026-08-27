import type { LiveTruckEntry } from "@/stores";
import type { MapTruck } from "@/types";

/**
 * Adapts one live truck-store entry into the shape `LiveMap` draws.
 *
 * Pure field renaming — `current*` is the position the backend last sent, and
 * `routeId` is the route it said the truck is running. Nothing here is
 * computed: the tracking page has no `YardTruck` to hand the map (the REST
 * tracking response carries neither a truck id nor a route), and fabricating
 * one would mean inventing a carrier and a route summary the backend never
 * sent.
 */
export function mapTruckFromLiveEntry(entry: LiveTruckEntry): MapTruck {
  return {
    id: entry.truckId,
    reference: entry.reference,
    latitude: entry.currentLatitude,
    longitude: entry.currentLongitude,
    status: entry.status,
    activeDelay: entry.activeDelay,
    progress: entry.progress,
    speedKmph: entry.speedKmph,
    eta: entry.eta,
    route: entry.routeId ? { id: entry.routeId } : null,
  };
}
