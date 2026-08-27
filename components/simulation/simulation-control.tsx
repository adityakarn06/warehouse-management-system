"use client";

import { useState } from "react";
import type { UseMutationResult } from "@tanstack/react-query";
import {
  GaugeIcon,
  Loader2Icon,
  PlayIcon,
  RotateCcwIcon,
  SquareIcon,
  TriangleAlertIcon,
} from "lucide-react";

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  lifecycleCommandErrorMessage,
  useResetSimulation,
  useSimulationStatus,
  useStartSimulation,
  useStopSimulation,
} from "@/features/simulation";
import { useNow } from "@/hooks/use-now";
import { formatDateTime, formatSecondsAgo } from "@/lib/format";
import { notify } from "@/lib/toast";
import { cn } from "@/lib/utils";
import type { SimulationLifecycle } from "@/types";

/**
 * The demo operator's view of the simulation loop, and the only place the
 * frontend drives it.
 *
 * The backend owns the lifecycle: nothing here starts or stops the loop off the
 * back of a mount, an unmount, a route change or a reconnect — every command
 * below is an explicit click. (The loop starts on server boot unless
 * `SIMULATION_AUTOSTART=false`; docs/api.md §Simulation.) Every value shown is a
 * field of the `/simulation/status` response rendered as sent — the running
 * flag is never inferred from how fresh the truck rows look.
 */
/**
 * Owns the once-a-second clock so `SimulationControl` itself does not.
 *
 * `useNow()` on the parent re-rendered the shell header 1×/s on *every* route,
 * popover closed or not, for a relative timestamp only visible when it is open.
 * The popover unmounts its content when closed, so scoping the subscription
 * here means no timer runs at all until the operator opens it.
 */
function LastTickAgo({ at }: { at: string }) {
  const now = useNow();

  return (
    <span className="text-2xs tabular-nums text-muted-foreground">
      {formatSecondsAgo(at, now)}
    </span>
  );
}

