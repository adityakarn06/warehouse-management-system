import { delayResultSchema, simulationLifecycleSchema, simulationTruckSchema } from "@/schemas/simulation.schema";
import type { DelayScenario } from "@/schemas/common.schema";

import { apiGet, apiGetList, apiSend } from "./client";
import { API_ROUTES } from "./config";

export function startSimulation() {
  return apiSend("POST", API_ROUTES.simulationStart, simulationLifecycleSchema);
}

export function stopSimulation() {
  return apiSend("POST", API_ROUTES.simulationStop, simulationLifecycleSchema);
}

/** Reloads the world from the database; keeps the loop's running/stopped state. */
export function resetSimulation() {
  return apiSend("POST", API_ROUTES.simulationReset, simulationLifecycleSchema);
}

export function getSimulationState() {
  return apiGetList(API_ROUTES.simulationState, simulationTruckSchema);
}

/** 404s if the truck isn't currently simulated (terminal status, or the loop stopped). */
export function getSimulationTruck(truckId: string) {
  return apiGet(API_ROUTES.simulationTruck(truckId), simulationTruckSchema);
}

/** `type` must be RAIN, TRAFFIC or ROAD_CLOSURE — NORMAL is rejected (clearing is its own endpoint). */
export function delayTruck(truckId: string, type: DelayScenario) {
  return apiSend("POST", API_ROUTES.simulationTruckDelay(truckId), delayResultSchema, { type });
}

/** Returns `alert: null` — clearing raises no alert (docs/api.md). */
export function clearTruckDelay(truckId: string) {
  return apiSend("POST", API_ROUTES.simulationTruckClearDelay(truckId), delayResultSchema);
}
