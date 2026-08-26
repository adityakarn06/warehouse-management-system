import { shipmentDetailSchema, shipmentListItemSchema } from "@/schemas/shipment.schema";
import type { LoadType, ShipmentPriority, ShipmentStatus } from "@/schemas/common.schema";

import { apiGet, apiGetList, type QueryParams } from "./client";
import { API_ROUTES } from "./config";

export interface ShipmentListFilters extends QueryParams {
  status?: ShipmentStatus;
  priority?: ShipmentPriority;
  loadType?: LoadType;
  limit?: number;
  offset?: number;
}

export function getShipments(filters: ShipmentListFilters = {}) {
  return apiGetList(API_ROUTES.shipments, shipmentListItemSchema, { query: filters });
}

export function getShipment(id: string) {
  return apiGet(API_ROUTES.shipmentById(id), shipmentDetailSchema);
}

export function getShipmentByReference(reference: string) {
  return apiGet(API_ROUTES.shipmentByReference(reference), shipmentDetailSchema);
}
