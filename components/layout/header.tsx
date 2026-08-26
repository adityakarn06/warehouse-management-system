"use client";

import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { useRealtimeStore } from "@/stores";

const statusLabel: Record<string, string> = {
  idle: "Not connected",
  connecting: "Connecting…",
  connected: "Live",
  reconnecting: "Reconnecting…",
  disconnected: "Disconnected",
  error: "Connection error",
};

const statusDotClass: Record<string, string> = {
  idle: "bg-muted-foreground/40",
  connecting: "bg-info animate-pulse",
  connected: "bg-success",
  reconnecting: "bg-warning animate-pulse",
  disconnected: "bg-muted-foreground/40",
  error: "bg-destructive",
};

export function Header() {
  const status = useRealtimeStore((state) => state.status);

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
