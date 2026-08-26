import { dockAssignmentListItemSchema } from "@/schemas/assignment.schema";
import { dockAssignmentResultSchema } from "@/schemas/recommendation.schema";
import type { DockAssignmentStatus } from "@/schemas/common.schema";

import { apiGetList, apiSend, type QueryParams } from "./client";
import { API_ROUTES } from "./config";

export interface DockAssignmentListFilters extends QueryParams {
  status?: DockAssignmentStatus;
  truckId?: string;
  dockDoorId?: string;
  shipmentId?: string;
  limit?: number;
  offset?: number;
}

export function getDockAssignments(filters: DockAssignmentListFilters = {}) {
  return apiGetList(API_ROUTES.dockAssignments, dockAssignmentListItemSchema, { query: filters });
}

export interface AssignDockBody {
  dockId?: string;
}

/** Omitting `dockId` (or the body entirely) commits the top-ranked recommendation
 * — nothing is auto-assigned; a truck only gets a dock when asked (docs/api.md §9). */
export function assignDock(truckId: string, body: AssignDockBody = {}) {
  const hasBody = body.dockId !== undefined;
  return apiSend(
    "POST",
    API_ROUTES.dockAssignment(truckId),
    dockAssignmentResultSchema,
    hasBody ? body : undefined,
  );
}
