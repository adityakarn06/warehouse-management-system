import { z } from "zod";

import { activeDelaySchema, truckStatusSchema } from "./common.schema";
import { alertSummarySchema } from "./alert.schema";

/** Response of /simulation/start, /stop and /reset. */
export const simulationLifecycleSchema = z.object({
  running: z.boolean(),
  truckCount: z.number(),
  tickMs: z.number(),
  lastTickAt: z.string().nullish(),
  lastTickError: z.string().nullish(),
});

/** GET /simulation/state item and GET /simulation/trucks/:truckId — same shape. */
export const simulationTruckSchema = z.object({
  truckId: z.string(),
  reference: z.string(),
  routeId: z.string().nullish(),
  shipmentId: z.string().nullish(),
  latitude: z.number(),
  longitude: z.number(),
  previousLatitude: z.number().nullish(),
  previousLongitude: z.number().nullish(),
  progress: z.number(),
  speedKmph: z.number(),
  baseSpeedKmph: z.number(),
  eta: z.string().nullish(),
  status: truckStatusSchema,
  activeDelay: activeDelaySchema,
  delayMultiplier: z.number(),
  arrivedAt: z.string().nullish(),
  lastUpdatedAt: z.string(),
  sequenceNumber: z.number(),
});

const delayResultTruckSchema = z.object({
  truckId: z.string(),
  reference: z.string(),
  progress: z.number(),
  speedKmph: z.number(),
  baseSpeedKmph: z.number(),
  eta: z.string().nullish(),
  status: truckStatusSchema,
  activeDelay: activeDelaySchema,
  delayMultiplier: z.number(),
  sequenceNumber: z.number(),
});

/** POST .../delay and .../clear-delay — clearing returns `alert: null`. */
export const delayResultSchema = z.object({
  truck: delayResultTruckSchema,
  alert: alertSummarySchema.nullable(),
});

export type SimulationLifecycle = z.infer<typeof simulationLifecycleSchema>;
export type SimulationTruck = z.infer<typeof simulationTruckSchema>;
export type DelayResult = z.infer<typeof delayResultSchema>;
