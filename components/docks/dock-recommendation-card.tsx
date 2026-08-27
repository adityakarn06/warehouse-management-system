"use client";

import { CheckIcon, TrophyIcon } from "lucide-react";

import { ScoreBreakdown } from "@/components/docks/score-breakdown";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { DockRecommendation } from "@/types";

interface DockRecommendationCardProps {
  recommendation: DockRecommendation;
  /** 0-based position in the backend's ranking — the ranking is read, never computed. */
  rank: number;
  isCurrentAssignment: boolean;
  isPending: boolean;
  onAssign: (dockId: string) => void;
}

export function DockRecommendationCard({
  recommendation,
  rank,
  isCurrentAssignment,
  isPending,
  onAssign,
}: DockRecommendationCardProps) {
  const isTop = rank === 0;

  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-lg border p-3 transition-colors",
        isTop
          ? "border-primary/40 bg-primary/5 ring-1 ring-primary/20"
          : "border-border bg-card",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-col gap-0.5">
          <div className="flex items-center gap-1.5">
            <span
              className={cn(
                "flex size-4 shrink-0 items-center justify-center rounded-full text-[0.6rem] font-semibold tabular-nums",
                isTop ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
              )}
            >
              {rank + 1}
            </span>
            <span className="truncate text-xs font-semibold">{recommendation.dockCode}</span>
            <StatusBadge domain="dock" value={recommendation.status} />
          </div>
          <span className="truncate text-[0.65rem] text-muted-foreground">
            {recommendation.dockName} · {recommendation.zone}
          </span>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-0.5">
          <span className="text-sm font-semibold tabular-nums">
            {recommendation.score}
            <span className="text-[0.65rem] font-normal text-muted-foreground">/100</span>
          </span>
          {isTop ? (
            <Badge variant="default" className="gap-1">
              <TrophyIcon />
              Top pick
            </Badge>
          ) : null}
        </div>
      </div>

      {recommendation.availableFrom ? (
        <p className="text-[0.65rem] text-muted-foreground">
          Free from {formatTime(recommendation.availableFrom)}
        </p>
      ) : null}

      {/* The backend's own sentences, verbatim — this board does not paraphrase
          why one door beat another. */}
      <ul className="flex flex-col gap-0.5">
        {recommendation.reasons.map((reason) => (
          <li
            key={reason}
            className="flex items-start gap-1 text-[0.65rem] text-muted-foreground"
          >
            <CheckIcon className="mt-0.5 size-2.5 shrink-0 text-success" />
            <span>{reason}</span>
          </li>
        ))}
      </ul>

      <ScoreBreakdown recommendation={recommendation} />

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
  );
}
