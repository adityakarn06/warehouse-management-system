"use client";

import { useEffect, useState } from "react";
import { WarehouseIcon } from "lucide-react";

import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { useDocks } from "@/features/docks";
import { dockCommandError } from "@/features/docks/errors";
import { cn } from "@/lib/utils";
import { useDockStore } from "@/stores/use-dock-store";
import type { DockListItem, DockStatus } from "@/types";

import { DockDoorCard } from "./dock-door-card";
import { DOCK_STATUS_ORDER, dockStatusFill, dockStatusLabel } from "./dock-status-fill";

type StatusFilter = DockStatus | "ALL";

/**
 * The operator's door board, as a side panel over the yard render.
 *
 * Every card is a `GET /docks` row with the live dock store overlaid, and every
 * command is `DockStatusAction` — the same control `/yard`'s board uses,
 * unchanged. Nothing here decides a door's status; the two commands it can send
 * are `AVAILABLE` and `UNAVAILABLE`, and the backend owns every consequence
 * including the reassignment cascade (AGENTS.md).
 */
export function DockDoorsSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="gap-0 sm:max-w-lg">
        <SheetHeader className="pb-3">
          <SheetTitle>Manage dock doors</SheetTitle>
          <SheetDescription>
            Every door as the backend last reported it, with live status overlaid. Taking one out of
            service hands the backend every affected truck to re-score.
          </SheetDescription>
        </SheetHeader>

        {/*
          The body is a child of the portal, so it only mounts while the sheet
          is open — which is what keeps `GET /docks` off the page's initial
          load, and resets the filter for free on close.
        */}
        <DockDoorsBoard />
      </SheetContent>
    </Sheet>
  );
}

function DockDoorsBoard() {
  const [filter, setFilter] = useState<StatusFilter>("ALL");
  const query = useDocks();
  const docksData = query.data?.data;

  // Seeds via `mergeFromSnapshot`, never `hydrateFromSnapshot` — the latter
  // *replaces* the whole map and would clobber the live state the page's own
  // overview snapshot established. Same reasoning as `DockOperationsBoard`.
  useEffect(() => {
    if (!docksData) return;
    useDockStore.getState().mergeFromSnapshot(
      docksData.map((dock) => {
        const assigned = dock.assignments?.find((entry) => entry.status === "ASSIGNED") ?? null;
        return {
          dockId: dock.id,
          code: dock.code,
          status: dock.status,
          occupyingTruckId: assigned?.truck.id ?? null,
          activeAssignmentId: assigned?.id ?? null,
          unavailableReason:
            dock.status === "UNAVAILABLE" ? (dock.unavailableReason ?? null) : null,
          // These rows only ever fill a gap, so the timestamp just has to be
          // old enough that any real event supersedes it.
          updatedAt: new Date(0).toISOString(),
        };
      }),
    );
  }, [docksData]);

  // The live status per door, read once here rather than per card, so the chips
  // bucket a door the same way its badge renders it — a door taken down inside
  // this sheet leaves "Available" immediately instead of on the next refetch.
  const liveDocks = useDockStore((s) => s.docksById);
  const statusOf = (dock: DockListItem): DockStatus => liveDocks[dock.id]?.status ?? dock.status;

  if (query.isPending) {
    return (
      <BoardScroll>
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-40 w-full rounded-lg" />
        ))}
      </BoardScroll>
    );
  }

  if (query.isError) {
    return (
      <BoardScroll>
        <ErrorState
          title="Could not load docks"
          message={dockCommandError(query.error, "Could not load the dock board.").message}
          onRetry={() => void query.refetch()}
        />
      </BoardScroll>
    );
  }

  const docks = query.data.data;
  const counts = DOCK_STATUS_ORDER.map((status) => ({
    status,
    count: docks.filter((dock) => statusOf(dock) === status).length,
  }));
  const visible = filter === "ALL" ? docks : docks.filter((dock) => statusOf(dock) === filter);

  return (
    <>
      <div className="flex flex-wrap gap-1 px-4 pb-3">
        <FilterChip
          label="All"
          count={docks.length}
          isActive={filter === "ALL"}
          onClick={() => setFilter("ALL")}
        />
        {counts.map((entry) => (
          <FilterChip
            key={entry.status}
            label={dockStatusLabel(entry.status)}
            count={entry.count}
            dot={dockStatusFill[entry.status]}
            isActive={filter === entry.status}
            onClick={() => setFilter(entry.status)}
          />
        ))}
      </div>

      <BoardScroll>
        {visible.length === 0 ? (
          <EmptyState
            icon={WarehouseIcon}
            title={
              filter === "ALL" ? "No docks" : `No ${dockStatusLabel(filter).toLowerCase()} doors`
            }
            description={
              filter === "ALL"
                ? "The backend returned no dock doors for this warehouse."
                : "Every door is in another status right now."
            }
          />
        ) : (
          visible.map((dock) => <DockDoorCard key={dock.id} dock={dock} />)
        )}
      </BoardScroll>
    </>
  );
}

function BoardScroll({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-4 pb-4">{children}</div>
  );
}

function FilterChip({
  label,
  count,
  dot,
  isActive,
  onClick,
}: {
  label: string;
  count: number;
  dot?: string;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={isActive}
      className={cn(
        "flex items-center gap-1.5 rounded-sm border px-1.5 py-0.5 text-2xs transition-colors",
        isActive
          ? "border-primary bg-primary/10 text-foreground"
          : "border-border text-muted-foreground hover:bg-muted",
      )}
    >
      {dot ? <span aria-hidden className={cn("size-1.5 rounded-full", dot)} /> : null}
      {label}
      <span className="tabular-nums">{count}</span>
    </button>
  );
}
