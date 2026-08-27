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

/**
 * What a customer may type into the lookup. `GET /api/v1/tracking/:trackingNumber`
 * takes the tracking number specifically — not the shipment reference or id
 * that `subscribe:shipment` also accepts — so this is deliberately narrow, and
 * a well-formed miss is left to the backend's 404 rather than guessed at here.
 */
export const TRACKING_NUMBER_PATTERN = /^E2-TRACK-\d+$/;

export const trackingNumberInputSchema = z
  .string()
  .trim()
  // zod v4 has no `.toUpperCase()` string method; casing is normalised in a
  // transform so `e2-track-101` reaches the API — and the URL — canonically.
  .transform((value) => value.toUpperCase())
  .refine((value) => TRACKING_NUMBER_PATTERN.test(value), {
    message: "Enter a tracking number like E2-TRACK-101.",
  });
