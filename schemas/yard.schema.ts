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

/**
 * `GET /yard/docking-queue` — "identify the trailer that needs to be docked
 * for each arrival window" (problem statement §4). Windows arrive pre-grouped
 * and pre-sorted (window, then priority, then ETA); rendered in the order
 * received, never re-sorted here.
 *
 * `windowStart`/`windowEnd` are both null for the `UNSCHEDULED` bucket.
 * `topRecommendation` is null both when the scorer excludes every door and,
 * defensively, when scoring that one truck failed — the payload does not
 * distinguish the two, so neither cause may be claimed on the frontend.
 */
const dockingQueueTopRecommendationSchema = z.object({
  dockId: z.string(),
  dockCode: z.string(),
  score: z.number(),
  reasons: z.array(z.string()),
});

const dockingQueueEntrySchema = z.object({
  truckId: z.string(),
  truckReference: z.string(),
  trailerId: z.string(),
  status: truckStatusSchema,
  eta: z.string().nullish(),
  progress: z.number(),
  shipmentReference: z.string(),
  priority: shipmentPrioritySchema,
  loadType: loadTypeSchema,
  topRecommendation: dockingQueueTopRecommendationSchema.nullable(),
});

const dockingQueueWindowSchema = z
  .object({
    windowStart: z.string().nullable(),
    windowEnd: z.string().nullable(),
    entries: z.array(dockingQueueEntrySchema),
  })
  .refine(
    (w) => (w.windowStart === null) === (w.windowEnd === null),
    { message: "windowStart and windowEnd must both be present or both be null" },
  );

export const dockingQueueSchema = z.object({
  generatedAt: z.string(),
  horizonMinutes: z.number(),
  windows: z.array(dockingQueueWindowSchema),
});

export type DockingQueueTopRecommendation = z.infer<typeof dockingQueueTopRecommendationSchema>;
export type DockingQueueEntry = z.infer<typeof dockingQueueEntrySchema>;
export type DockingQueueWindow = z.infer<typeof dockingQueueWindowSchema>;
export type DockingQueue = z.infer<typeof dockingQueueSchema>;

/**
 * `GET /yard/allocation-summary` — the trailer-to-door allocation summary
 * (problem statement §7 output). Committed (`ASSIGNED`) assignments only,
 * plus every active truck holding none. `chainedFrom` is set only when the
 * truck arrived at its door through the §10 reassignment chain.
 *
 * `docksByStatus` is keyed by `DockStatus`; a status with no doors in it may
 * be absent from the object entirely, so a reader must default a missing key
 * to 0 rather than assume all four are present.
 */
const allocationSummaryTotalsSchema = z.object({
  allocatedTrailers: z.number(),
  unallocatedTrailers: z.number(),
  docksByStatus: z.partialRecord(dockStatusSchema, z.number()),
});

const allocationEntrySchema = z.object({
  assignmentId: z.string(),
  status: z.literal("ASSIGNED"),
  trailerId: z.string(),
  truckId: z.string(),
  truckReference: z.string(),
  shipmentReference: z.string(),
  priority: shipmentPrioritySchema,
  loadType: loadTypeSchema,
  dockId: z.string(),
  dockCode: z.string(),
  zone: z.string(),
  scheduledStart: z.string().nullish(),
  scheduledEnd: z.string().nullish(),
  chainedFrom: z.string().nullable(),
});

const unallocatedTruckSchema = z.object({
  truckId: z.string(),
  truckReference: z.string(),
  trailerId: z.string(),
  status: truckStatusSchema,
  shipmentReference: z.string(),
  priority: shipmentPrioritySchema,
});

export const allocationSummarySchema = z.object({
  generatedAt: z.string(),
  totals: allocationSummaryTotalsSchema,
  allocations: z.array(allocationEntrySchema),
  unallocated: z.array(unallocatedTruckSchema),
});

export type AllocationSummaryTotals = z.infer<typeof allocationSummaryTotalsSchema>;
export type AllocationEntry = z.infer<typeof allocationEntrySchema>;
export type UnallocatedTruck = z.infer<typeof unallocatedTruckSchema>;
export type AllocationSummary = z.infer<typeof allocationSummarySchema>;
