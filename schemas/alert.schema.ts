import { z } from "zod";

import { alertSeveritySchema, alertTypeSchema } from "./common.schema";

export const alertSchema = z.object({
  id: z.string(),
  type: alertTypeSchema,
  severity: alertSeveritySchema,
  title: z.string(),
  message: z.string(),
  truckId: z.string().nullable(),
  shipmentId: z.string().nullable(),
  dockDoorId: z.string().nullable(),
  metadata: z.record(z.string(), z.unknown()).nullish(),
  acknowledged: z.boolean(),
  acknowledgedAt: z.string().nullish(),
  createdAt: z.string(),
});

/**
 * The alert as embedded in a *command response* (dock status update,
 * dock-failure reassignment, delay/clear-delay, WMS event) — verified against
 * the live backend to use `alertId` (not `id`) and omit `acknowledged`/
 * `metadata`, unlike the row `GET /alerts` returns.
 */
export const alertSummarySchema = z.object({
  alertId: z.string(),
  type: alertTypeSchema,
  severity: alertSeveritySchema,
  title: z.string(),
  message: z.string(),
  truckId: z.string().nullable(),
  shipmentId: z.string().nullable(),
  dockDoorId: z.string().nullable(),
  createdAt: z.string(),
});

/** The alert as nested inside `GET /docks/:id`'s `alerts[]` — trimmed, no
 * truckId/shipmentId/dockDoorId/acknowledged/metadata (verified live). */
export const dockAlertSummarySchema = z.object({
  id: z.string(),
  type: alertTypeSchema,
  severity: alertSeveritySchema,
  title: z.string(),
  message: z.string(),
  createdAt: z.string(),
});

export type Alert = z.infer<typeof alertSchema>;
export type AlertSummary = z.infer<typeof alertSummarySchema>;
export type DockAlertSummary = z.infer<typeof dockAlertSummarySchema>;
