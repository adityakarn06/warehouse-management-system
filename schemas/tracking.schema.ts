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

/** Which of the four lookup arms `GET /tracking/:id` matched on, in the order
 * it tries them. */
export const trackingResolvedBySchema = z.enum([
  "TRACKING_NUMBER",
  "SHIPMENT_REFERENCE",
  "SHIPMENT_ID",
  "TRAILER_ID",
]);

export type TrackingResolvedBy = z.infer<typeof trackingResolvedBySchema>;

export const trackingResultSchema = z.object({
  reference: z.string(),
  trackingNumber: z.string(),
  trailerId: z.string(),
  resolvedBy: trackingResolvedBySchema,
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
 * What a customer may type into the lookup. `GET /api/v1/tracking/:id` tries
 * four identifiers in order — tracking number, shipment reference, shipment
 * id, trailer id — and reports which one matched via `resolvedBy`, so this
 * schema only enforces "non-empty"; which well-formed string actually exists
 * is entirely the backend's answer (a 404 otherwise), never guessed at here.
 *
 * A human reference (`E2-TRACK-101`, `SHP-1001`, `TRL-101`) is hyphenated and
 * conventionally upper-case, so casing is normalised for that shape only. A
 * runtime shipment id is a lower/mixed-case `cuid()` with no hyphen —
 * uppercasing it would corrupt the id, so it is passed through untouched.
 */
const HYPHENATED_REFERENCE_PATTERN = /^[A-Za-z0-9]+(?:-[A-Za-z0-9]+)+$/;

export const trackingIdentifierInputSchema = z
  .string()
  .trim()
  .min(1, { message: "Enter a tracking number, shipment reference, shipment ID or trailer ID." })
  .transform((value) => (HYPHENATED_REFERENCE_PATTERN.test(value) ? value.toUpperCase() : value));
