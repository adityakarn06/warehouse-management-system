import { z } from "zod";

export const alertTypeSchema = z.enum([
  "TRUCK_DELAYED",
  "DOCK_UNAVAILABLE",
  "DOCK_REASSIGNMENT",
  "NO_DOCK_AVAILABLE",
  "TRUCK_ARRIVING",
]);

export const alertSeveritySchema = z.enum(["INFO", "WARNING", "CRITICAL"]);

export const alertSchema = z.object({
  id: z.string(),
  type: alertTypeSchema,
  severity: alertSeveritySchema,
  title: z.string(),
  message: z.string(),
  truckId: z.string().nullable(),
  shipmentId: z.string().nullable(),
  dockDoorId: z.string().nullable(),
  acknowledged: z.boolean(),
  createdAt: z.string(),
});

export type Alert = z.infer<typeof alertSchema>;
export type AlertType = z.infer<typeof alertTypeSchema>;
export type AlertSeverity = z.infer<typeof alertSeveritySchema>;
