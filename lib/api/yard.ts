import { yardOverviewSchema } from "@/schemas/yard.schema";

import { apiGet } from "./client";
import { API_ROUTES } from "./config";

export function getYardOverview() {
  return apiGet(API_ROUTES.yardOverview, yardOverviewSchema);
}
