import { z } from "zod";

import { activeDelaySchema, loadTypeSchema, shipmentPrioritySchema, shipmentStatusSchema, truckStatusSchema } from "./common.schema";

const trackingPlaceSchema = z.object({
  name: z.string(),
  latitude: z.number(),
  longitude: z.number(),
});

const trackingPositionSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
  lastUpdatedAt: z.string(),
});

const trackingAppointmentWindowSchema = z.object({
  start: z.string(),
  end: z.string(),
  expectedDurationMinutes: z.number(),
});

/** Only reflects a committed (ASSIGNED) assignment — never a recommendation. */
const trackingAssignedDockSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  zone: z.string(),
  status: z.string(),
  assignmentStatus: z.string(),
  scheduledStart: z.string().nullish(),
  scheduledEnd: z.string().nullish(),
});

export const trackingResultSchema = z.object({
  reference: z.string(),
  trackingNumber: z.string(),
  trailerId: z.string(),
  customerName: z.string(),
  status: shipmentStatusSchema,
  truckStatus: truckStatusSchema,
  activeDelay: activeDelaySchema,
  origin: trackingPlaceSchema,
  destination: trackingPlaceSchema,
  currentPosition: trackingPositionSchema.nullish(),
  eta: z.string().nullish(),
  progress: z.number(),
  priority: shipmentPrioritySchema,
  loadType: loadTypeSchema,
  appointmentWindow: trackingAppointmentWindowSchema.nullish(),
  assignedDock: trackingAssignedDockSchema.nullish(),
});

export type TrackingResult = z.infer<typeof trackingResultSchema>;
