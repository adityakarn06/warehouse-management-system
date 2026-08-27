"use client";

import { useState } from "react";
import { CloudRainIcon, ConeIcon, Loader2Icon, RotateCcwIcon, TriangleAlertIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { delayCommandErrorMessage, useClearTruckDelay, useDelayTruck } from "@/features/simulation";
import type { LiveTruckFields } from "@/features/yard";
import { useNow } from "@/hooks/use-now";
import { formatCountdown, formatDateTime, formatRelativeTime } from "@/lib/format";
import { notify } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { useLatestAlertForTruck, useTruck } from "@/stores";
import type { DelayScenario } from "@/types";

const SCENARIOS: { type: DelayScenario; label: string; icon: typeof CloudRainIcon }[] = [
  { type: "RAIN", label: "Rain", icon: CloudRainIcon },
  { type: "TRAFFIC", label: "Traffic", icon: TriangleAlertIcon },
  { type: "ROAD_CLOSURE", label: "Road Closure", icon: ConeIcon },
];

interface TruckSimulationControlsProps {
  truckId: string;
  reference: string;
  live: LiveTruckFields;
}

/**
 * Sends the scenario name and nothing else. Effective speed, ETA, status, the
 * alert and the realtime events are all the backend's (docs/api.md §Delay
 * scenarios) — every value below is rendered straight from what it sent.
 */
export function TruckSimulationControls({ truckId, reference, live }: TruckSimulationControlsProps) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const now = useNow();

  // The command response carries `baseSpeedKmph`, as does every subscribe
  // snapshot; the live position/status events do not, so it can be absent.
  const baseSpeedKmph = useTruck(truckId)?.baseSpeedKmph ?? null;
  const latestAlert = useLatestAlertForTruck(truckId);

  const delayTruck = useDelayTruck();
  const clearDelay = useClearTruckDelay();
  const isPending = delayTruck.isPending || clearDelay.isPending;

  function handleFailure(error: unknown) {
    const message = delayCommandErrorMessage(error, reference);
    setErrorMessage(message);
    notify.error(message);
  }

  function applyScenario(type: DelayScenario) {
    setErrorMessage(null);
    delayTruck.mutate({ truckId, type }, { onError: handleFailure });
  }

  function clearScenario() {
    setErrorMessage(null);
    clearDelay.mutate(truckId, { onError: handleFailure });
  }

  const isDelayed = live.activeDelay !== "NORMAL";

  return (
    <div className="flex flex-col gap-2 rounded-md border border-border p-2">
      <span className="text-2xs font-medium tracking-wide text-muted-foreground uppercase">
        Simulation
      </span>

      <div className="flex flex-wrap gap-1">
        {SCENARIOS.map(({ type, label, icon: Icon }) => {
          const isActive = live.activeDelay === type;
          const isSending = delayTruck.isPending && delayTruck.variables?.type === type;
          return (
            <Button
              key={type}
              size="xs"
              variant={isActive ? "default" : "outline"}
              // The active scenario is already in force — the backend treats a
              // repeat as a no-op success, so the button simply stops asking.
              disabled={isPending || isActive}
              onClick={() => applyScenario(type)}
            >
              {isSending ? <Loader2Icon className="animate-spin" /> : <Icon />}
              {label}
            </Button>
          );
        })}
        <Button
          size="xs"
          variant="ghost"
          disabled={isPending || !isDelayed}
          onClick={clearScenario}
        >
          {clearDelay.isPending ? <Loader2Icon className="animate-spin" /> : <RotateCcwIcon />}
          Clear Delay
        </Button>
      </div>

      {errorMessage ? (
        <p className="rounded-sm bg-destructive/10 px-2 py-1 text-2xs text-destructive">
          {errorMessage}
        </p>
      ) : null}

      <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 text-xs">
        <div className="flex flex-col gap-0.5">
          <span className="text-2xs text-muted-foreground">Delay</span>
          <span className={cn("font-medium", isDelayed && "text-destructive")}>
            {isDelayed ? live.activeDelay.replace(/_/g, " ") : "None"}
          </span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-2xs text-muted-foreground">Status</span>
          <StatusBadge domain="truck" value={live.status} />
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-2xs text-muted-foreground">Effective speed</span>
          <span className="tabular-nums">
            {live.speedKmph} km/h
            {baseSpeedKmph !== null ? (
              <span className="text-muted-foreground"> · base {baseSpeedKmph}</span>
            ) : null}
          </span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-2xs text-muted-foreground">ETA</span>
          <span className="tabular-nums">{formatDateTime(live.eta)}</span>
          <span className="text-2xs tabular-nums text-muted-foreground">
            {formatCountdown(live.eta, now)}
          </span>
        </div>
      </div>

      {latestAlert ? (
        <div className="flex flex-col gap-1 rounded-sm bg-muted/40 px-2 py-1.5">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-2xs font-medium">{latestAlert.title}</span>
            <StatusBadge domain="alertSeverity" value={latestAlert.severity} />
          </div>
          <p className="text-2xs text-muted-foreground">{latestAlert.message}</p>
          <span className="text-2xs text-muted-foreground">
            {formatRelativeTime(latestAlert.createdAt, now)}
          </span>
        </div>
      ) : null}
    </div>
  );
}
