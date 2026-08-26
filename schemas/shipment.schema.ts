import { z } from "zod";

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

export const shipmentSchema = z.object({
  id: z.string(),
  reference: z.string(),
  trackingNumber: z.string(),
  status: shipmentStatusSchema,
  priority: shipmentPrioritySchema,
  loadType: loadTypeSchema,
  truckId: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Shipment = z.infer<typeof shipmentSchema>;
export type ShipmentStatus = z.infer<typeof shipmentStatusSchema>;
export type ShipmentPriority = z.infer<typeof shipmentPrioritySchema>;
export type LoadType = z.infer<typeof loadTypeSchema>;
