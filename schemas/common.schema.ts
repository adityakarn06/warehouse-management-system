import { z } from "zod";

export const truckStatusSchema = z.enum([
  "IN_TRANSIT",
  "DELAYED",
  "ARRIVING",
  "ARRIVED",
  "DOCKED",
  "COMPLETED",
]);

export const activeDelaySchema = z.enum([
  "NORMAL",
  "RAIN",
  "TRAFFIC",
  "ROAD_CLOSURE",
]);

// Scenario name accepted by POST /simulation/trucks/:truckId/delay — NORMAL
// is rejected there (clearing is its own endpoint), so it is excluded here.
export const delayScenarioSchema = z.enum(["RAIN", "TRAFFIC", "ROAD_CLOSURE"]);

export const shipmentStatusSchema = z.enum([
  "CREATED",
  "IN_TRANSIT",
  "DELAYED",
  "ARRIVING",
  "ARRIVED",
  "DOCKED",
  "DELIVERED",
]);

export const shipmentPrioritySchema = z.enum([
  "LOW",
  "MEDIUM",
  "HIGH",
  "CRITICAL",
]);

export const loadTypeSchema = z.enum([
  "GENERAL",
  "REFRIGERATED",
  "HAZARDOUS",
  "OVERSIZED",
]);

export const dockStatusSchema = z.enum([
  "AVAILABLE",
  "RESERVED",
  "OCCUPIED",
  "UNAVAILABLE",
]);

export const dockAssignmentStatusSchema = z.enum([
  "RECOMMENDED",
  "ASSIGNED",
  "REASSIGNED",
  "COMPLETED",
  "CANCELLED",
]);

export const alertTypeSchema = z.enum([
  "TRUCK_DELAYED",
  "DOCK_UNAVAILABLE",
  "DOCK_REASSIGNMENT",
  "NO_DOCK_AVAILABLE",
  "TRUCK_ARRIVING",
]);

export const alertSeveritySchema = z.enum(["INFO", "WARNING", "CRITICAL"]);

export const latLngSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
});

export const paginationMetaSchema = z.object({
  total: z.number(),
  limit: z.number(),
  offset: z.number(),
});

export type TruckStatus = z.infer<typeof truckStatusSchema>;
export type ActiveDelay = z.infer<typeof activeDelaySchema>;
export type DelayScenario = z.infer<typeof delayScenarioSchema>;
export type ShipmentStatus = z.infer<typeof shipmentStatusSchema>;
export type ShipmentPriority = z.infer<typeof shipmentPrioritySchema>;
export type LoadType = z.infer<typeof loadTypeSchema>;
export type DockStatus = z.infer<typeof dockStatusSchema>;
export type DockAssignmentStatus = z.infer<typeof dockAssignmentStatusSchema>;
export type AlertType = z.infer<typeof alertTypeSchema>;
export type AlertSeverity = z.infer<typeof alertSeveritySchema>;
export type LatLng = z.infer<typeof latLngSchema>;
export type PaginationMeta = z.infer<typeof paginationMetaSchema>;
