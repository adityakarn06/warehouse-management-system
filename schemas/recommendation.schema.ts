import { z } from "zod";

import { dockStatusSchema, shipmentPrioritySchema, truckStatusSchema } from "./common.schema";
import { appointmentSchema } from "./shipment.schema";

/**
 * docs/api.md's dock-recommendations example (line ~310) omits `id` on the
 * embedded appointment, even though the live backend has consistently
 * included it in testing — tolerate either so a doc-accurate response never
 * fails validation.
 */
const recommendationAppointmentSchema = appointmentSchema.partial({ id: true });

export const dockRecommendationSchema = z.object({
  dockId: z.string(),
  dockCode: z.string(),
  dockName: z.string(),
  zone: z.string(),
  status: dockStatusSchema,
  score: z.number(),
  reasons: z.array(z.string()),
  breakdown: z.object({
    loadTypeFit: z.number(),
    availabilityFit: z.number(),
    appointmentFit: z.number(),
    priorityFit: z.number(),
    statusBonus: z.number(),
  }),
  availableFrom: z.string().nullish(),
});

export const excludedDockSchema = z.object({
  dockId: z.string(),
  dockCode: z.string(),
  reason: z.string(),
});

const recommendationTruckSchema = z.object({
  id: z.string(),
  reference: z.string(),
  status: truckStatusSchema,
  eta: z.string().nullish(),
  progress: z.number(),
});

const recommendationShipmentSchema = z.object({
  id: z.string(),
  reference: z.string(),
  priority: shipmentPrioritySchema,
  loadType: z.string(),
});

const currentAssignmentSchema = z.object({
  id: z.string(),
  dockDoorId: z.string(),
  dockCode: z.string(),
  status: z.string(),
});

export const dockRecommendationsResponseSchema = z.object({
  truck: recommendationTruckSchema,
  shipment: recommendationShipmentSchema,
  appointment: recommendationAppointmentSchema.nullish(),
  requestedWindow: z.object({
    start: z.string(),
    end: z.string(),
    minutes: z.number(),
  }),
  currentAssignment: currentAssignmentSchema.nullish(),
  recommendations: z.array(dockRecommendationSchema),
  excluded: z.array(excludedDockSchema),
});

const assignmentSchema = z.object({
  id: z.string(),
  truckId: z.string(),
  shipmentId: z.string(),
  dockDoorId: z.string(),
  status: z.string(),
  score: z.number().nullish(),
  reasons: z.array(z.string()).optional(),
  scheduledStart: z.string().nullish(),
  scheduledEnd: z.string().nullish(),
});

/** POST /trucks/:truckId/dock-assignment response. */
export const dockAssignmentResultSchema = dockRecommendationsResponseSchema.extend({
  created: z.boolean(),
  assignment: assignmentSchema,
  previousAssignment: assignmentSchema.nullish(),
});

export type DockRecommendation = z.infer<typeof dockRecommendationSchema>;
export type ExcludedDock = z.infer<typeof excludedDockSchema>;
export type DockRecommendationsResponse = z.infer<typeof dockRecommendationsResponseSchema>;
export type DockAssignmentResult = z.infer<typeof dockAssignmentResultSchema>;
