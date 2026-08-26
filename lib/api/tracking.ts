import { trackingResultSchema } from "@/schemas/tracking.schema";

import { apiGet } from "./client";
import { API_ROUTES } from "./config";

export function getTracking(trackingNumber: string) {
  return apiGet(API_ROUTES.tracking(trackingNumber), trackingResultSchema);
}
