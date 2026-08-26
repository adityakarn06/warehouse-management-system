import { wmsEventResultSchema, wmsSimulateResultSchema } from "@/schemas/wms.schema";
import type { WmsEvent, WmsScenario } from "@/schemas/wms.schema";

import { apiSend } from "./client";
import { API_ROUTES } from "./config";

export function sendWmsEvent(event: WmsEvent) {
  return apiSend("POST", API_ROUTES.wmsEvents, wmsEventResultSchema, event);
}

/** Replays a fixed, deterministic sequence through the same handler as `sendWmsEvent`. */
export function runWmsSimulation(scenario?: WmsScenario) {
  return apiSend(
    "POST",
    API_ROUTES.wmsSimulate,
    wmsSimulateResultSchema,
    scenario ? { scenario } : undefined,
  );
}
