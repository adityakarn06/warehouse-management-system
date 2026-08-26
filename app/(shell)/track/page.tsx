import { PageShell } from "@/components/layout/page-shell";
import { TrackingSearchPlaceholder } from "@/components/tracking/tracking-search-placeholder";

export default function TrackPage() {
  return (
    <PageShell title="Track" description="Look up a shipment by tracking number.">
      <TrackingSearchPlaceholder />
    </PageShell>
  );
}
