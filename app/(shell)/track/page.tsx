import { PageShell } from "@/components/layout/page-shell";
import { TrackingSearchForm } from "@/components/tracking/tracking-search-form";

export default function TrackPage() {
  return (
    <PageShell title="Track" description="Look up a shipment by tracking number.">
      <TrackingSearchForm autoFocus />
    </PageShell>
  );
}
