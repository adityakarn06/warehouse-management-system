"use client";

import { useQuery } from "@tanstack/react-query";

import {
  getShipment,
  getShipmentByReference,
  getShipments,
  type ShipmentListFilters,
} from "@/lib/api/shipments";
import { queryKeys } from "@/lib/api/query-keys";

export function useShipments(filters: ShipmentListFilters = {}) {
  return useQuery({
    queryKey: queryKeys.shipments.list(filters),
    queryFn: () => getShipments(filters),
    staleTime: Infinity,
  });
}

export function useShipment(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.shipments.detail(id ?? ""),
    queryFn: () => getShipment(id as string),
    enabled: Boolean(id),
    staleTime: Infinity,
  });
}

export function useShipmentByReference(reference: string | undefined) {
  return useQuery({
    queryKey: queryKeys.shipments.byReference(reference ?? ""),
    queryFn: () => getShipmentByReference(reference as string),
    enabled: Boolean(reference),
    staleTime: Infinity,
  });
}
