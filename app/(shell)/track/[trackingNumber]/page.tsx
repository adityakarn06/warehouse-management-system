import { notFound } from "next/navigation";

import { PageShell } from "@/components/layout/page-shell";
import { TrackingSearchForm } from "@/components/tracking/tracking-search-form";
import { TrackingView } from "@/components/tracking/tracking-view";
import { trackingIdentifierInputSchema } from "@/schemas/tracking.schema";

/**
 * Deep-linkable shipment tracking. The segment is validated for *shape* here
 * (non-empty) so a malformed URL is a 404 page rather than a failed fetch;
 * whether a well-formed identifier actually exists is the backend's answer,
 * rendered as a not-found state inside `TrackingView`. The identifier may be
 * a tracking number, shipment reference, shipment id or trailer id.
 */
export default async function TrackShipmentPage(props: PageProps<"/track/[trackingNumber]">) {
  const { trackingNumber } = await props.params;
  const parsed = trackingIdentifierInputSchema.safeParse(decodeURIComponent(trackingNumber));

  if (!parsed.success) notFound();

  return (
    <PageShell
      title="Track"
      description="Live status for this shipment."
      actions={<TrackingSearchForm className="hidden sm:block sm:w-64" />}
    >
      <TrackingView trackingNumber={parsed.data} />
    </PageShell>
  );
}
