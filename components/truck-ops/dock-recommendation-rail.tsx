"use client";

import { useState } from "react";
import { ChevronDownIcon, RefreshCwIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { CardSkeleton } from "@/components/ui/loading-skeleton";
import { useAssignDock } from "@/features/docks";
import { resolveDockCode } from "@/features/docks/dock-code";
import { dockCommandError } from "@/features/docks/errors";
import { useDockRecommendations } from "@/features/trucks";
import { formatTime } from "@/lib/format";
import { notify } from "@/lib/toast";
import type { DockAssignmentResult, DockRecommendationsResponse } from "@/types";

import { DockOptionCard } from "./dock-option-card";

/** The assignment response is a superset of the recommendations response, so
 * one surface renders both — after a commit it simply has more to show. */
function isAssignmentResult(
  data: DockRecommendationsResponse | DockAssignmentResult,
): data is DockAssignmentResult {
  return "assignment" in data;
}

/**
 * The reference's bottom section: every door the backend will take for this
 * truck, ranked, with its full explanation and the command to commit it.
 *
 * `GET /trucks/:truckId/dock-recommendations` is documented side-effect free —
 * a recommendation is a proposal, nothing is written — so the refresh control
 * is safe and the query carries no `staleTime`.
 *
 * The frontend never re-scores or re-ranks: the order is the array order the
 * backend returned, the score and its five components are printed as sent, and
 * a door that failed a hard filter appears in the exclusions list with the
 * backend's own sentence rather than being silently dropped (AGENTS.md).
 */
export function DockRecommendationRail({ truckId }: { truckId: string }) {
  const query = useDockRecommendations(truckId);
  const assign = useAssignDock();
  const [showExcluded, setShowExcluded] = useState(false);

  // Derived during render rather than synced in an effect — the React Compiler
  // lint rules in this project forbid setState-in-effect.
  const failure = assign.error ? dockCommandError(assign.error, "Could not assign a dock.") : null;

  function handleAssign(dockId?: string) {
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
        onError: (error) =>
          notify.error(dockCommandError(error, "Could not assign a dock.").message),
      },
    );
  }

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>Recommended dock assignment</CardTitle>
        <CardAction>
          <Button
            size="sm"
            variant="outline"
            disabled={query.isFetching}
            onClick={() => void query.refetch()}
          >
            <RefreshCwIcon />
            {query.isFetching ? "Re-scoring…" : "Re-check"}
          </Button>
        </CardAction>
      </CardHeader>

      <CardContent className="flex flex-col gap-3">
        {query.isPending ? (
          <div className="flex gap-3">
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </div>
        ) : query.isError ? (
          <ErrorState
            title="Could not load recommendations"
            message={
              dockCommandError(query.error, "Could not load dock recommendations.").message
            }
            onRetry={() => void query.refetch()}
          />
        ) : (
          <RailBody
            data={query.data}
            isPending={assign.isPending}
            failure={failure}
            onAssign={handleAssign}
            onRecheck={() => void query.refetch()}
            showExcluded={showExcluded}
            onShowExcludedChange={setShowExcluded}
          />
        )}
      </CardContent>
    </Card>
  );
}

interface RailBodyProps {
  data: DockRecommendationsResponse | DockAssignmentResult;
  isPending: boolean;
  failure: { message: string; isConflict: boolean } | null;
  onAssign: (dockId?: string) => void;
  onRecheck: () => void;
  showExcluded: boolean;
  onShowExcludedChange: (open: boolean) => void;
}

function RailBody({
  data,
  isPending,
  failure,
  onAssign,
  onRecheck,
  showExcluded,
  onShowExcludedChange,
}: RailBodyProps) {
  const committed = isAssignmentResult(data) ? data : null;
  const currentDockId = data.currentAssignment?.dockDoorId ?? null;
  const committedCode = committed
    ? resolveDockCode(committed, committed.assignment.dockDoorId)
    : null;
  // Unlike the assignment row, `previousAssignment` carries its own dock code.
  const previousCode = committed?.previousAssignment?.dockCode ?? null;

  return (
    <>
      {/* The slot the doors were scored against — the later of ETA and the
          booked window, plus the expected dock time. The backend computed it;
          this line only reads it back. */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-2xs text-muted-foreground">
        <span className="tabular-nums">
          Scored against {formatTime(data.requestedWindow.start)}–
          {formatTime(data.requestedWindow.end)} ({data.requestedWindow.minutes} min)
        </span>
        <span>·</span>
        {data.currentAssignment ? (
          <span>
            Currently assigned:{" "}
            <span className="font-medium text-foreground">
              {data.currentAssignment.dockCode}
            </span>
          </span>
        ) : (
          <span>No dock assigned</span>
        )}
        <Badge variant="outline">{data.shipment.priority}</Badge>
        <Badge variant="outline">{data.shipment.loadType}</Badge>
      </div>

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
            <Button size="xs" variant="outline" className="mt-1.5" onClick={onRecheck}>
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
        // A plain overflow container, not `ScrollArea`: that primitive is
        // vertical-only as wrapped here (its Root renders its own vertical
        // ScrollBar and takes no orientation), and a horizontal strip wants the
        // platform scrollbar anyway.
        <div className="-mx-1 overflow-x-auto px-1 pb-1">
          <div className="flex items-stretch gap-3">
            {data.recommendations.map((recommendation, index) => (
              <DockOptionCard
                key={recommendation.dockId}
                recommendation={recommendation}
                rank={index}
                isCurrentAssignment={recommendation.dockId === currentDockId}
                isPending={isPending}
                onAssign={onAssign}
              />
            ))}
          </div>
        </div>
      )}

      {data.excluded.length > 0 ? (
        <Collapsible open={showExcluded} onOpenChange={onShowExcludedChange}>
          <CollapsibleTrigger
            render={
              <Button size="sm" variant="ghost" className="w-full justify-between">
                <span>{data.excluded.length} dock(s) excluded</span>
                <ChevronDownIcon />
              </Button>
            }
          />
          <CollapsibleContent>
            <ul className="grid gap-1 pt-1.5 sm:grid-cols-2 lg:grid-cols-3">
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
    </>
  );
}
