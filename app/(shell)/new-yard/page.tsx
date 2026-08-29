"use client";

import { useState } from "react";
import {
  ClipboardCheckIcon,
  TimerIcon,
  TriangleAlertIcon,
  TruckIcon,
  WarehouseIcon,
} from "lucide-react";

import { DockDoorsSheet } from "@/components/new-yard/dock-doors-sheet";
import { DockMixPanel } from "@/components/new-yard/dock-mix-panel";
import { DockingQueueList } from "@/components/new-yard/docking-queue-list";
import { UnallocatedTrailersPanel } from "@/components/new-yard/unallocated-trailers-panel";
import { YardAlertsPanel } from "@/components/new-yard/yard-alerts-panel";
import { YardBackdrop } from "@/components/new-yard/yard-backdrop";
import { YardHero } from "@/components/new-yard/yard-hero";
import { YardPanel } from "@/components/new-yard/yard-panel";
import { YardStatRail, type YardStat } from "@/components/new-yard/yard-stat-rail";
import { ErrorState } from "@/components/ui/error-state";
import {
  useAllocationSummary,
  useDashboardKpis,
  useDashboardSnapshot,
  useSnapshotInvalidation,
} from "@/features/yard";

/**
 * The reworked yard page: the dock render as the page's whole canvas, with the
 * headline counts pinned over its top corners and the working lists — queue,
 * waiting trailers, alerts — floating in one row along the bottom.
 *
 * No `PageShell` here on purpose. Its title block would land exactly where the
 * top-left summary floats, and `DashboardHeader` already names the app.
 *
 * Every figure on it is a backend count rendered as sent. The two bars are
 * proportions of those counts for reading; nothing here scores a door, picks
 * an assignment, or derives an ETA (AGENTS.md). The render itself is a fixed
 * illustration, not a live view — no truck is ever drawn onto it.
 */
export default function NewYardPage() {
  // Owned here, not in `DockMixOverlay`: `YardHero` renders that card twice
  // (stacked below `lg`, floating above it), so a sheet held inside it would
  // exist as two independent instances.
  const [isManageOpen, setIsManageOpen] = useState(false);
  const { overview, isPending, isError, error, refetch } = useDashboardSnapshot();
  const kpis = useDashboardKpis(overview);
  const allocation = useAllocationSummary();
  useSnapshotInvalidation();

  if (isError) {
    return (
      <YardCanvas>
        <ErrorState
          message={error instanceof Error ? error.message : "Failed to load the yard overview."}
          onRetry={() => refetch()}
        />
      </YardCanvas>
    );
  }

  const stats: YardStat[] = [
    { key: "active", label: "Active trucks", value: kpis.activeTrucks, icon: TruckIcon, tone: "info" },
    {
      key: "delayed",
      label: "Delayed",
      value: kpis.delayedTrucks,
      icon: TriangleAlertIcon,
      tone: "critical",
    },
    { key: "arriving", label: "Arriving", value: kpis.arrivingTrucks, icon: TimerIcon, tone: "warning" },
    { key: "docked", label: "Docked", value: kpis.dockedTrucks, icon: WarehouseIcon, tone: "success" },
    {
      key: "assignments",
      label: "Active assignments",
      value: overview?.summary.activeAssignments ?? 0,
      icon: ClipboardCheckIcon,
      tone: "neutral",
    },
  ];

  return (
    <YardCanvas>
      <YardStatRail stats={stats} isPending={isPending} />

      <YardHero
        docksByStatus={allocation.data?.totals.docksByStatus ?? {}}
        allocatedTrailers={allocation.data?.totals.allocatedTrailers ?? 0}
        unallocatedTrailers={allocation.data?.totals.unallocatedTrailers ?? 0}
        isPending={allocation.isPending}
        onManageDocks={() => setIsManageOpen(true)}
      />

      {/* The door board the "Manage" button opens. It fetches `GET /docks`
          itself, and only while open — its body mounts inside the sheet's
          portal, so a page load that never opens it costs nothing. */}
      <DockDoorsSheet open={isManageOpen} onOpenChange={setIsManageOpen} />

      <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-4 [&>*]:max-h-72">
        <DockMixPanel
          docksByStatus={allocation.data?.totals.docksByStatus ?? {}}
          isPending={allocation.isPending}
        />
        <YardPanel title="Docking queue" contentClassName="gap-1">
          <DockingQueueList />
        </YardPanel>
        <UnallocatedTrailersPanel />
        <YardAlertsPanel />
      </div>
    </YardCanvas>
  );
}

/**
 * The render plus everything stacked over it. `isolate` keeps the backdrop's
 * `-z-10` scoped to this stacking context instead of sliding under the app
 * shell, and `min-h-full` makes it fill `main` even when the content is short.
 */
function YardCanvas({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative isolate flex min-h-full flex-1 flex-col gap-3 overflow-hidden p-4">
      <YardBackdrop />
      {children}
    </div>
  );
}
