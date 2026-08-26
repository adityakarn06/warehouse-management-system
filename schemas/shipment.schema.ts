import { z } from "zod";

import { loadTypeSchema, shipmentPrioritySchema, shipmentStatusSchema } from "./common.schema";
import { routeSchema } from "./route.schema";

/** Nested inside a truck row — never the reverse (avoids a schema cycle). */
export const shipmentSummarySchema = z.object({
  id: z.string(),
  reference: z.string(),
  trackingNumber: z.string(),
  status: shipmentStatusSchema,
  priority: shipmentPrioritySchema,
  loadType: loadTypeSchema,
});

export const appointmentSchema = z.object({
  id: z.string(),
  reference: z.string(),
  windowStart: z.string(),
  windowEnd: z.string(),
  expectedDurationMinutes: z.number(),
  notes: z.string().nullish(),
});

/** The appointment as it appears on a shipment list row / tracking response — no id/reference. */
export const appointmentWindowSchema = z.object({
  windowStart: z.string(),
  windowEnd: z.string(),
  expectedDurationMinutes: z.number(),
});

/** Trimmed truck as nested inside a shipment list row. */
export const shipmentTruckSummarySchema = z.object({
  id: z.string(),
  reference: z.string(),
  trailerId: z.string(),
  status: z.string(),
  progress: z.number(),
  eta: z.string().nullish(),
});

export const shipmentListItemSchema = z.object({
  id: z.string(),
  reference: z.string(),
  trackingNumber: z.string(),
  customerName: z.string(),
  originName: z.string(),
  destinationName: z.string(),
  status: shipmentStatusSchema,
  priority: shipmentPrioritySchema,
  loadType: loadTypeSchema,
  weightKg: z.number(),
  palletCount: z.number(),
  truck: shipmentTruckSummarySchema.nullish(),
  appointment: appointmentWindowSchema.nullish(),
});

const dockDoorSummarySchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  zone: z.string(),
  status: z.string(),
  supportedLoadTypes: z.array(loadTypeSchema),
});

const shipmentDockAssignmentSchema = z.object({
  id: z.string(),
  status: z.string(),
  score: z.number().nullish(),
  reasons: z.array(z.string()).optional(),
  scheduledStart: z.string().nullish(),
  scheduledEnd: z.string().nullish(),
  assignedAt: z.string().nullish(),
  dockDoor: dockDoorSummarySchema,
});

/** Full truck row as nested inside a shipment detail (no dockAssignments/locationHistory). */
const shipmentDetailTruckSchema = z.object({
  id: z.string(),
  reference: z.string(),
  trailerId: z.string(),
  driverName: z.string(),
  driverPhone: z.string(),
  carrier: z.string(),
  status: z.string(),
  activeDelay: z.string(),
  currentLatitude: z.number(),
  currentLongitude: z.number(),
  progress: z.number(),
  speedKmph: z.number(),
  eta: z.string().nullish(),
  departedAt: z.string().nullish(),
  arrivedAt: z.string().nullish(),
  lastUpdatedAt: z.string(),
  route: routeSchema.nullish(),
});

export const shipmentDetailSchema = z.object({
  id: z.string(),
  reference: z.string(),
  trackingNumber: z.string(),
  customerName: z.string(),
  originName: z.string(),
  destinationName: z.string(),
  status: shipmentStatusSchema,
  priority: shipmentPrioritySchema,
  loadType: loadTypeSchema,
  weightKg: z.number(),
  palletCount: z.number(),
  description: z.string().nullish(),
  createdAt: z.string(),
  updatedAt: z.string(),
  truck: shipmentDetailTruckSchema.nullish(),
  appointment: appointmentSchema.nullish(),
  dockAssignments: z.array(shipmentDockAssignmentSchema).optional(),
});

export type ShipmentSummary = z.infer<typeof shipmentSummarySchema>;
export type Appointment = z.infer<typeof appointmentSchema>;
export type AppointmentWindow = z.infer<typeof appointmentWindowSchema>;
export type ShipmentListItem = z.infer<typeof shipmentListItemSchema>;
export type ShipmentDetail = z.infer<typeof shipmentDetailSchema>;
