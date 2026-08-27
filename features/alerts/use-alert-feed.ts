"use client";

import { useEffect } from "react";

import { useAlertStore } from "@/stores/use-alert-store";

import { useAlerts as useAlertsQuery } from "./queries";

/**
 * The single seam between `GET /api/v1/alerts` and the live alert feed.
 *
 * Mounted once, app-wide (`providers/alert-provider.tsx`), so the feed exists
 * on every route — a dock takedown on `/yard` raises alerts that must be
 * visible from `/dashboard` too.
 *
 * REST is the initial history only; everything after it arrives on
 * `ALERT_CREATED`. `staleTime: Infinity` and no refetch interval, because
 * "Do not poll — alerts especially" (docs/api.md).
 *
 * `seedFromSnapshot` holds its own `hasSeeded` latch *inside the store*, which
 * outlives any mount, so a remount cannot replay this snapshot over alerts the
 * socket already delivered and reset their read state.
 *
 * The REST `useAlerts` is imported by path rather than off `@/features/alerts`:
 * `stores/selectors.ts` exports a different hook of the same name over the live
 * feed, and the two are easy to confuse at an import site.
 */
export function useAlertFeed() {
  const query = useAlertsQuery({ limit: 100 });
  const rows = query.data?.data;

  useEffect(() => {
    if (!rows) return;
    useAlertStore.getState().seedFromSnapshot(rows);
  }, [rows]);

  return query;
}
