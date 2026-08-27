"use client";

import { RadioIcon } from "lucide-react";

import { StatusBadge } from "@/components/ui/status-badge";
import { useNow } from "@/hooks/use-now";
import { formatSecondsAgo } from "@/lib/format";
import { useDock, useTruck } from "@/stores";
import type { WmsSimulateResult } from "@/types";

function TruckRow({ truckId }: { truckId: string }) {
  const live = useTruck(truckId);
  const now = useNow();

  return (
    <div className="flex flex-col gap-0.5 rounded-md border border-border px-3 py-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-2xs font-medium">{live?.reference ?? truckId}</span>
        {live ? (
          <StatusBadge domain="truck" value={live.status} />
        ) : (
          <span className="text-2xs text-muted-foreground">not held live</span>
        )}
      </div>
      {/* What the store actually holds — a readout of the fields the socket
          pushed, not a fabricated yard grid. Labelled a yard *position*
          because it is the same lat/lng the map plots, just read here as a
          number rather than a marker. */}
      {live ? (
        <span className="font-mono text-2xs text-muted-foreground tabular-nums">
          {live.currentLatitude.toFixed(5)}, {live.currentLongitude.toFixed(5)} · updated{" "}
          {formatSecondsAgo(live.serverTimestamp, now)}
        </span>
      ) : null}
    </div>
  );
}

function DockRow({ dockDoorId }: { dockDoorId: string }) {
  const live = useDock(dockDoorId);

  return (
    <div className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-1.5">
      <span className="text-2xs font-medium">{live?.code ?? dockDoorId}</span>
      {live ? (
        <StatusBadge domain="dock" value={live.status} />
      ) : (
        <span className="text-2xs text-muted-foreground">not held live</span>
      )}
    </div>
  );
}

/**
 * What the socket actually delivered for the rows the run touched.
 *
 * The subjects are read off the response (`steps[].result.truckId` /
 * `dockDoorId`) rather than hardcoded from the scenario table, and the statuses
 * are read off the Zustand stores the realtime layer writes. So this strip is
 * the honest counterpart to the step list: it never states the documented
 * outcome, only the state that arrived. With the socket down it shows stale or
 * absent values, which is the point — a panel that printed "D2 OCCUPIED"
 * because the docs say so would be inventing the very fact it exists to prove.
 */
export function WmsLiveState({ result }: { result: WmsSimulateResult }) {
  const truckIds = [
    ...new Set(result.steps.flatMap((step) => (step.result?.truckId ? [step.result.truckId] : []))),
  ];
  const dockDoorIds = [
    ...new Set(
      result.steps.flatMap((step) => (step.result?.dockDoorId ? [step.result.dockDoorId] : [])),
    ),
  ];

  if (truckIds.length === 0 && dockDoorIds.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1.5">
        <RadioIcon className="size-3.5 text-muted-foreground" />
        <span className="text-xs font-medium">Live state</span>
        <span className="text-2xs text-muted-foreground">
          as pushed over Socket.IO — not the documented outcome
        </span>
      </div>

      <div className="grid gap-1.5 sm:grid-cols-2">
        {truckIds.map((truckId) => (
          <TruckRow key={truckId} truckId={truckId} />
        ))}
        {dockDoorIds.map((dockDoorId) => (
          <DockRow key={dockDoorId} dockDoorId={dockDoorId} />
        ))}
      </div>
    </div>
  );
}
