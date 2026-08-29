import type { MapTruck, TruckDetail } from "@/types";

/**
 * Adapts a `GET /trucks/:id` row to the structural `MapTruck` shape.
 *
 * `useLiveTruckFields` takes a `MapTruck` because it was written for the
 * dashboard's `/yard/overview` rows, and `TruckDetail` is one field-naming
 * step away from satisfying it: the detail row calls its coordinates
 * `currentLatitude` / `currentLongitude`. This renames them and nothing else —
 * the values, including the position, are the REST snapshot's own, and the
 * overlay hook is what prefers the live store over them.
 */
export function toMapTruck(truck: TruckDetail): MapTruck {
  return {
    id: truck.id,
    reference: truck.reference,
    latitude: truck.currentLatitude,
    longitude: truck.currentLongitude,
    status: truck.status,
    activeDelay: truck.activeDelay,
    progress: truck.progress,
    speedKmph: truck.speedKmph,
    eta: truck.eta,
    route: truck.route ? { id: truck.route.id } : null,
  };
}
