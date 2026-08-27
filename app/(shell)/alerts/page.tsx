"use client";

import { useState } from "react";
import { BellIcon } from "lucide-react";

import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { alertSeverityBorder, StatusBadge } from "@/components/ui/status-badge";
import { Badge } from "@/components/ui/badge";
import { TableSkeleton } from "@/components/ui/loading-skeleton";
import { useAlertFeed } from "@/features/alerts";
import { useNow } from "@/hooks/use-now";
import { formatRelativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useAlertStore, useAlerts } from "@/stores";
import type { AlertSeverity, AlertType } from "@/types";

const SEVERITIES: AlertSeverity[] = ["INFO", "WARNING", "CRITICAL"];

const TYPES: AlertType[] = [
  "TRUCK_DELAYED",
  "DOCK_UNAVAILABLE",
  "DOCK_REASSIGNMENT",
  "NO_DOCK_AVAILABLE",
  "TRUCK_ARRIVING",
];

/**
 * The persistent alert history — the source of truth for what happened, with
 * toasts as the transient companion.
 *
 * Filtering is client-side over the Zustand feed rather than refetching
 * `GET /alerts?type=…`: the store already merges the REST history with every
 * alert the socket has pushed since, and a per-filter refetch would both poll
 * an endpoint the contract says not to poll and hit the store's one-shot
 * `hasSeeded` latch, dropping the live rows.
 */
export default function AlertsPage() {
  const query = useAlertFeed();
  const alerts = useAlerts();
  const now = useNow();
  const markRead = useAlertStore((s) => s.markRead);
  const markAllRead = useAlertStore((s) => s.markAllRead);

  const [severity, setSeverity] = useState<AlertSeverity | null>(null);
  const [type, setType] = useState<AlertType | null>(null);

  const visible = alerts.filter(
    (alert) =>
      (severity === null || alert.severity === severity) &&
      (type === null || alert.type === type),
  );

  // A failed history fetch must not blank the page: the socket may still be
  // connected and pushing alerts into the store, which the header bell and the
  // dashboard feed are already showing. Only fall back to a full error state
  // when there is genuinely nothing to render.
  const historyError = query.isError
    ? query.error instanceof Error
      ? query.error.message
      : "Failed to load alert history."
    : null;

  if (historyError && alerts.length === 0) {
    return (
      <PageShell title="Alerts" description="Everything the backend has raised.">
        <ErrorState message={historyError} onRetry={() => void query.refetch()} />
      </PageShell>
    );
  }

  return (
    <PageShell title="Alerts" description="Everything the backend has raised.">
      {historyError ? (
        <div className="flex items-center justify-between gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2">
          <p className="text-2xs text-destructive">
            {historyError} Showing live alerts only.
          </p>
          <Button size="xs" variant="outline" onClick={() => void query.refetch()}>
            Retry
          </Button>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-xs font-medium text-muted-foreground">Severity</span>
        <Button size="xs" variant={severity === null ? "secondary" : "ghost"} onClick={() => setSeverity(null)}>
          All
        </Button>
        {SEVERITIES.map((value) => (
          <Button
            key={value}
            size="xs"
            variant={severity === value ? "secondary" : "ghost"}
            onClick={() => setSeverity(severity === value ? null : value)}
          >
            {value}
          </Button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-xs font-medium text-muted-foreground">Type</span>
        <Button size="xs" variant={type === null ? "secondary" : "ghost"} onClick={() => setType(null)}>
          All
        </Button>
        {TYPES.map((value) => (
          <Button
            key={value}
            size="xs"
            variant={type === value ? "secondary" : "ghost"}
            onClick={() => setType(type === value ? null : value)}
          >
            {value.replace(/_/g, " ")}
          </Button>
        ))}
        <Button size="xs" variant="ghost" className="ml-auto" onClick={markAllRead}>
          Mark all read
        </Button>
      </div>

      {query.isPending && alerts.length === 0 ? (
        <TableSkeleton rows={8} />
      ) : visible.length === 0 ? (
        <EmptyState
          icon={BellIcon}
          title="No alerts"
          description={
            alerts.length === 0
              ? "Nothing has been raised yet."
              : "No alerts match the current filters."
          }
        />
      ) : (
        <ul className="flex flex-col gap-1.5">
          {visible.map((alert) => (
            <li key={alert.id}>
              <button
                type="button"
                onClick={() => markRead(alert.id)}
                className={cn(
                  "flex w-full flex-col gap-1 rounded-md border border-border border-l-2 px-3 py-2 text-left transition-colors hover:bg-muted/60",
                  alertSeverityBorder[alert.severity],
                  alert.isRead ? "opacity-60" : "bg-muted/30",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-xs font-medium">{alert.title}</span>
                  <StatusBadge domain="alertSeverity" value={alert.severity} />
                </div>
                <p className="text-2xs text-muted-foreground">{alert.message}</p>
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge variant="secondary">{alert.type.replace(/_/g, " ")}</Badge>
                  {alert.truckId ? <Badge variant="outline">{alert.truckId}</Badge> : null}
                  {alert.dockDoorId ? <Badge variant="outline">{alert.dockDoorId}</Badge> : null}
                  <span className="text-2xs text-muted-foreground">
                    {formatRelativeTime(alert.createdAt, now)}
                  </span>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </PageShell>
  );
}
