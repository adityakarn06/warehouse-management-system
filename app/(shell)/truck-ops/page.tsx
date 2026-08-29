"use client";

import { useState } from "react";

import { PageShell } from "@/components/layout/page-shell";
import { FleetToolbar } from "@/components/fleet/fleet-toolbar";
import { TruckRoster } from "@/components/truck-ops/truck-roster";
import type { TruckStatus } from "@/types";

export default function TruckOpsPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<TruckStatus | null>(null);

  return (
    <PageShell
      title="Truck operations"
      description="Pick a truck to see its load, its live position, and the doors the backend will take it at."
      actions={
        <FleetToolbar
          search={search}
          onSearchChange={setSearch}
          status={status}
          onStatusChange={setStatus}
        />
      }
    >
      <TruckRoster search={search} status={status} />
    </PageShell>
  );
}
