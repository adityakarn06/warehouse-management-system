"use client";

import { cn } from "@/lib/utils";
import { useConnectionStatus, useRealtimeStore, useSocketId, type ConnectionStatus } from "@/stores";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

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

export function ConnectionIndicator() {
  // Read the four fields individually rather than through `useRealtime()`:
  // that hook also subscribes to `lastEventAt`, which every inbound socket
  // event bumps (a position tick per truck, every 2s). This indicator sits in
  // the app-shell layout, so the aggregate would re-render the header of every
  // route several times a second to show a string that only changes on
  // connect/disconnect.
  const status = useConnectionStatus();
  const socketId = useSocketId();
  const lastConnectedAt = useRealtimeStore((s) => s.lastConnectedAt);
  const lastError = useRealtimeStore((s) => s.lastError);

  return (
    <Tooltip>
      <TooltipTrigger className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <span className={cn("size-1.5 rounded-full", statusDotClass[status])} />
        {statusLabel[status]}
      </TooltipTrigger>
      <TooltipContent>
        <div className="flex flex-col gap-0.5">
          <span>{socketId ? `Socket ${socketId}` : "No active socket"}</span>
          {lastConnectedAt ? (
            <span>Last connected {new Date(lastConnectedAt).toLocaleTimeString()}</span>
          ) : null}
          {lastError ? <span className="text-destructive-foreground">{lastError}</span> : null}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
