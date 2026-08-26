import { z } from "zod";

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

export const dockSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  zone: z.string(),
  status: dockStatusSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const dockAssignmentSchema = z.object({
  id: z.string(),
  truckId: z.string(),
  shipmentId: z.string(),
  dockDoorId: z.string(),
  status: dockAssignmentStatusSchema,
  score: z.number().nullable(),
  reasons: z.array(z.string()).optional(),
  scheduledStart: z.string().nullable(),
  scheduledEnd: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Dock = z.infer<typeof dockSchema>;
export type DockStatus = z.infer<typeof dockStatusSchema>;
export type DockAssignment = z.infer<typeof dockAssignmentSchema>;
export type DockAssignmentStatus = z.infer<typeof dockAssignmentStatusSchema>;
