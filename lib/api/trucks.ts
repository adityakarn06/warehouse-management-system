import { truckDetailSchema, truckListItemSchema } from "@/schemas/truck.schema";
import { dockRecommendationsResponseSchema } from "@/schemas/recommendation.schema";
import type { ActiveDelay, TruckStatus } from "@/schemas/common.schema";

import { apiGet, apiGetList, type QueryParams } from "./client";
import { API_ROUTES } from "./config";

export interface TruckListFilters extends QueryParams {
  status?: TruckStatus;
  routeId?: string;
  activeDelay?: ActiveDelay;
  limit?: number;
  offset?: number;
}

export function getTrucks(filters: TruckListFilters = {}) {
  return apiGetList(API_ROUTES.trucks, truckListItemSchema, { query: filters });
}

export function getTruck(id: string) {
  return apiGet(API_ROUTES.truckById(id), truckDetailSchema);
}

/** Side-effect free — safe to call as often as needed (docs/api.md). */
export function getDockRecommendations(truckId: string) {
  return apiGet(API_ROUTES.dockRecommendations(truckId), dockRecommendationsResponseSchema);
}
