"use client";

import { useState } from "react";
import { RadioIcon } from "lucide-react";

import { PageShell } from "@/components/layout/page-shell";
import { WmsLiveState } from "@/components/wms/wms-live-state";
import { WmsScenarioCard, type WmsScenarioMeta } from "@/components/wms/wms-scenario-card";
import { WmsStepList } from "@/components/wms/wms-step-list";
import { EmptyState } from "@/components/ui/empty-state";
import { useDashboardSnapshot } from "@/features/yard";
import { useRunWmsSimulation, wmsCommandError } from "@/features/wms";
import { notify } from "@/lib/toast";
import type { WmsScenario, WmsSimulateResult } from "@/types";

/**
 * The scenario table from `docs/api.md` §`POST /api/v1/wms/simulate`, kept as
 * static contract copy so an operator can see the script before running it. The
 * names come from `wmsScenarioSchema`, which stays the single source of the
 * enum.
 */
const SCENARIOS: WmsScenarioMeta[] = [
  {
    scenario: "TRAILER_ARRIVAL",
    label: "Trailer arrival",
    description:
      "The default scenario. TRL-101 reports in from the road, arrives, and backs into D2. Moves seeded demo rows — `pnpm db:seed` resets it.",
    sequence: [
      "TRAILER_LOCATION_UPDATED",
      "TRAILER_STATUS_UPDATED (ARRIVING)",
      "TRAILER_ARRIVED",
      "TRAILER_DOCKED (D2)",
    ],
    endsWith: "D2 OCCUPIED, TRK-101 DOCKED, SHP-1001 DOCKED.",
  },
  {
    scenario: "DOCK_OCCUPANCY",
    label: "Dock occupancy",
    description:
      "A trailer physically backs into D3 and then leaves it again. Self-reversing, so it is safe to repeat.",
    sequence: ["DOCK_STATUS_UPDATED (OCCUPIED)", "DOCK_STATUS_UPDATED (AVAILABLE)"],
    endsWith: "D3 back to AVAILABLE.",
  },
  {
    scenario: "APPOINTMENT_SHIFT",
    label: "Appointment shift",
    description:
      "APT-2001 is pushed out 60 minutes. Raises no realtime event by design — its effect is on the scoring engine, which re-ranks dock recommendations for TRK-101.",
    sequence: ["APPOINTMENT_UPDATED"],
    endsWith: "Re-ranked dock recommendations for TRK-101.",
  },
];

/**
 * The WMS feed — an external warehouse system pushing operational facts at the
 * backend over HTTP (docs/api.md §WMS). `POST /wms/simulate` replays a fixed,
 * deterministic sequence through the exact same handler the live feed uses, so
 * whatever a scenario proves here, the real endpoint does too.
 *
 * Every value on this page comes from one of two places: the command response,
 * or a Zustand store the socket layer wrote. The panel adds no WMS logic of its
 * own — it does not predict a scenario's outcome, mark a run complete on its
 * own authority, or reconcile the two views. WMS is a source of facts, not a
 * second state model.
 */
export default function WmsPage() {
  // Seeds the dock store from the yard snapshot and joins the `operations`
  // room, so the consequences of a run actually land while the page is open.
  // `subscribe:operations` acks with trucks only — docks have no other source.
  useDashboardSnapshot();

  const [lastResult, setLastResult] = useState<WmsSimulateResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const runSimulation = useRunWmsSimulation();

  function run(scenario: WmsScenario) {
    setErrorMessage(null);
    runSimulation.mutate(scenario, {
      onSuccess: (result) => setLastResult(result),
      onError: (error) => {
        const message = wmsCommandError(error, `Could not run ${scenario}.`);
        // The run never reached the handler, so there are no steps to show —
        // leave the previous result standing rather than inventing a partial one.
        setErrorMessage(message);
        notify.error(message);
      },
    });
  }

  return (
    <PageShell
      title="WMS Feed"
      description="Deterministic scenarios replayed through the live WMS ingestion handler."
    >
      {errorMessage ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2">
          <p className="text-2xs text-destructive">{errorMessage}</p>
        </div>
      ) : null}

      <div className="grid gap-2 lg:grid-cols-3">
        {SCENARIOS.map((meta) => (
          <WmsScenarioCard
            key={meta.scenario}
            meta={meta}
            isRunning={runSimulation.isPending && runSimulation.variables === meta.scenario}
            // Every scenario mutates the same shared world — running two at once
            // would interleave two scripts against one set of rows.
            disabled={runSimulation.isPending}
            onRun={run}
          />
        ))}
      </div>

      {lastResult ? (
        <>
          <WmsStepList result={lastResult} />
          <WmsLiveState result={lastResult} />
        </>
      ) : (
        <EmptyState
          icon={RadioIcon}
          title="No run yet"
          description="Trigger a scenario to see the step-by-step result the backend returned, and the live state the socket delivered."
        />
      )}
    </PageShell>
  );
}
