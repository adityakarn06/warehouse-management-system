import { PageShell } from "@/components/layout/page-shell";
import { DockGridPlaceholder } from "@/components/docks/dock-grid-placeholder";
import { TruckListPlaceholder } from "@/components/trucks/truck-list-placeholder";

export default function YardPage() {
  return (
    <PageShell title="Yard" description="Docks and trucks currently on site.">
      <div className="grid gap-4 md:grid-cols-2">
        <DockGridPlaceholder />
        <TruckListPlaceholder />
      </div>
    </PageShell>
  );
}
