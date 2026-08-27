"use client";

import { DockOperationsBoard } from "@/components/docks/dock-operations-board";
import { DockRecommendationPanel } from "@/components/docks/dock-recommendation-panel";
import { DockScheduleBoard } from "@/components/docks/dock-schedule-board";
import { ReassignmentPanel } from "@/components/docks/reassignment-panel";
import { PageShell } from "@/components/layout/page-shell";
import { TruckPicker } from "@/components/trucks/truck-picker";
import { AllocationSummaryPanel } from "@/components/yard/allocation-summary-panel";
import { DockingQueueBoard } from "@/components/yard/docking-queue-board";
import { TrailerLookup } from "@/components/yard/trailer-lookup";

export default function YardPage() {
  return (
    <PageShell title="Yard" description="Dock status and assignment recommendations.">
      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <section className="flex flex-col gap-2">
          <h3 className="text-xs font-medium text-muted-foreground">Dock status</h3>
          <DockOperationsBoard />
        </section>
        <section className="flex flex-col gap-4">
          {/* Sits next to the board that triggers it: taking a booked door out
              of service is what produces these rows. */}
          <div className="flex flex-col gap-2">
            <h3 className="text-xs font-medium text-muted-foreground">Reassignments</h3>
            <ReassignmentPanel />
          </div>
          <div className="flex flex-col gap-2">
            <h3 className="text-xs font-medium text-muted-foreground">Select a truck</h3>
            <TrailerLookup />
            <TruckPicker />
          </div>
          <div className="flex flex-col gap-2">
            <h3 className="text-xs font-medium text-muted-foreground">Dock recommendations</h3>
            <DockRecommendationPanel />
          </div>
        </section>
      </div>

      <section className="flex flex-col gap-2">
        <h3 className="text-xs font-medium text-muted-foreground">Docking queue</h3>
        <DockingQueueBoard />
      </section>

      <section className="flex flex-col gap-2">
        <h3 className="text-xs font-medium text-muted-foreground">Dock schedule</h3>
        <DockScheduleBoard />
      </section>

      <section className="flex flex-col gap-2">
        <h3 className="text-xs font-medium text-muted-foreground">Allocation summary</h3>
        <AllocationSummaryPanel />
      </section>
    </PageShell>
  );
}
