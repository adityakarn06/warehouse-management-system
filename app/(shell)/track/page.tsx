import { PackageSearchIcon } from "lucide-react";

import { PageShell } from "@/components/layout/page-shell";
import { TrackingSearchForm } from "@/components/tracking/tracking-search-form";

export default function TrackPage() {
  return (
    <PageShell title="Track" description="Look up a shipment by tracking number.">
      {/* One thing to do on this page, so it gets the whole space and sits at
          the optical centre rather than tucked into the top-left corner. */}
      <div className="flex flex-1 items-center justify-center py-12">
        <div className="flex w-full max-w-md flex-col items-center gap-4 text-center">
          <span className="grid size-10 place-items-center rounded-full bg-muted">
            <PackageSearchIcon className="size-5 text-muted-foreground" />
          </span>
          <div className="flex flex-col gap-1">
            <h2 className="text-sm font-semibold">Track a shipment</h2>
            <p className="text-xs text-muted-foreground">
              Enter a tracking number to see its live position, ETA and dock.
            </p>
          </div>
          <TrackingSearchForm autoFocus className="text-left" />
        </div>
      </div>
    </PageShell>
  );
}
