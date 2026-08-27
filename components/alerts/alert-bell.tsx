"use client";

import { BellIcon } from "lucide-react";

import { AlertFeed } from "@/components/alerts/alert-feed";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useHighestUnreadSeverity, useUnreadAlertCount } from "@/stores/selectors";

/** Red for critical, amber for warning, neutral/blue for info. */
const severityDot = {
  CRITICAL: "bg-destructive text-white",
  WARNING: "bg-warning text-warning-foreground",
  INFO: "bg-info text-info-foreground",
} as const;

/**
 * Lives in the shell header, so the unread count is on every route.
 *
 * Both selectors return scalars, which matters: this component is in the
 * layout, and subscribing to the whole `alerts` array here would re-render the
 * app chrome on every pushed alert.
 */
export function AlertBell() {
  const unreadCount = useUnreadAlertCount();
  const severity = useHighestUnreadSeverity();

  return (
    <Sheet>
      <SheetTrigger
        render={
          <Button size="icon" variant="ghost" className="relative" aria-label="Alerts">
            <BellIcon />
            {unreadCount > 0 && severity ? (
              <span
                className={cn(
                  "absolute -top-0.5 -right-0.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full px-1 text-[0.55rem] font-semibold tabular-nums",
                  severityDot[severity],
                )}
              >
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            ) : null}
          </Button>
        }
      />
      <SheetContent side="right" className="gap-0">
        <SheetHeader>
          <SheetTitle>Alerts</SheetTitle>
          <SheetDescription>
            Pushed by the backend as they happen. The full history lives on the Alerts page.
          </SheetDescription>
        </SheetHeader>
        <div className="flex min-h-0 flex-1 flex-col px-4 pb-4">
          <AlertFeed />
        </div>
      </SheetContent>
    </Sheet>
  );
}
