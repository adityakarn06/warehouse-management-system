"use client";

import { CheckIcon, XIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils";
import type { WmsSimulateResult } from "@/types";

type WmsSimulateStep = WmsSimulateResult["steps"][number];

function StepRow({ step, index }: { step: WmsSimulateStep; index: number }) {
  const result = step.result ?? null;

  return (
    <li
      className={cn(
        "flex flex-col gap-1.5 rounded-md border border-l-2 border-border px-3 py-2",
        step.ok ? "border-l-success" : "border-l-destructive",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <span className="text-[0.6rem] tabular-nums text-muted-foreground">{index + 1}</span>
          <span className="text-xs font-medium">{step.eventType.replace(/_/g, " ")}</span>
        </div>
        <Badge variant={step.ok ? "success" : "destructive"}>
          {step.ok ? <CheckIcon /> : <XIcon />}
          {step.ok ? "ok" : "failed"}
        </Badge>
      </div>

      {/* The backend's own sentence — a WMS refusal names the door or the rule
          it broke, which is more use than anything written here. */}
      {step.error ? (
        <p className="rounded-sm bg-destructive/10 px-2 py-1 text-[0.65rem] text-destructive">
          {step.error}
        </p>
      ) : null}

      {result ? (
        <>
          <div className="flex flex-wrap items-center gap-1">
            {/* `applied: false` is a success, not a failure: the fact the feed
                reported was already true, so nothing moved and no second alert
                was raised (docs/api.md §WMS). */}
            <Badge variant={result.applied ? "secondary" : "outline"}>
              {result.applied ? "applied" : "already true"}
            </Badge>
            {result.truckId ? <Badge variant="outline">{result.truckId}</Badge> : null}
            {result.dockDoorId ? <Badge variant="outline">{result.dockDoorId}</Badge> : null}
          </div>

          {result.effects.length > 0 ? (
            <ul className="flex flex-col gap-0.5">
              {result.effects.map((effect, effectIndex) => (
                <li
                  key={`${effect}-${effectIndex}`}
                  className="font-mono text-[0.6rem] text-muted-foreground"
                >
                  {effect}
                </li>
              ))}
            </ul>
          ) : null}

          <div className="flex flex-wrap items-center gap-1">
            <span className="text-[0.6rem] text-muted-foreground">Emitted</span>
            {result.emitted.length > 0 ? (
              result.emitted.map((event, eventIndex) => (
                <Badge key={`${event}-${eventIndex}`} variant="info">
                  {event}
                </Badge>
              ))
            ) : (
              // APPOINTMENT_UPDATED deliberately emits nothing (docs/realtime.md
              // §Phase 9) — an empty list is the contract, not a missed event.
              <span className="text-[0.6rem] text-muted-foreground">
                nothing — this event raises no realtime event by contract
              </span>
            )}
          </div>

          {result.alert ? (
            <div className="flex flex-col gap-1 rounded-sm bg-muted/40 px-2 py-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-[0.65rem] font-medium">{result.alert.title}</span>
                <StatusBadge domain="alertSeverity" value={result.alert.severity} />
              </div>
              <p className="text-[0.6rem] text-muted-foreground">{result.alert.message}</p>
            </div>
          ) : null}
        </>
      ) : null}
    </li>
  );
}

/**
 * The command response, rendered exactly as it arrived: one entry per event, in
 * the order the backend fed them. Nothing here is derived beyond counting the
 * failures the response itself marked — the panel reports what the run did, it
 * does not decide what the run should have done.
 */
export function WmsStepList({ result }: { result: WmsSimulateResult }) {
  // Not a field on the response: a failing step is captured as `ok: false` and
  // the run continues, so "failed steps" is a filter over what came back.
  const failedCount = result.steps.filter((step) => !step.ok).length;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium">Last run</span>
        <Badge variant="outline">{result.scenario}</Badge>
        <span className="text-[0.65rem] text-muted-foreground">
          {result.steps.length} step{result.steps.length === 1 ? "" : "s"}
        </span>
        {failedCount > 0 ? (
          <Badge variant="destructive">
            {failedCount} of {result.steps.length} failed
          </Badge>
        ) : null}
      </div>

      {failedCount > 0 ? (
        <p className="text-[0.65rem] text-muted-foreground">
          A failing step is captured on its own and the run continues — the steps below show
          which half of the sequence went through.
        </p>
      ) : null}

      <ul className="flex flex-col gap-1.5">
        {result.steps.map((step, index) => (
          <StepRow key={`${step.eventType}-${index}`} step={step} index={index} />
        ))}
      </ul>
    </div>
  );
}