export function SimulationControl() {
  const [open, setOpen] = useState(false);
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const status = useSimulationStatus(open);
  const lifecycle = status.data;

  const start = useStartSimulation();
  const stop = useStopSimulation();
  const reset = useResetSimulation();
  const isCommandPending = start.isPending || stop.isPending || reset.isPending;

  function runCommand(
    mutation: UseMutationResult<SimulationLifecycle, Error, void>,
    action: string,
    successMessage: string,
  ) {
    setErrorMessage(null);
    mutation.mutate(undefined, {
      onError: (error) => {
        const message = lifecycleCommandErrorMessage(error, action);
        setErrorMessage(message);
        notify.error(message);
      },
      onSuccess: () => notify.success(successMessage),
    });
  }

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={<Button variant="ghost" size="icon-sm" className="relative" />}
          aria-label="Simulation controls"
        >
          <GaugeIcon />
          <span
            className={cn(
              "absolute top-0.5 right-0.5 size-1.5 rounded-full",
              statusDotClass(status.isError ? undefined : lifecycle),
            )}
          />
        </PopoverTrigger>

        <PopoverContent className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-2xs font-medium tracking-wide text-muted-foreground uppercase">
              Simulation loop
            </span>
            {status.isFetching ? (
              <Loader2Icon className="size-3 animate-spin text-muted-foreground" />
            ) : null}
          </div>

          {status.isError ? (
            <div className="flex items-center justify-between gap-2 rounded-sm bg-destructive/10 px-2 py-1.5">
              <span className="text-2xs text-destructive">Loop status unavailable</span>
              <Button size="xs" variant="outline" onClick={() => status.refetch()}>
                Retry
              </Button>
            </div>
          ) : (
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-xs">
              <dt className="text-2xs text-muted-foreground">State</dt>
              <dd className="flex items-center gap-1.5 font-medium">
                <span className={cn("size-1.5 rounded-full", statusDotClass(lifecycle))} />
                {lifecycle ? (lifecycle.running ? "Running" : "Stopped") : "—"}
              </dd>

              <dt className="text-2xs text-muted-foreground">Tick interval</dt>
              <dd className="tabular-nums">{lifecycle ? `${lifecycle.tickMs} ms` : "—"}</dd>

              <dt className="text-2xs text-muted-foreground">Trucks</dt>
              <dd className="tabular-nums">{lifecycle ? lifecycle.truckCount : "—"}</dd>

              <dt className="text-2xs text-muted-foreground">Last tick</dt>
              <dd className="flex flex-col gap-0.5">
                <span className="tabular-nums">{formatDateTime(lifecycle?.lastTickAt)}</span>
                {lifecycle?.lastTickAt ? <LastTickAgo at={lifecycle.lastTickAt} /> : null}
              </dd>
            </dl>
          )}

          {lifecycle?.lastTickError ? (
            <div className="flex items-start gap-1.5 rounded-sm bg-destructive/10 px-2 py-1.5">
              <TriangleAlertIcon className="mt-px size-3 shrink-0 text-destructive" />
              <div className="flex flex-col gap-0.5">
                <span className="text-2xs font-medium tracking-wide text-destructive uppercase">
                  Last tick error
                </span>
                {/* "Is it broken now", not "has it ever been broken" — the
                    backend clears this on the first clean tick after the
                    failure (docs/api.md §Simulation). */}
                <span className="text-2xs text-destructive">{lifecycle.lastTickError}</span>
              </div>
            </div>
          ) : null}

          {errorMessage ? (
            <p className="rounded-sm bg-destructive/10 px-2 py-1 text-2xs text-destructive">
              {errorMessage}
            </p>
          ) : null}

          <div className="flex items-center gap-1">
            <Button
              size="xs"
              // Start is idempotent server-side, but a button that stays lit
              // while the loop is already running says nothing about its state.
              disabled={isCommandPending || lifecycle?.running !== false}
              onClick={() => runCommand(start, "start", "Simulation started.")}
            >
              {start.isPending ? <Loader2Icon className="animate-spin" /> : <PlayIcon />}
              Start
            </Button>
            <Button
              size="xs"
              variant="outline"
              disabled={isCommandPending || lifecycle?.running !== true}
              onClick={() => runCommand(stop, "stop", "Simulation stopped.")}
            >
              {stop.isPending ? <Loader2Icon className="animate-spin" /> : <SquareIcon />}
              Stop
            </Button>
            <Button
              size="xs"
              variant="ghost"
              className="ml-auto text-destructive"
              // Valid in either state — reset preserves the running/stopped
              // flag — so it is gated on the warning, not on `running`.
              disabled={isCommandPending}
              onClick={() => {
                setOpen(false);
                setConfirmResetOpen(true);
              }}
            >
              {reset.isPending ? <Loader2Icon className="animate-spin" /> : <RotateCcwIcon />}
              Reset
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      {/* Rendered as a sibling of the popover rather than inside it: the dialog
          portals outside the popover's DOM, and opening it from within would
          read as a click-outside and tear the popover down mid-transition. */}
      <AlertDialog open={confirmResetOpen} onOpenChange={setConfirmResetOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rewind the live demo?</AlertDialogTitle>
            <AlertDialogDescription>
              Reset reloads the world from the database. Every truck jumps back to its seeded
              position, and progress, ETAs and dock assignments rewind with it — for everyone
              watching, not just this browser. The loop keeps its current running or stopped
              state.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button
              variant="outline"
              disabled={reset.isPending}
              onClick={() => setConfirmResetOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={reset.isPending}
              onClick={() => {
                runCommand(reset, "reset", "Simulation reset — live state rewound.");
                setConfirmResetOpen(false);
              }}
            >
              {reset.isPending ? <Loader2Icon className="animate-spin" /> : <RotateCcwIcon />}
              Reset simulation
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

/** Grey until the loop has actually reported — an unknown loop must not read as
 * a stopped one. */
function statusDotClass(lifecycle: SimulationLifecycle | undefined): string {
  if (!lifecycle) return "bg-muted-foreground/40";
  if (lifecycle.lastTickError) return "bg-destructive";
  return lifecycle.running ? "bg-success" : "bg-muted-foreground/40";
}
