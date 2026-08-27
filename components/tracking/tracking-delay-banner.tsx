"use client";

import { CloudRainIcon, ConstructionIcon, TrafficConeIcon, type LucideIcon } from "lucide-react";

import { useNow } from "@/hooks/use-now";
import { formatCountdown, formatDateTime } from "@/lib/format";
import type { DelayScenario } from "@/types";

/**
 * The active delay scenario and the ETA it produced. Both come straight off
 * the truck store — `activeDelay` is the scenario in force *after* the change,
 * carried on TRUCK_STATUS_CHANGED, and `eta` is the revised instant the
 * backend computed. Neither is inferred from the other.
 */
const scenarioIcon: Record<DelayScenario, LucideIcon> = {
  RAIN: CloudRainIcon,
  TRAFFIC: TrafficConeIcon,
  ROAD_CLOSURE: ConstructionIcon,
};

const scenarioLabel: Record<DelayScenario, string> = {
  RAIN: "Rain",
  TRAFFIC: "Traffic",
  ROAD_CLOSURE: "Road closure",
};

export function TrackingDelayBanner({
  scenario,
  eta,
}: {
  scenario: DelayScenario;
  eta: string | null;
}) {
  const now = useNow();
  const Icon = scenarioIcon[scenario];

  return (
    <div
      role="status"
      className="flex items-start gap-3 rounded-lg border border-destructive/20 bg-destructive/5 p-3"
    >
      <Icon className="mt-0.5 size-4 shrink-0 text-destructive" />
      <div className="min-w-0 text-sm">
        <p className="font-medium">{scenarioLabel[scenario]} delay in effect</p>
        <p className="text-xs text-muted-foreground tabular-nums">
          Revised arrival {formatDateTime(eta)} · {formatCountdown(eta, now)}
        </p>
      </div>
    </div>
  );
}
