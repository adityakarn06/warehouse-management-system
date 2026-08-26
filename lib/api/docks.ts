import {
  dockDetailSchema,
  dockListItemSchema,
  dockReleaseResultSchema,
  dockStatusUpdateResultSchema,
} from "@/schemas/dock.schema";
import type { DockStatus, LoadType } from "@/schemas/common.schema";

import { apiGet, apiGetList, apiSend, type QueryParams } from "./client";
import { API_ROUTES } from "./config";

export interface DockListFilters extends QueryParams {
  status?: DockStatus;
  zone?: string;
  loadType?: LoadType;
  limit?: number;
  offset?: number;
}

export function getDocks(filters: DockListFilters = {}) {
  return apiGetList(API_ROUTES.docks, dockListItemSchema, { query: filters });
}

export function getDock(id: string) {
  return apiGet(API_ROUTES.dockById(id), dockDetailSchema);
}

export interface UpdateDockStatusBody {
  status: "AVAILABLE" | "UNAVAILABLE";
  reason?: string;
}

/** The operator's "make unavailable" / "make available" buttons — the backend
 * owns every consequence, including the failure cascade (docs/api.md §8). */
export function updateDockStatus(id: string, body: UpdateDockStatusBody) {
  return apiSend("PATCH", API_ROUTES.dockStatus(id), dockStatusUpdateResultSchema, body);
}

/** Hands a door back to the yard; every committed assignment on it completes. */
export function releaseDock(id: string) {
  return apiSend("POST", API_ROUTES.dockRelease(id), dockReleaseResultSchema);
}
