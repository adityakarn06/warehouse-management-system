"use client";

import { useState } from "react";
import { ChevronDownIcon, TruckIcon } from "lucide-react";

import { DockRecommendationCard } from "@/components/docks/dock-recommendation-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { CardSkeleton } from "@/components/ui/loading-skeleton";
import { StatusBadge } from "@/components/ui/status-badge";
import { useAssignDock } from "@/features/docks";
import { resolveDockCode } from "@/features/docks/dock-code";
import { dockCommandError } from "@/features/docks/errors";
import { useDockRecommendations } from "@/features/trucks";
import { formatTime } from "@/lib/format";
import { notify } from "@/lib/toast";
import { useSelectedTruckId } from "@/stores/selectors";
import type { DockAssignmentResult, DockRecommendationsResponse } from "@/types";

/** The assignment response is a superset of the recommendations response, so
 * one panel renders both — after a commit it simply has more to show. */
function isAssignmentResult(
  data: DockRecommendationsResponse | DockAssignmentResult,
): data is DockAssignmentResult {
  return "assignment" in data;
}

export function DockRecommendationPanel() {
  const truckId = useSelectedTruckId();
  const query = useDockRecommendations(truckId ?? undefined);
  const assign = useAssignDock();
  const [showExcluded, setShowExcluded] = useState(false);

  // Derived during render rather than synced in an effect — the React Compiler
  // lint rules in this project forbid setState-in-effect.
  const failure = assign.error ? dockCommandError(assign.error, "Could not assign a dock.") : null;

  if (!truckId) {
    return (
      <EmptyState
        icon={TruckIcon}
        title="No truck selected"
        description="Select a truck to see the backend's ranked dock recommendations."
      />
    );
  }

  if (query.isPending) {
    return (
      <div className="flex flex-col gap-2">
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>
    );
  }

  if (query.isError) {
    return (
      <ErrorState
        title="Could not load recommendations"
        message={dockCommandError(query.error, "Could not load dock recommendations.").message}
        onRetry={() => void query.refetch()}
      />
    );
  }

  const data = query.data;
  const committed = isAssignmentResult(data) ? data : null;
  const currentDockId = data.currentAssignment?.dockDoorId ?? null;
  const committedCode = committed ? resolveDockCode(committed, committed.assignment.dockDoorId) : null;
  // Unlike the assignment row, `previousAssignment` carries its own dock code.
  const previousCode = committed?.previousAssignment?.dockCode ?? null;

  function handleAssign(dockId?: string) {
    if (!truckId) return;
    assign.mutate(
      { truckId, body: dockId ? { dockId } : undefined },
      {
        onSuccess: (result) => {
          // The assignment row identifies its door by id only; show the code.
          const code = resolveDockCode(result, result.assignment.dockDoorId);
          notify.success(
            result.created
              ? `${result.truck.reference} assigned to ${code ?? "its dock"}`
              : `${result.truck.reference} already held that dock`,
          );
        },
        onError: (error) => notify.error(dockCommandError(error, "Could not assign a dock.").message),
      },
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <header className="flex flex-col gap-1.5 rounded-lg border border-border bg-card p-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-semibold">{data.truck.reference}</span>
          <StatusBadge domain="truck" value={data.truck.status} />
        </div>
        <div className="flex flex-wrap items-center gap-1.5 text-2xs text-muted-foreground">
          <span className="font-medium text-foreground">{data.shipment.reference}</span>
          <Badge variant="outline">{data.shipment.priority}</Badge>
          <Badge variant="outline">{data.shipment.loadType}</Badge>
        </div>
        <p className="text-2xs text-muted-foreground">
          Scored against {formatTime(data.requestedWindow.start)}–
          {formatTime(data.requestedWindow.end)} ({data.requestedWindow.minutes} min)
        </p>
        {data.currentAssignment ? (
          <p className="text-2xs text-muted-foreground">
            Currently assigned:{" "}
            <span className="font-medium text-foreground">{data.currentAssignment.dockCode}</span>
          </p>
        ) : (
          <p className="text-2xs text-muted-foreground">No dock assigned</p>
        )}
      </header>

      {/* The backend's own result line for the last commit. */}
      {committed ? (
        <div className="rounded-lg border border-success/30 bg-success/5 p-2.5 text-2xs">
          <p className="font-medium text-foreground">
            {committed.created ? "Assignment created" : "Already assigned"}
            {committedCode ? ` · ${committedCode}` : ""}
          </p>
          {previousCode ? (
            <p className="text-muted-foreground">Moved from {previousCode}</p>
          ) : null}
        </div>
      ) : null}

      {failure ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-2.5">
          {/* The backend's sentence, unedited — a 400 here quotes the exact
              exclusion reason, which is the whole explanation. */}
          <p className="text-2xs text-destructive">{failure.message}</p>
          {failure.isConflict ? (
            <Button
              size="xs"
              variant="outline"
              className="mt-1.5"
              onClick={() => void query.refetch()}
            >
              Re-check recommendations
            </Button>
          ) : null}
        </div>
      ) : null}

      {data.recommendations.length === 0 ? (
        <EmptyState
          title="No compatible dock"
          description="The backend excluded every door for this truck. See the exclusions below."
        />
      ) : (
        <>
          <Button
            size="sm"
            variant="secondary"
            disabled={assign.isPending}
            onClick={() => handleAssign()}
          >
            {assign.isPending ? "Assigning…" : "Assign top recommendation"}
          </Button>

          <div className="flex flex-col gap-2">
            {data.recommendations.map((recommendation, index) => (
              <DockRecommendationCard
                key={recommendation.dockId}
                recommendation={recommendation}
                rank={index}
                isCurrentAssignment={recommendation.dockId === currentDockId}
                isPending={assign.isPending}
                onAssign={handleAssign}
              />
            ))}
          </div>
        </>
      )}

      {data.excluded.length > 0 ? (
        <Collapsible open={showExcluded} onOpenChange={setShowExcluded}>
          <CollapsibleTrigger
            render={
              <Button size="sm" variant="ghost" className="w-full justify-between">
                <span>{data.excluded.length} dock(s) excluded</span>
                <ChevronDownIcon />
              </Button>
            }
          />
          <CollapsibleContent>
            <ul className="flex flex-col gap-1 pt-1.5">
              {data.excluded.map((excluded) => (
                <li
                  key={excluded.dockId}
                  className="rounded-md border border-border px-2 py-1.5 text-2xs"
                >
                  <span className="font-medium text-foreground">{excluded.dockCode}</span>
                  <span className="text-muted-foreground"> — {excluded.reason}</span>
                </li>
              ))}
            </ul>
          </CollapsibleContent>
        </Collapsible>
      ) : null}
    </div>
  );
}
