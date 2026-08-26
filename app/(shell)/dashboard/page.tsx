import { SummaryCards } from "@/components/dashboard/summary-cards";
import { PageShell } from "@/components/layout/page-shell";
import { MapPlaceholder } from "@/components/map/map-placeholder";
import { StatusBadge } from "@/components/ui/status-badge";

export default function DashboardPage() {
  return (
    <PageShell title="Dashboard" description="Yard-wide overview of trucks, docks, and alerts.">
      <SummaryCards />
      <MapPlaceholder />
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-dashed border-border p-3">
        <span className="text-xs text-muted-foreground">Status tones:</span>
        <StatusBadge domain="truck" value="IN_TRANSIT" />
        <StatusBadge domain="truck" value="DELAYED" />
        <StatusBadge domain="truck" value="ARRIVING" />
        <StatusBadge domain="truck" value="ARRIVED" />
        <StatusBadge domain="truck" value="COMPLETED" />
      </div>
    </PageShell>
  );
}
