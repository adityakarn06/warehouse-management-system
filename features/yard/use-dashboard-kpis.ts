"use client";

import { useMemo } from "react";
import { useShallow } from "zustand/react/shallow";

import { useAlertStore, useDockStore, useTruckStore } from "@/stores";
import type { YardOverview } from "@/types";

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
  const trucksById = useTruckStore(useShallow((s) => s.trucksById));
  const docksById = useDockStore(useShallow((s) => s.docksById));
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
      const status = trucksById[truck.id]?.status ?? truck.status;
      if (status === "DELAYED") delayedTrucks += 1;
      if (status === "ARRIVING") arrivingTrucks += 1;
      if (status === "DOCKED") dockedTrucks += 1;
    }

    let docksAvailable = 0;
    for (const dock of overview.docks) {
      const status = docksById[dock.id]?.status ?? dock.status;
      if (status === "AVAILABLE") docksAvailable += 1;
    }

    // Alerts pushed live that the REST snapshot's (max-20) window doesn't
    // already contain, and that are still unacknowledged — an exact set
    // difference against the baseline count, not a guess.
    const knownAlertIds = new Set(overview.alerts.map((alert) => alert.id));
    let extraUnresolved = 0;
    for (const alert of alerts) {
      if (!alert.acknowledged && !knownAlertIds.has(alert.id)) extraUnresolved += 1;
    }

    return {
      activeTrucks: overview.activeTrucks.length,
      delayedTrucks,
      arrivingTrucks,
      dockedTrucks,
      docksAvailable,
      unresolvedAlerts: overview.summary.unresolvedAlerts + extraUnresolved,
    };
  }, [overview, trucksById, docksById, alerts]);
}
