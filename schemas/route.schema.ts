import { z } from "zod";

import { latLngSchema } from "./common.schema";

/** Trimmed route as nested inside a truck/shipment list or detail row. */
export const routeSummarySchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  originName: z.string(),
  destinationName: z.string(),
  distanceKm: z.number(),
});

/** Full route row, as nested inside a truck detail — everything but geometry. */
export const routeSchema = routeSummarySchema.extend({
  originLatitude: z.number(),
  originLongitude: z.number(),
  destinationLatitude: z.number(),
  destinationLongitude: z.number(),
  estimatedDurationMinutes: z.number(),
  averageSpeedKmph: z.number(),
});

/**
 * GET /routes/:id only — the only endpoint that includes `geometry`, which is
 * large and static (docs/api.md "Route geometry").
 */
export const routeDetailSchema = routeSchema.extend({
  createdAt: z.string(),
  updatedAt: z.string(),
  geometry: z.array(latLngSchema),
});

export type RouteSummary = z.infer<typeof routeSummarySchema>;
export type Route = z.infer<typeof routeSchema>;
export type RouteDetail = z.infer<typeof routeDetailSchema>;
