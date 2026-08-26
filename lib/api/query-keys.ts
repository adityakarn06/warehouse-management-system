import type { QueryParams } from "./client";

/** Central TanStack Query key factory — every hook reads its keys from here so
 * mutations can invalidate by domain without guessing another file's shape. */
export const queryKeys = {
  trucks: {
    all: ["trucks"] as const,
    list: (filters?: QueryParams) => ["trucks", "list", filters ?? {}] as const,
    detail: (id: string) => ["trucks", "detail", id] as const,
    dockRecommendations: (truckId: string) => ["trucks", "dock-recommendations", truckId] as const,
  },
  shipments: {
    all: ["shipments"] as const,
    list: (filters?: QueryParams) => ["shipments", "list", filters ?? {}] as const,
    detail: (id: string) => ["shipments", "detail", id] as const,
    byReference: (reference: string) => ["shipments", "reference", reference] as const,
  },
  tracking: {
    detail: (trackingNumber: string) => ["tracking", trackingNumber] as const,
  },
  routes: {
    detail: (id: string) => ["routes", "detail", id] as const,
  },
  docks: {
    all: ["docks"] as const,
    list: (filters?: QueryParams) => ["docks", "list", filters ?? {}] as const,
    detail: (id: string) => ["docks", "detail", id] as const,
  },
  dockAssignments: {
    all: ["dock-assignments"] as const,
    list: (filters?: QueryParams) => ["dock-assignments", "list", filters ?? {}] as const,
  },
  alerts: {
    all: ["alerts"] as const,
    list: (filters?: QueryParams) => ["alerts", "list", filters ?? {}] as const,
  },
  yard: {
    overview: ["yard", "overview"] as const,
  },
  simulation: {
    state: ["simulation", "state"] as const,
    truck: (truckId: string) => ["simulation", "truck", truckId] as const,
  },
} as const;
