import { z } from "zod";

import { activeDelaySchema, dockStatusSchema, loadTypeSchema, shipmentPrioritySchema, shipmentStatusSchema, truckStatusSchema } from "./common.schema";
import { alertSchema } from "./alert.schema";
import { routeSummarySchema } from "./route.schema";

const yardShipmentSummarySchema = z.object({
  id: z.string(),
  reference: z.string(),
  trackingNumber: z.string(),
  priority: shipmentPrioritySchema,
  loadType: loadTypeSchema,
  status: shipmentStatusSchema,
});

/** activeTrucks / upcomingArrivals rows — flat latitude/longitude, not currentLatitude. */
export const yardTruckSchema = z.object({
  id: z.string(),
  reference: z.string(),
  trailerId: z.string(),
  carrier: z.string(),
  status: truckStatusSchema,
  activeDelay: activeDelaySchema,
  latitude: z.number(),
  longitude: z.number(),
  progress: z.number(),
  speedKmph: z.number(),
  eta: z.string().nullish(),
  lastUpdatedAt: z.string(),
  route: routeSummarySchema.nullish(),
  shipment: yardShipmentSummarySchema.nullish(),
  assignedDockId: z.string().nullish(),
});

export const yardAssignmentSchema = z.object({
  id: z.string(),
  status: z.string(),
  truckId: z.string(),
  truckReference: z.string(),
  shipmentReference: z.string(),
  dockDoorId: z.string(),
  dockCode: z.string(),
  score: z.number().nullish(),
  reasons: z.array(z.string()).optional(),
  scheduledStart: z.string().nullish(),
  scheduledEnd: z.string().nullish(),
  eta: z.string().nullish(),
});

export const yardDockSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  zone: z.string(),
  status: dockStatusSchema,
  supportedLoadTypes: z.array(loadTypeSchema),
  unavailableReason: z.string().nullish(),
  currentAssignment: yardAssignmentSchema.nullish(),
});

export const yardAlertSchema = alertSchema.pick({
  id: true,
  type: true,
  severity: true,
  title: true,
  message: true,
  truckId: true,
  shipmentId: true,
  dockDoorId: true,
  acknowledged: true,
  createdAt: true,
});

export const yardSummarySchema = z.object({
  activeTrucks: z.number(),
  delayedTrucks: z.number(),
  arrivingTrucks: z.number(),
  dockedTrucks: z.number(),
  docksAvailable: z.number(),
  docksUnavailable: z.number(),
  activeAssignments: z.number(),
  unresolvedAlerts: z.number(),
});

export const yardOverviewSchema = z.object({
  generatedAt: z.string(),
  summary: yardSummarySchema,
  activeTrucks: z.array(yardTruckSchema),
  upcomingArrivals: z.array(yardTruckSchema),
  docks: z.array(yardDockSchema),
  activeAssignments: z.array(yardAssignmentSchema),
  alerts: z.array(yardAlertSchema),
});

export type YardTruck = z.infer<typeof yardTruckSchema>;
export type YardDock = z.infer<typeof yardDockSchema>;
export type YardAssignment = z.infer<typeof yardAssignmentSchema>;
export type YardAlert = z.infer<typeof yardAlertSchema>;
export type YardSummary = z.infer<typeof yardSummarySchema>;
export type YardOverview = z.infer<typeof yardOverviewSchema>;
