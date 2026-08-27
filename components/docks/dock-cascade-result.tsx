import { AlertTriangleIcon, ArrowRightIcon, InfoIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import type { DockStatusUpdateResult, Reassignment } from "@/types";

/** Tone per `outcome`. Two of the three are failures that leave a truck needing
 * a human, and neither is allowed to read like a success. */
const OUTCOME_TONE: Record<Reassignment["outcome"], string> = {
  REASSIGNED: "border-border",
  NO_DOCK_AVAILABLE: "border-destructive/40 bg-destructive/5",
  REASSIGNMENT_FAILED: "border-destructive/40 bg-destructive/5",
};

function ReassignmentRow({ reassignment }: { reassignment: Reassignment }) {
  return (
    <li className={cn("rounded-md border px-2 py-1.5", OUTCOME_TONE[reassignment.outcome])}>
      {reassignment.outcome === "REASSIGNED" ? (
        <>
          <p className="flex items-center gap-1 font-medium text-foreground">
            {reassignment.truckReference}
            <span className="flex items-center gap-0.5 text-muted-foreground">
              {reassignment.previousDockCode}
              <ArrowRightIcon className="size-2.5" />
              {reassignment.newDockCode}
            </span>
            {reassignment.score !== null && reassignment.score !== undefined ? (
              <span className="tabular-nums text-muted-foreground">
                ({reassignment.score}/100)
              </span>
            ) : null}
          </p>
          {reassignment.reasons?.length ? (
            <p className="text-muted-foreground">{reassignment.reasons.join(" · ")}</p>
          ) : null}
        </>
      ) : reassignment.outcome === "NO_DOCK_AVAILABLE" ? (
        <p className="text-destructive">
          <span className="font-medium">{reassignment.truckReference}</span> — no compatible dock
          available. The truck is now unassigned.
        </p>
      ) : (
        <p className="text-destructive">
          <span className="font-medium">{reassignment.truckReference}</span> — reassignment failed.
          Still assigned to {reassignment.previousDockCode}; needs manual attention.
        </p>
      )}
    </li>
  );
}

/**
 * Reports what the backend actually did, including the failure cascade a
 * takedown triggers. Nothing here is inferred — every outcome, alert and moved
 * truck is read straight off the command response.
 */
export function DockCascadeResult({ result }: { result: DockStatusUpdateResult }) {
  const affected = result.affectedAssignments ?? [];
  const reassignments = result.reassignments ?? [];

  if (!result.changed) {
    return (
      <p className="flex items-center gap-1.5 rounded-md border border-border px-2 py-1.5 text-[0.65rem] text-muted-foreground">
        <InfoIcon className="size-3 shrink-0" />
        Already {result.dock.status.toLowerCase()} — nothing changed.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2 text-[0.65rem]">
      <p className="text-muted-foreground">
        <span className="font-medium text-foreground">{result.dock.code}</span> is now{" "}
        {result.dock.status}
        {result.dock.unavailableReason ? ` — ${result.dock.unavailableReason}` : ""}.
      </p>

      {result.alert ? (
        <p className="flex items-start gap-1.5 rounded-md border border-warning/40 bg-warning/5 px-2 py-1.5">
          <AlertTriangleIcon className="mt-0.5 size-3 shrink-0 text-warning" />
          <span>
            <span className="font-medium text-foreground">{result.alert.title}</span>{" "}
            <span className="text-muted-foreground">{result.alert.message}</span>
          </span>
        </p>
      ) : null}

      {affected.length > 0 ? (
        <p className="text-muted-foreground">
          {affected.length} booking(s) were on this door:{" "}
          {affected.map((assignment) => assignment.truck.reference).join(", ")}
        </p>
      ) : null}

      {reassignments.length > 0 ? (
        <ul className="flex flex-col gap-1">
          {reassignments.map((reassignment) => (
            <ReassignmentRow key={reassignment.truckId} reassignment={reassignment} />
          ))}
        </ul>
      ) : null}
    </div>
  );
}
