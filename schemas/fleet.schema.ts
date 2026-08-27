import { z } from "zod";

import {
  activeDelaySchema,
  dockAssignmentStatusSchema,
  loadTypeSchema,
  shipmentPrioritySchema,
  shipmentStatusSchema,
  truckStatusSchema,
} from "./common.schema";
import { routeSummarySchema } from "./route.schema";

/** Nested inside a fleet row — see docs/fleet.md. Independently nullable from `dock`. */
const fleetShipmentSchema = z.object({
  id: z.string(),
  reference: z.string(),
  trackingNumber: z.string(),
  customerName: z.string(),
  status: shipmentStatusSchema,
  priority: shipmentPrioritySchema,
  loadType: loadTypeSchema,
  weightKg: z.number(),
  palletCount: z.number(),
});

/** The truck's single `ASSIGNED` dock assignment, if any — never `RECOMMENDED`
 * (docs/fleet.md § Notes: a proposal is not a door). */
const fleetDockSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  zone: z.string(),
  assignmentId: z.string(),
  assignmentStatus: dockAssignmentStatusSchema,
});

/** `GET /fleet` row — a denormalized projection for the fleet card grid
 * (docs/fleet.md). Not yet backed by a real endpoint. */
export const fleetTruckSchema = z.object({
  id: z.string(),
  reference: z.string(),
  trailerId: z.string(),
  carrier: z.string(),
  driverName: z.string(),
  driverPhone: z.string(),
  status: truckStatusSchema,
  activeDelay: activeDelaySchema,
  progress: z.number(),
  speedKmph: z.number(),
  eta: z.string().nullish(),
  lastUpdatedAt: z.string(),
  route: routeSummarySchema.nullish(),
  shipment: fleetShipmentSchema.nullish(),
  dock: fleetDockSchema.nullish(),
});

export type FleetTruck = z.infer<typeof fleetTruckSchema>;
