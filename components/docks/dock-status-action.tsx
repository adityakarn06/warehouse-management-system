"use client";

import { useState } from "react";

import { DockCascadeResult } from "@/components/docks/dock-cascade-result";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useReleaseDock, useUpdateDockStatus } from "@/features/docks";
import { dockCommandError } from "@/features/docks/errors";
import { notify } from "@/lib/toast";
import type { DockStatus } from "@/types";

/** Matches the backend's own default (docs/api.md). Prefilled so the operator
 * can see what will be recorded, but an unchanged/blank box sends no `reason`
 * at all and lets the backend apply this same default itself. */
const DEFAULT_REASON = "Marked unavailable by operations";

interface DockStatusActionProps {
  dockId: string;
  code: string;
  status: DockStatus;
  /** Whether a truck currently holds this door — drives the cascade warning.
   * Read from the server's assignment row, never inferred from the status. */
  hasAssignment: boolean;
  size?: "xs" | "sm";
  className?: string;
}

/**
 * The operator's two buttons. The frontend only ever sends `AVAILABLE` or
 * `UNAVAILABLE`; `RESERVED` and `OCCUPIED` are owned by the assignment engine
 * and the WMS feed, so those doors get no toggle at all (AGENTS.md §2).
 */
export function DockStatusAction({
  dockId,
  code,
  status,
  hasAssignment,
  size = "sm",
  className,
}: DockStatusActionProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [reason, setReason] = useState(DEFAULT_REASON);
  const mutation = useUpdateDockStatus();
  const release = useReleaseDock();

  const anyPending = mutation.isPending || release.isPending;

  const failure = mutation.error
    ? dockCommandError(mutation.error, `Could not update ${code}.`)
    : null;

  function handleConfirm() {
    const trimmed = reason.trim();
    mutation.mutate(
      {
        id: dockId,
        // Omitted when blank so the backend applies its own default rather
        // than this board inventing one.
        body: { status: "UNAVAILABLE", ...(trimmed ? { reason: trimmed } : {}) },
      },
      {
        onSuccess: (result) =>
          notify.warning(
            result.changed ? `${code} is now out of service` : `${code} was already out of service`,
          ),
        onError: (error) =>
          notify.error(dockCommandError(error, `Could not update ${code}.`).message),
      },
    );
  }

  function handleOpenChange(open: boolean) {
    setIsOpen(open);
    // Reset on close so a reopened dialog never shows a stale result or the
    // previous reason. Done in the handler, not an effect (React Compiler).
    if (!open) {
      mutation.reset();
      setReason(DEFAULT_REASON);
    }
  }

  function handleRelease() {
    release.mutate(dockId, {
      onSuccess: (result) =>
        notify.success(
          result.releasedAssignmentIds.length > 0
            ? `${result.dockCode} released — now ${result.status}`
            : `${result.dockCode} held no committed booking`,
        ),
      onError: (error) => notify.error(dockCommandError(error, `Could not release ${code}.`).message),
    });
  }

  function handleMakeAvailable() {
    mutation.mutate(
      { id: dockId, body: { status: "AVAILABLE" } },
      {
        onSuccess: (result) =>
          notify.success(
            result.changed
              ? `${code} is now ${result.dock.status}`
              : `${code} was already ${result.dock.status}`,
          ),
        onError: (error) =>
          notify.error(dockCommandError(error, `Could not update ${code}.`).message),
      },
    );
  }

  // The action offered depends on the *current* status, which flips the moment
  // a command succeeds. The dialog below must not be part of that decision.
  const action =
    status === "RESERVED" || status === "OCCUPIED" ? (
      <Tooltip>
        <TooltipTrigger
          render={
            <Button size={size} variant="ghost" disabled className={className}>
              No action
            </Button>
          }
        />
        <TooltipContent>
          {status === "RESERVED" ? "Reserved" : "Occupied"} is owned by the backend — release or
          reassign the booking instead.
        </TooltipContent>
      </Tooltip>
    ) : status === "UNAVAILABLE" ? (
      // Putting a door back into service needs no confirmation: it is not
      // destructive, and the backend decides the resulting status anyway (a
      // door still holding a booking comes back RESERVED, not AVAILABLE).
      <Button
        size={size}
        variant="outline"
        disabled={anyPending}
        className={className}
        onClick={handleMakeAvailable}
      >
        {mutation.isPending ? "Working…" : "Make available"}
      </Button>
    ) : (
      <Button
        size={size}
        variant="destructive"
        className={className}
        onClick={() => {
          // The same mutation backs "Make available", whose result is never
          // cleared (that only happens when this dialog closes). Without this
          // reset, a door put back into service and then taken down again
          // opens straight onto the *previous* command's cascade report, with
          // no reason box and no confirm button.
          mutation.reset();
          setIsOpen(true);
        }}
      >
        Make unavailable
      </Button>
    );

  // Hands a door back to the yard — a distinct command from the
  // AVAILABLE/UNAVAILABLE toggle above (§8's release, not §7's status flip),
  // shown only when a booking actually holds the door. Releasing does not
  // repair an out-of-service door: the response's *resulting* status is
  // rendered verbatim, and a door that was UNAVAILABLE stays UNAVAILABLE.
  const releaseButton = hasAssignment ? (
    <Button
      size={size}
      variant="outline"
      disabled={anyPending}
      className={className}
      onClick={handleRelease}
    >
      {release.isPending ? "Releasing…" : "Release door"}
    </Button>
  ) : null;

  return (
    <>
      <div className="flex flex-col gap-1.5">
        {action}
        {releaseButton}
      </div>

      {/*
        Rendered independently of `status`. A successful takedown applies the
        backend's dock row to the store synchronously, so `status` flips to
        UNAVAILABLE in the same tick the command resolves — gating this on the
        status would unmount the dialog before it could ever show the cascade,
        discarding the report of which trucks were moved and which were left
        with nowhere to go.
      */}
      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {mutation.data ? `${code} taken out of service` : `Take ${code} out of service?`}
            </DialogTitle>
            <DialogDescription>
              {mutation.data
                ? "What the backend did in response:"
                : hasAssignment
                  ? "A truck is booked on this door. The backend will re-score every affected truck against the remaining doors and move it, or report that it has nowhere to go."
                  : "The door will stop accepting new assignments until it is put back into service."}
            </DialogDescription>
          </DialogHeader>

          {mutation.data ? (
            <DockCascadeResult result={mutation.data} />
          ) : (
            <div className="flex flex-col gap-1.5">
              <label htmlFor={`reason-${dockId}`} className="text-xs font-medium">
                Reason <span className="text-muted-foreground">(optional)</span>
              </label>
              <Textarea
                id={`reason-${dockId}`}
                value={reason}
                rows={3}
                onChange={(event) => setReason(event.target.value)}
                placeholder={DEFAULT_REASON}
              />
            </div>
          )}

          {failure ? (
            /* The backend's own message, unedited. */
            <p className="rounded-md border border-destructive/30 bg-destructive/5 px-2 py-1.5 text-2xs text-destructive">
              {failure.message}
            </p>
          ) : null}

          <DialogFooter>
            <DialogClose
              render={
                <Button size="sm" variant="outline">
                  {mutation.data ? "Close" : "Cancel"}
                </Button>
              }
            />
            {mutation.data ? null : (
              <Button
                size="sm"
                variant="destructive"
                disabled={anyPending}
                onClick={handleConfirm}
              >
                {mutation.isPending ? "Working…" : "Make unavailable"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
