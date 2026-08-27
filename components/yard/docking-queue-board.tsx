"use client";

import { ListOrderedIcon } from "lucide-react";

import { DockingQueueWindow } from "@/components/yard/docking-queue-window";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { CardSkeleton } from "@/components/ui/loading-skeleton";
import { useDockingQueue } from "@/features/yard";

/**
 * "Identify the trailer that needs to be docked for each arrival window"
 * (problem statement §4). Windows and entries arrive pre-grouped and
 * pre-sorted (window, then priority, then ETA) — rendered in the order
 * received, never re-sorted or re-grouped here (AGENTS.md: the frontend never
 * computes business state).
 */
export function DockingQueueBoard() {
  const query = useDockingQueue();

  if (query.isPending) {
    return (
      <div className="flex flex-col gap-3">
        <CardSkeleton />
        <CardSkeleton />
      </div>
    );
  }

  if (query.isError) {
    return (
      <ErrorState
        title="Could not load the docking queue"
        message={query.error.message}
        onRetry={() => void query.refetch()}
      />
    );
  }

  const { windows } = query.data;

  if (windows.length === 0) {
    return (
      <EmptyState
        icon={ListOrderedIcon}
        title="Nothing waiting on a door"
        description="No truck has an arrival window open within the horizon and no committed door."
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {windows.map((window, index) => (
        // Neither bound is a stable id for the UNSCHEDULED bucket (both null),
        // and two windows never share a start — index is safe alongside it.
        <DockingQueueWindow key={`${window.windowStart ?? "unscheduled"}-${index}`} window={window} />
      ))}
    </div>
  );
}
