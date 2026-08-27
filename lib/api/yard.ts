import { allocationSummarySchema, dockingQueueSchema, yardOverviewSchema } from "@/schemas/yard.schema";

import { apiGet } from "./client";
import { API_ROUTES } from "./config";

export function getYardOverview() {
  return apiGet(API_ROUTES.yardOverview, yardOverviewSchema);
}

/** "Identify the trailer that needs to be docked for each arrival window"
 * (problem statement §4) — pre-grouped, pre-sorted windows; render in the
 * order received. */
export function getDockingQueue() {
  return apiGet(API_ROUTES.yardDockingQueue, dockingQueueSchema);
}

/** The trailer-to-door allocation summary (problem statement §7 output). */
export function getAllocationSummary() {
  return apiGet(API_ROUTES.yardAllocationSummary, allocationSummarySchema);
}
