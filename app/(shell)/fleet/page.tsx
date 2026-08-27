"use client";

import { useState } from "react";

import { FleetGrid } from "@/components/fleet/fleet-grid";
import { FleetToolbar } from "@/components/fleet/fleet-toolbar";
import { PageShell } from "@/components/layout/page-shell";
import type { TruckStatus } from "@/types";

export default function FleetPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<TruckStatus | null>(null);

  return (
    <PageShell
      title="Fleet"
      description="Every active truck, its load, and its assigned door."
      actions={
        <FleetToolbar
          search={search}
          onSearchChange={setSearch}
          status={status}
          onStatusChange={setStatus}
        />
      }
    >
      <FleetGrid search={search} status={status} />
    </PageShell>
  );
}
