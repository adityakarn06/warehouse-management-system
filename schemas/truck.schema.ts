import { z } from "zod";

import { activeDelaySchema, loadTypeSchema, truckStatusSchema } from "./common.schema";
import { routeSchema, routeSummarySchema } from "./route.schema";
import { appointmentSchema, shipmentSummarySchema } from "./shipment.schema";

const truckListShipmentSchema = shipmentSummarySchema.pick({
  id: true,
  reference: true,
  trackingNumber: true,
  priority: true,
  loadType: true,
}).extend({
  customerName: z.string(),
});

export const truckListItemSchema = z.object({
  id: z.string(),
  reference: z.string(),
  trailerId: z.string(),
  driverName: z.string(),
  driverPhone: z.string(),
  carrier: z.string(),
  status: truckStatusSchema,
  activeDelay: activeDelaySchema,
  currentLatitude: z.number(),
  currentLongitude: z.number(),
  progress: z.number(),
  speedKmph: z.number(),
  eta: z.string().nullish(),
  departedAt: z.string().nullish(),
  arrivedAt: z.string().nullish(),
  lastUpdatedAt: z.string(),
  route: routeSummarySchema.nullish(),
  shipment: truckListShipmentSchema
    .extend({ status: z.string() })
    .nullish(),
});

export const locationHistoryEntrySchema = z.object({
  id: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  progress: z.number(),
  speedKmph: z.number(),
  status: z.string(),
  eta: z.string().nullish(),
  reason: z.string(),
  recordedAt: z.string(),
});

const truckDetailShipmentSchema = shipmentSummarySchema.extend({
  customerName: z.string(),
  appointment: appointmentSchema.nullish(),
});

const truckDockDoorSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  zone: z.string(),
  status: z.string(),
  supportedLoadTypes: z.array(loadTypeSchema),
});

export const truckDockAssignmentSchema = z.object({
  id: z.string(),
  status: z.string(),
  score: z.number().nullish(),
  reasons: z.array(z.string()).optional(),
  scheduledStart: z.string().nullish(),
  scheduledEnd: z.string().nullish(),
  assignedAt: z.string().nullish(),
  releasedAt: z.string().nullish(),
  reassignedAt: z.string().nullish(),
  dockDoor: truckDockDoorSchema,
});

export const truckDetailSchema = z.object({
  id: z.string(),
  reference: z.string(),
  trailerId: z.string(),
  driverName: z.string(),
  driverPhone: z.string(),
  carrier: z.string(),
  status: truckStatusSchema,
  activeDelay: activeDelaySchema,
  currentLatitude: z.number(),
  currentLongitude: z.number(),
  progress: z.number(),
  speedKmph: z.number(),
  eta: z.string().nullish(),
  departedAt: z.string().nullish(),
  arrivedAt: z.string().nullish(),
  lastUpdatedAt: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  route: routeSchema.nullish(),
  shipment: truckDetailShipmentSchema.nullish(),
  dockAssignments: z.array(truckDockAssignmentSchema).optional(),
  locationHistory: z.array(locationHistoryEntrySchema).optional(),
});

export type TruckListItem = z.infer<typeof truckListItemSchema>;
export type TruckDetail = z.infer<typeof truckDetailSchema>;
export type LocationHistoryEntry = z.infer<typeof locationHistoryEntrySchema>;
export type TruckDockAssignment = z.infer<typeof truckDockAssignmentSchema>;
