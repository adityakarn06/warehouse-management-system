import { DoorOpenIcon, TimerIcon, TriangleAlertIcon, TruckIcon, WarehouseIcon } from "lucide-react";

import { KpiCard, type KpiTone } from "@/components/dashboard/kpi-card";
import { KpiSkeleton } from "@/components/ui/loading-skeleton";
import { CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateTime } from "@/lib/format";
import type { DashboardKpis } from "@/features/yard";

interface KpiStripProps {
  kpis: DashboardKpis;
  isPending: boolean;
  updatedAt?: string;
}

const METRICS: Array<{
  key: keyof DashboardKpis;
  label: string;
  icon: typeof TruckIcon;
  tone: KpiTone;
}> = [
  { key: "activeTrucks", label: "Active trucks", icon: TruckIcon, tone: "info" },
  { key: "delayedTrucks", label: "Delayed trucks", icon: TriangleAlertIcon, tone: "critical" },
  { key: "arrivingTrucks", label: "Arriving trucks", icon: TimerIcon, tone: "warning" },
  { key: "dockedTrucks", label: "Docked trucks", icon: WarehouseIcon, tone: "success" },
  { key: "docksAvailable", label: "Available docks", icon: DoorOpenIcon, tone: "success" },
];

export function KpiStrip({ kpis, isPending, updatedAt }: KpiStripProps) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border p-3">
      <CardHeader className="flex flex-row items-center justify-between p-0">
        <CardTitle className="text-sm">Operations overview</CardTitle>
        <CardDescription>
          {isPending ? <Skeleton className="h-3 w-28" /> : `Last updated: ${formatDateTime(updatedAt)}`}
        </CardDescription>
      </CardHeader>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
        {isPending
          ? Array.from({ length: 5 }).map((_, index) => <KpiSkeleton key={index} />)
          : METRICS.map((metric) => (
              <KpiCard
                key={metric.key}
                icon={metric.icon}
                label={metric.label}
                value={kpis[metric.key]}
                tone={metric.tone}
              />
            ))}
      </div>
    </div>
  );
}
