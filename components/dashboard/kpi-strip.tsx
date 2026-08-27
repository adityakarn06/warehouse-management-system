import { KpiCard } from "@/components/dashboard/kpi-card";
import { KpiSkeleton } from "@/components/ui/loading-skeleton";
import type { DashboardKpis } from "@/features/yard";

interface KpiStripProps {
  kpis: DashboardKpis;
  isPending: boolean;
}

export function KpiStrip({ kpis, isPending }: KpiStripProps) {
  if (isPending) {
    return (
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, index) => (
          <KpiSkeleton key={index} />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
      <KpiCard label="Active trucks" value={kpis.activeTrucks} tone="info" />
      <KpiCard label="Delayed trucks" value={kpis.delayedTrucks} tone="critical" />
      <KpiCard label="Arriving trucks" value={kpis.arrivingTrucks} tone="warning" />
      <KpiCard label="Docked trucks" value={kpis.dockedTrucks} tone="success" />
      <KpiCard label="Available docks" value={kpis.docksAvailable} tone="success" />
      <KpiCard label="Unresolved alerts" value={kpis.unresolvedAlerts} tone="critical" />
    </div>
  );
}
