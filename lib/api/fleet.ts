import { fleetTruckSchema } from "@/schemas/fleet.schema";
import type { ActiveDelay, TruckStatus } from "@/schemas/common.schema";

import { apiGetList, type QueryParams } from "./client";
import { API_ROUTES } from "./config";

export interface FleetFilters extends QueryParams {
  status?: TruckStatus;
  activeDelay?: ActiveDelay;
  search?: string;
  limit?: number;
  offset?: number;
}

/** See docs/api.md § Fleet — backed by `GET /api/v1/fleet`. */
export function getFleet(filters: FleetFilters = {}) {
  return apiGetList(API_ROUTES.fleet, fleetTruckSchema, { query: filters });
}
