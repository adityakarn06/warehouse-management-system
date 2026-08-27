"use client";

import { BellIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ScrollArea } from "@/components/ui/scroll-area";
import { alertSeverityBorder, StatusBadge } from "@/components/ui/status-badge";
import { useNow } from "@/hooks/use-now";
import { formatRelativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useAlertStore, useAlerts, useUnreadAlertCount } from "@/stores";

interface AlertFeedProps {
  /** Caps the rows rendered — the dashboard panel shows a slice, the /alerts
   * page shows everything. The store keeps the full history either way. */
  limit?: number;
  className?: string;
}

export function AlertFeed({ limit, className }: AlertFeedProps) {
  const alerts = useAlerts();
  const now = useNow();
  const unreadCount = useUnreadAlertCount();
  const markAllRead = useAlertStore((s) => s.markAllRead);
  const markRead = useAlertStore((s) => s.markRead);

  const visible = limit === undefined ? alerts : alerts.slice(0, limit);

  return (
    <div className={cn("flex flex-1 flex-col gap-2 overflow-hidden", className)}>
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-medium text-muted-foreground">Live Alerts</h3>
        {unreadCount > 0 ? (
          <Button size="xs" variant="ghost" onClick={markAllRead}>
            Mark all read
          </Button>
        ) : null}
      </div>
      {visible.length === 0 ? (
        <EmptyState icon={BellIcon} title="No alerts" description="Live alerts will appear here." />
      ) : (
        <ScrollArea className="min-h-0 flex-1">
          <div className="flex flex-col gap-1 pr-2">
            {visible.map((alert) => (
              <button
                key={alert.id}
                type="button"
                onClick={() => markRead(alert.id)}
                className={cn(
                  "flex flex-col gap-1 rounded-md border border-border border-l-2 px-2 py-1.5 text-left transition-colors hover:bg-muted/60",
                  alertSeverityBorder[alert.severity],
                  // Read rows keep their severity colour but recede, so the
                  // unread/read split survives the new tinting.
                  alert.isRead ? "opacity-60" : "bg-muted/30",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-xs font-medium">{alert.title}</span>
                  <StatusBadge domain="alertSeverity" value={alert.severity} />
                </div>
                <p className="text-2xs text-muted-foreground">{alert.message}</p>
                <div className="flex items-center gap-1.5">
                  {/* Which of the five kinds this is, without reading the message. */}
                  <Badge variant="secondary">{alert.type.replace(/_/g, " ")}</Badge>
                  <span className="text-2xs text-muted-foreground">
                    {formatRelativeTime(alert.createdAt, now)}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
