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

export const locationHistorySchema = z.object({
  id: z.string(),
  truckId: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  progress: z.number(),
  recordedAt: z.string(),
});

export const truckSchema = z.object({
  id: z.string(),
  reference: z.string(),
  status: truckStatusSchema,
  activeDelay: activeDelaySchema,
  shipmentId: z.string().nullable(),
  routeId: z.string().nullable(),
  latitude: z.number(),
  longitude: z.number(),
  progress: z.number(),
  speedKmph: z.number(),
  eta: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Truck = z.infer<typeof truckSchema>;
export type TruckStatus = z.infer<typeof truckStatusSchema>;
export type ActiveDelay = z.infer<typeof activeDelaySchema>;
export type LocationHistory = z.infer<typeof locationHistorySchema>;
