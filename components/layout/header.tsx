"use client";

import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { useConnectionStatus } from "@/stores";
import type { ConnectionStatus } from "@/stores";

const statusLabel: Record<ConnectionStatus, string> = {
  IDLE: "Not connected",
  CONNECTING: "Connecting…",
  CONNECTED: "Live",
  RECONNECTING: "Reconnecting…",
  DISCONNECTED: "Disconnected",
  ERROR: "Connection error",
};

const statusDotClass: Record<ConnectionStatus, string> = {
  IDLE: "bg-muted-foreground/40",
  CONNECTING: "bg-info animate-pulse",
  CONNECTED: "bg-success",
  RECONNECTING: "bg-warning animate-pulse",
  DISCONNECTED: "bg-muted-foreground/40",
  ERROR: "bg-destructive",
};

export function Header() {
  const status = useConnectionStatus();

  return (
    <header className="flex h-12 shrink-0 items-center justify-between gap-2 border-b border-border px-4">
      <div className="flex items-center gap-2">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-1 data-vertical:h-4 data-vertical:self-auto" />
        <h1 className="text-sm font-medium">Control Tower</h1>
      </div>
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <span className={cn("size-1.5 rounded-full", statusDotClass[status])} />
        {statusLabel[status]}
      </div>
    </header>
  );
}
