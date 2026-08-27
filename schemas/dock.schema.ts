import { z } from "zod";

import { dockStatusSchema, loadTypeSchema, shipmentPrioritySchema } from "./common.schema";
import { alertSummarySchema, dockAlertSummarySchema } from "./alert.schema";

const dockAssignmentTruckSchema = z.object({
  id: z.string(),
  reference: z.string(),
  trailerId: z.string(),
  status: z.string(),
  eta: z.string().nullish(),
});

const dockAssignmentTruckDetailSchema = dockAssignmentTruckSchema.extend({
  carrier: z.string(),
  activeDelay: z.string(),
  currentLatitude: z.number(),
  currentLongitude: z.number(),
  progress: z.number(),
  speedKmph: z.number(),
  lastUpdatedAt: z.string(),
});

const dockAssignmentShipmentSchema = z.object({
  id: z.string(),
  reference: z.string(),
  priority: z.string(),
  loadType: loadTypeSchema,
});

/** Nested inside a dock list row — the ASSIGNED assignment only (docs/api.md). */
export const dockCurrentAssignmentSchema = z.object({
  id: z.string(),
  status: z.string(),
  score: z.number().nullish(),
  reasons: z.array(z.string()).optional(),
  scheduledStart: z.string().nullish(),
  scheduledEnd: z.string().nullish(),
  assignedAt: z.string().nullish(),
  truck: dockAssignmentTruckSchema,
  shipment: dockAssignmentShipmentSchema,
});

/** Nested inside a dock detail row — full history, richer truck. */
export const dockDetailAssignmentSchema = dockCurrentAssignmentSchema.extend({
  releasedAt: z.string().nullish(),
  reassignedAt: z.string().nullish(),
  truck: dockAssignmentTruckDetailSchema,
});

export const dockListItemSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  zone: z.string(),
  status: dockStatusSchema,
  supportedLoadTypes: z.array(loadTypeSchema),
  latitude: z.number(),
  longitude: z.number(),
  availableFrom: z.string().nullish(),
  unavailableReason: z.string().nullish(),
  assignments: z.array(dockCurrentAssignmentSchema).optional(),
});

export const dockDetailSchema = dockListItemSchema.extend({
  createdAt: z.string(),
  updatedAt: z.string(),
  assignments: z.array(dockDetailAssignmentSchema).optional(),
  alerts: z.array(dockAlertSummarySchema).optional(),
});

/** Response to PATCH /docks/:id/status. */
const affectedAssignmentSchema = z.object({
  id: z.string(),
  scheduledStart: z.string().nullish(),
  scheduledEnd: z.string().nullish(),
  shipmentId: z.string(),
  truck: z.object({
    id: z.string(),
    reference: z.string(),
    status: z.string(),
    eta: z.string().nullish(),
  }),
});

/** One entry in `reassignments[]`; fields vary by `outcome` (docs/api.md §Notes). */
const reassignmentSchema = z.object({
  truckId: z.string(),
  truckReference: z.string(),
  shipmentId: z.string(),
  outcome: z.enum(["REASSIGNED", "NO_DOCK_AVAILABLE", "REASSIGNMENT_FAILED"]),
  previousAssignmentId: z.string().nullish(),
  previousDockDoorId: z.string().nullish(),
  previousDockCode: z.string().nullish(),
  newAssignmentId: z.string().nullish(),
  newDockDoorId: z.string().nullish(),
  newDockCode: z.string().nullish(),
  score: z.number().nullish(),
  reasons: z.array(z.string()).optional(),
  alert: alertSummarySchema.nullish(),
});

export const dockStatusUpdateResultSchema = z.object({
  dock: dockDetailSchema,
  changed: z.boolean(),
  affectedAssignments: z.array(affectedAssignmentSchema).optional(),
  alert: alertSummarySchema.nullish(),
  reassignments: z.array(reassignmentSchema).optional(),
});

export const dockReleaseResultSchema = z.object({
  dockDoorId: z.string(),
  dockCode: z.string(),
  status: dockStatusSchema,
  releasedAssignmentIds: z.array(z.string()),
});

/**
 * `GET /docks/schedule` — a forward-looking timeline per door, distinct from
 * `GET /docks/:id`'s recency-ordered history for one door. `status` here is
 * `RECOMMENDED` or `ASSIGNED` (never `REASSIGNED`/`COMPLETED`/`CANCELLED`,
 * which do not belong on a forward schedule), reused as the same string union
 * `dockAssignmentStatusSchema` models elsewhere.
 *
 * `scheduledStart`/`scheduledEnd` are nullish: the backend always includes an
 * assignment with no window regardless of the `from`/`to` bound, on the
 * reasoning that "no window does not mean no booking" — the frontend must not
 * drop these rows just because they cannot be placed on a time axis.
 */
const dockScheduleAssignmentSchema = z.object({
  id: z.string(),
  status: z.enum(["RECOMMENDED", "ASSIGNED"]),
  truckId: z.string(),
  truckReference: z.string(),
  trailerId: z.string(),
  shipmentReference: z.string(),
  priority: shipmentPrioritySchema,
  loadType: loadTypeSchema,
  score: z.number().nullish(),
  reasons: z.array(z.string()).optional(),
  scheduledStart: z.string().nullish(),
  scheduledEnd: z.string().nullish(),
});

const dockScheduleDoorSchema = z.object({
  dockId: z.string(),
  dockCode: z.string(),
  dockName: z.string(),
  zone: z.string(),
  status: dockStatusSchema,
  assignments: z.array(dockScheduleAssignmentSchema),
});

export const dockScheduleSchema = z.object({
  generatedAt: z.string(),
  from: z.string(),
  to: z.string(),
  includeRecommended: z.boolean(),
  docks: z.array(dockScheduleDoorSchema),
});

export type DockScheduleAssignment = z.infer<typeof dockScheduleAssignmentSchema>;
export type DockScheduleDoor = z.infer<typeof dockScheduleDoorSchema>;
export type DockSchedule = z.infer<typeof dockScheduleSchema>;

export type DockListItem = z.infer<typeof dockListItemSchema>;
export type DockDetail = z.infer<typeof dockDetailSchema>;
export type DockStatusUpdateResult = z.infer<typeof dockStatusUpdateResultSchema>;
export type DockReleaseResult = z.infer<typeof dockReleaseResultSchema>;
export type Reassignment = z.infer<typeof reassignmentSchema>;
