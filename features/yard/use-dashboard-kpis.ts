"use client";

import { useMemo } from "react";
import { useShallow } from "zustand/react/shallow";

import { useAlertStore, useDockStore, useTruckStore } from "@/stores";
import type { DockStatus, TruckStatus, YardOverview } from "@/types";

export interface DashboardKpis {
  activeTrucks: number;
  delayedTrucks: number;
  arrivingTrucks: number;
  dockedTrucks: number;
  docksAvailable: number;
  unresolvedAlerts: number;
}

/**
 * KPI values, computed from the REST snapshot with per-row live overlay —
 * never from the live store alone (its membership is "trucks the loop is
 * advancing", narrower than the REST `activeTrucks` list), and never a
 * client-invented bucket: every count is keyed off a backend `status`/
 * `dockStatus` string exactly as sent.
 */
export function useDashboardKpis(overview: YardOverview | undefined): DashboardKpis {
  // Status maps, not the entry maps: a `useShallow` over `trucksById`
  // compares entry *identities*, and a position tick replaces one entry — so
  // it would re-render this hook's caller (the whole dashboard, map included)
  // every 2s for values that only change on a status transition.
  const truckStatuses = useTruckStore(
    useShallow((s) => {
      const statuses: Record<string, TruckStatus> = {};
      for (const id in s.trucksById) statuses[id] = s.trucksById[id].status;
      return statuses;
    }),
  );
  const dockStatuses = useDockStore(
    useShallow((s) => {
      const statuses: Record<string, DockStatus> = {};
      for (const id in s.docksById) statuses[id] = s.docksById[id].status;
      return statuses;
    }),
  );
  const alerts = useAlertStore(useShallow((s) => s.alerts));

  return useMemo(() => {
    if (!overview) {
      return {
        activeTrucks: 0,
        delayedTrucks: 0,
        arrivingTrucks: 0,
        dockedTrucks: 0,
        docksAvailable: 0,
        unresolvedAlerts: 0,
      };
    }

    let delayedTrucks = 0;
    let arrivingTrucks = 0;
    let dockedTrucks = 0;

    for (const truck of overview.activeTrucks) {
      const status = truckStatuses[truck.id] ?? truck.status;
      if (status === "DELAYED") delayedTrucks += 1;
      if (status === "ARRIVING") arrivingTrucks += 1;
      if (status === "DOCKED") dockedTrucks += 1;
    }

    let docksAvailable = 0;
    for (const dock of overview.docks) {
      const status = dockStatuses[dock.id] ?? dock.status;
      if (status === "AVAILABLE") docksAvailable += 1;
    }

    // Alerts pushed live *since this snapshot was generated* — the only ones
    // `summary.unresolvedAlerts` cannot already account for. A plain set
    // difference against `overview.alerts` would over-count twice over: that
    // list is capped at 20 (docs/api.md), so an older unacknowledged alert
    // outside the window is already in the summary; and the store never
    // updates `acknowledged`, so one acknowledged elsewhere would keep adding
    // 1 forever. Both are alerts older than `generatedAt`, so the cutoff
    // excludes them without inventing any state.
    const knownAlertIds = new Set(overview.alerts.map((alert) => alert.id));
    const snapshotAt = Date.parse(overview.generatedAt);
    let extraUnresolved = 0;
    for (const alert of alerts) {
      if (alert.acknowledged || knownAlertIds.has(alert.id)) continue;
      if (Date.parse(alert.createdAt) <= snapshotAt) continue;
      extraUnresolved += 1;
    }

    return {
      activeTrucks: overview.activeTrucks.length,
      delayedTrucks,
      arrivingTrucks,
      dockedTrucks,
      docksAvailable,
      unresolvedAlerts: overview.summary.unresolvedAlerts + extraUnresolved,
    };
  }, [overview, truckStatuses, dockStatuses, alerts]);
}
