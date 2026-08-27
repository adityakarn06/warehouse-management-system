"use client";

import { PackageIcon } from "lucide-react";

import { AssignmentStateBadge } from "@/components/ui/assignment-state-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatusBadge } from "@/components/ui/status-badge";
import { useNow } from "@/hooks/use-now";
import { useReviewTruck } from "@/hooks/use-review-truck";
import { formatCountdown } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { DockingQueueEntry as DockingQueueEntryType } from "@/types";

/**
 * One truck in one arrival window. `topRecommendation` is rendered as a
 * proposal (dashed `RECOMMENDED` badge), never a booking — committing one
 * still goes through `DockRecommendationPanel`, which "Review" hands off to.
 */
export function DockingQueueEntry({ entry }: { entry: DockingQueueEntryType }) {
  const now = useNow();
  const { selectedTruckId, reviewTruck } = useReviewTruck();
  const isSelected = selectedTruckId === entry.truckId;

  return (
    <div
      className={cn(
        "flex flex-col gap-1.5 rounded-md border border-border p-2.5",
        isSelected && "border-primary ring-1 ring-primary/20",
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-xs font-medium">
          {entry.truckReference}
          <span className="font-mono text-2xs text-muted-foreground">{entry.trailerId}</span>
        </span>
        <StatusBadge domain="truck" value={entry.status} />
      </div>

      <div className="flex flex-wrap items-center gap-1.5 text-2xs text-muted-foreground">
        <PackageIcon className="size-2.5 shrink-0" />
        <span className="font-medium text-foreground">{entry.shipmentReference}</span>
        <Badge variant="outline">{entry.priority}</Badge>
        <Badge variant="outline">{entry.loadType}</Badge>
        <span>ETA {formatCountdown(entry.eta, now)}</span>
      </div>

      <ProgressBar value={entry.progress} label={`${entry.truckReference} progress`} />

      {entry.topRecommendation ? (
        <div className="flex flex-col gap-1 border-t border-border pt-1.5 text-2xs">
          <div className="flex flex-wrap items-center gap-1.5">
            <AssignmentStateBadge state="RECOMMENDED" />
            <span className="font-medium text-foreground">{entry.topRecommendation.dockCode}</span>
            <span className="text-muted-foreground">score {entry.topRecommendation.score}</span>
          </div>
          <p className="text-muted-foreground">{entry.topRecommendation.reasons.join(" · ")}</p>
        </div>
      ) : (
        <p className="border-t border-border pt-1.5 text-2xs text-muted-foreground">
          No dock recommendation — open recommendations to see why.
        </p>
      )}

      <Button
        size="xs"
        variant="outline"
        className="self-start"
        aria-pressed={isSelected}
        onClick={() => reviewTruck(entry.truckId)}
      >
        {isSelected ? "Reviewing" : "Review"}
      </Button>
    </div>
  );
}
