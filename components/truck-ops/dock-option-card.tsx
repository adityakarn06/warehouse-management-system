"use client";

import { CheckIcon, TrophyIcon } from "lucide-react";

import { ScoreBreakdown } from "@/components/docks/score-breakdown";
import { AssignmentStateBadge } from "@/components/ui/assignment-state-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FIELD_LABEL_CLASS } from "@/components/ui/field-label";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { DockRecommendation } from "@/types";

interface DockOptionCardProps {
  recommendation: DockRecommendation;
  /** 0-based position in the backend's ranking — read, never computed here. */
  rank: number;
  isCurrentAssignment: boolean;
  isPending: boolean;
  onAssign: (dockId: string) => void;
}

function Cell({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <span className={FIELD_LABEL_CLASS}>{label}</span>
      <span className="truncate text-xs font-medium tabular-nums">{value}</span>
    </div>
  );
}

/**
 * One ranked door, sized for the horizontal rail under the truck.
 *
 * A wider sibling of `components/docks/dock-recommendation-card.tsx` rather
 * than a replacement for it: that card is built for `/yard`'s 20rem sidebar and
 * stacks vertically, this one sits in a scrolling strip and has room for the
 * detail grid the reference's shipment cards show. Both render the same
 * response fields and share `ScoreBreakdown`, so the two cannot disagree about
 * what a score means.
 */
export function DockOptionCard({
  recommendation,
  rank,
  isCurrentAssignment,
  isPending,
  onAssign,
}: DockOptionCardProps) {
  const isTop = rank === 0;

  return (
    <article
      className={cn(
        "flex w-72 shrink-0 flex-col gap-2.5 rounded-lg border p-3 transition-colors",
        isTop ? "border-primary/40 bg-primary/5" : "border-border bg-card",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-col gap-0.5">
          <div className="flex items-center gap-1.5">
            <span
              className={cn(
                "flex size-4 shrink-0 items-center justify-center rounded-full text-2xs font-semibold tabular-nums",
                isTop ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
              )}
            >
              {rank + 1}
            </span>
            <span className="truncate text-sm font-semibold">{recommendation.dockCode}</span>
            {/* Dashed and unfilled, so a ranked door is never mistaken for a
                committed one. Only the backend commits an assignment. */}
            <AssignmentStateBadge state="RECOMMENDED" />
          </div>
          <span className="truncate text-2xs text-muted-foreground">
            {recommendation.dockName}
          </span>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-1">
          <span className="text-base font-semibold leading-none tabular-nums">
            {recommendation.score}
            <span className="text-2xs font-normal text-muted-foreground">/100</span>
          </span>
          {isTop ? (
            <Badge variant="default" className="gap-1">
              <TrophyIcon />
              Top pick
            </Badge>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 rounded-md bg-muted/50 p-2">
        <Cell label="Zone" value={recommendation.zone} />
        <Cell
          label="Status"
          value={<StatusBadge domain="dock" value={recommendation.status} />}
        />
        {/* `availableFrom` is null when the door is free right now — the
            backend's own distinction, not a fallback for a missing value. */}
        <Cell
          label="Free from"
          value={recommendation.availableFrom ? formatTime(recommendation.availableFrom) : "Now"}
        />
      </div>

      {/* The backend's own sentences, verbatim — this rail does not paraphrase
          why one door beat another. */}
      <ul className="flex flex-col gap-0.5">
        {recommendation.reasons.map((reason) => (
          <li key={reason} className="flex items-start gap-1 text-2xs text-muted-foreground">
            <CheckIcon className="mt-0.5 size-2.5 shrink-0 text-success" />
            <span>{reason}</span>
          </li>
        ))}
      </ul>

      <ScoreBreakdown recommendation={recommendation} />

      <div className="mt-auto pt-0.5">
        {isCurrentAssignment ? (
          <Button size="sm" variant="outline" disabled className="w-full">
            Currently assigned
          </Button>
        ) : (
          <Button
            size="sm"
            variant={isTop ? "default" : "outline"}
            disabled={isPending}
            onClick={() => onAssign(recommendation.dockId)}
            className="w-full"
          >
            {isPending ? "Assigning…" : `Assign ${recommendation.dockCode}`}
          </Button>
        )}
      </div>
    </article>
  );
}
