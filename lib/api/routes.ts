import { routeDetailSchema } from "@/schemas/route.schema";

import { apiGet } from "./client";
import { API_ROUTES } from "./config";

/** Includes `geometry` — the only endpoint that does (docs/api.md "Route geometry"). */
export function getRoute(id: string) {
  return apiGet(API_ROUTES.routeById(id), routeDetailSchema);
}
