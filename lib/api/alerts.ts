import { alertSchema } from "@/schemas/alert.schema";
import type { AlertSeverity, AlertType } from "@/schemas/common.schema";

import { apiGetList, type QueryParams } from "./client";
import { API_ROUTES } from "./config";

export interface AlertListFilters extends QueryParams {
  type?: AlertType;
  severity?: AlertSeverity;
  /** Exact strings "true"/"false" — anything else 400s (docs/api.md). */
  acknowledged?: "true" | "false";
  truckId?: string;
  shipmentId?: string;
  dockDoorId?: string;
  limit?: number;
  offset?: number;
}

export function getAlerts(filters: AlertListFilters = {}) {
  return apiGetList(API_ROUTES.alerts, alertSchema, { query: filters });
}
