"use client";

import { DockStatusAction } from "@/components/docks/dock-status-action";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { useAssignDock } from "@/features/docks";
import { resolveDockCode } from "@/features/docks/dock-code";
import { dockCommandError } from "@/features/docks/errors";
import { useLiveTruckFields } from "@/features/yard";
import { notify } from "@/lib/toast";
import { useAssignmentForTruck, useDock } from "@/stores";
import type { TruckDetail } from "@/types";

import { toMapTruck } from "./live-truck";

/**
 * The page's command bar.
 *
 * The reference's "Dispatch truck" and "View manifest" have no endpoint behind
 * them — `flows/api.md` exposes no dispatch, depart or manifest route; the only
 * writes in this domain are the assignment commit, the dock status toggle and
 * the release. Rather than render buttons that cannot work, the primary action
 * is the one an operator on this screen actually wants: commit the backend's
 * own top-ranked door.
 *
 * "Assign top recommendation" posts with **no body**, which `flows/api.md`
 * defines as "commit the top-ranked recommendation" — the ranking stays the
 * backend's, and the frontend never names a door it chose itself.
 */
export function TruckOpsActions({ truck }: { truck: TruckDetail }) {
  const live = useLiveTruckFields(toMapTruck(truck));
  const assign = useAssignDock();

  // The live current-dock fact, from the dock store rather than the REST row:
  // a DOCK_ASSIGNED or DOCK_REASSIGNED tick moves this without a refetch.
  const assignment = useAssignmentForTruck(truck.id);
  const liveDock = useDock(assignment?.dockDoorId ?? null);

  function handleAssignTop() {
    assign.mutate(
      { truckId: truck.id },
      {
        onSuccess: (result) => {
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
    <div className="flex flex-wrap items-center gap-2">
      <StatusBadge domain="truck" value={live.status} showIcon />

      {/* Release is only offered when the truck actually holds a door, and it
          is the same `DockStatusAction` `/yard` and `/new-yard` use, so the
          three surfaces cannot drift apart. `hasAssignment` is read from the
          server's assignment row, never inferred from the door's status. */}
      {assignment && liveDock ? (
        <DockStatusAction
          dockId={assignment.dockDoorId}
          code={assignment.dockCode ?? liveDock.code}
          status={liveDock.status}
          hasAssignment
        />
      ) : null}

      <Button disabled={assign.isPending} onClick={handleAssignTop}>
        {assign.isPending ? "Assigning…" : "Assign top recommendation"}
      </Button>
    </div>
  );
}
