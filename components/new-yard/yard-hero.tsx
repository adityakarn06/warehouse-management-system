"use client";

import { cn } from "@/lib/utils";
import type { DockStatus } from "@/types";

import { AllocationOverlay } from "./allocation-overlay";
import { DockMixOverlay } from "./dock-mix-overlay";

interface YardHeroProps {
  docksByStatus: Partial<Record<DockStatus, number>>;
  allocatedTrailers: number;
  unallocatedTrailers: number;
  isPending: boolean;
  onManageDocks: () => void;
}

/**
 * The open canvas: the region of the render left clear for the two headline
 * summaries to float over, pinned to opposite top corners.
 *
 * They only float from `lg` up — over a narrow viewport two 16rem cards would
 * blanket the render they annotate, so the same two cards stack above it
 * instead. The floating copies sit in a `pointer-events-none` layer so the
 * gaps between them stay inert rather than swallowing clicks.
 */
export function YardHero({
  docksByStatus,
  allocatedTrailers,
  unallocatedTrailers,
  isPending,
  onManageDocks,
}: YardHeroProps) {
  // One element rendered in both branches below, so the two copies stay in
  // step. Anything stateful it triggers therefore lives above this component —
  // see `onManageDocks`.
  const dockMix = (
    <DockMixOverlay
      docksByStatus={docksByStatus}
      isPending={isPending}
      onManage={onManageDocks}
    />
  );
  const allocation = (
    <AllocationOverlay
      allocated={allocatedTrailers}
      unallocated={unallocatedTrailers}
      isPending={isPending}
    />
  );

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-2 lg:hidden [&>*]:w-full">
        {dockMix}
        {allocation}
      </div>

      <div className="relative min-h-96 flex-1">
        <div className="pointer-events-none absolute inset-0 hidden lg:block">
          <div className="absolute left-0 top-0">{dockMix}</div>
          <LeaderLine side="left" className="left-64 top-28" tone="bg-success" />

          <div className="absolute right-0 top-0">{allocation}</div>
          <LeaderLine side="right" className="right-64 top-28" tone="bg-info" />
        </div>
      </div>
    </section>
  );
}

/**
 * The thin run from a floating card out onto the render, ending in a dot — the
 * reference's cue that a card is annotating the yard rather than merely sitting
 * on top of it.
 *
 * Purely decorative: it points at a fixed spot in a fixed illustration, so it
 * is hidden from the accessibility tree and carries no data.
 */
function LeaderLine({
  side,
  tone,
  className,
}: {
  side: "left" | "right";
  tone: string;
  className?: string;
}) {
  return (
    <div aria-hidden className={cn("absolute flex items-center gap-0", className)}>
      {side === "right" ? <span className={cn("size-2.5 rounded-full ring-2 ring-white/90", tone)} /> : null}
      <span className="h-px w-20 bg-white/70" />
      {side === "left" ? <span className={cn("size-2.5 rounded-full ring-2 ring-white/90", tone)} /> : null}
    </div>
  );
}
