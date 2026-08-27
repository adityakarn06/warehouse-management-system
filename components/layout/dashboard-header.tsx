"use client";

import { TruckIcon } from "lucide-react";

import { AlertBell } from "@/components/alerts/alert-bell";
import { ConnectionIndicator } from "@/components/layout/connection-indicator";
import { SimulationControl } from "@/components/simulation/simulation-control";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";

export function DashboardHeader() {
  return (
    <header className="flex h-12 shrink-0 items-center justify-between gap-2 border-b border-border px-4">
      <div className="flex items-center gap-2">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-1 data-vertical:h-4 data-vertical:self-auto" />
        <div className="flex items-center gap-1.5">
          <TruckIcon className="size-4 text-primary" />
          <span className="text-sm font-semibold tracking-tight">E2</span>
        </div>
        <Separator orientation="vertical" className="data-vertical:h-4 data-vertical:self-auto" />
        <h1 className="text-sm font-medium">Control Tower</h1>
      </div>
      {/* The simulation control lives in the app shell, so it stays reachable
          from /yard, /wms and /alerts mid-demo — not just /dashboard. */}
      <div className="flex items-center gap-1">
        <SimulationControl />
        <AlertBell />
        <ConnectionIndicator />
      </div>
    </header>
  );
}
