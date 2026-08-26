import { z } from "zod";

import { alertSummarySchema } from "./alert.schema";

const yardLocationSchema = z.object({ lat: z.number(), lng: z.number() });

const baseEventFieldsSchema = z.object({ occurredAt: z.string().optional() });

export const trailerLocationUpdatedSchema = baseEventFieldsSchema.extend({
  eventType: z.literal("TRAILER_LOCATION_UPDATED"),
  trailerId: z.string(),
  yardLocation: yardLocationSchema,
  progress: z.number().optional(),
  speedKmph: z.number().optional(),
});

export const trailerStatusUpdatedSchema = baseEventFieldsSchema.extend({
  eventType: z.literal("TRAILER_STATUS_UPDATED"),
  trailerId: z.string(),
  status: z.string(),
  eta: z.string().optional(),
  yardLocation: yardLocationSchema.optional(),
});

export const trailerArrivedSchema = baseEventFieldsSchema.extend({
  eventType: z.literal("TRAILER_ARRIVED"),
  trailerId: z.string(),
  yardLocation: yardLocationSchema.optional(),
});

export const trailerDockedSchema = baseEventFieldsSchema.extend({
  eventType: z.literal("TRAILER_DOCKED"),
  trailerId: z.string(),
  dockCode: z.string(),
});

export const dockStatusUpdatedEventSchema = baseEventFieldsSchema.extend({
  eventType: z.literal("DOCK_STATUS_UPDATED"),
  dockCode: z.string(),
  status: z.string(),
  reason: z.string().optional(),
});

export const appointmentUpdatedEventSchema = baseEventFieldsSchema.extend({
  eventType: z.literal("APPOINTMENT_UPDATED"),
  appointmentReference: z.string(),
  windowStart: z.string().optional(),
  windowEnd: z.string().optional(),
  expectedDurationMinutes: z.number().optional(),
  notes: z.string().optional(),
});

/** POST /wms/events request body — discriminated on eventType, per docs/api.md §WMS. */
export const wmsEventSchema = z.discriminatedUnion("eventType", [
  trailerLocationUpdatedSchema,
  trailerStatusUpdatedSchema,
  trailerArrivedSchema,
  trailerDockedSchema,
  dockStatusUpdatedEventSchema,
  appointmentUpdatedEventSchema,
]);

export const wmsEventResultSchema = z.object({
  eventType: z.string(),
  applied: z.boolean(),
  truckId: z.string().nullish(),
  dockDoorId: z.string().nullish(),
  effects: z.array(z.string()),
  emitted: z.array(z.string()),
  alert: alertSummarySchema.nullish(),
});

export const wmsScenarioSchema = z.enum([
  "TRAILER_ARRIVAL",
  "DOCK_OCCUPANCY",
  "APPOINTMENT_SHIFT",
]);

const wmsSimulateStepSchema = z.object({
  eventType: z.string(),
  ok: z.boolean(),
  result: wmsEventResultSchema.nullish(),
  error: z.string().nullish(),
});

export const wmsSimulateResultSchema = z.object({
  scenario: z.string(),
  steps: z.array(wmsSimulateStepSchema),
});

export type WmsEvent = z.infer<typeof wmsEventSchema>;
export type WmsEventResult = z.infer<typeof wmsEventResultSchema>;
export type WmsScenario = z.infer<typeof wmsScenarioSchema>;
export type WmsSimulateResult = z.infer<typeof wmsSimulateResultSchema>;
