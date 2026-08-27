"use client";

import { ClockIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { useNow } from "@/hooks/use-now";
import { formatCountdown, formatDateTime } from "@/lib/format";

/**
 * The backend's arrival instant, shown as an instant. The countdown beneath it
 * is presentation of that same value against the wall clock — never a second
 * opinion about it, and never a number this page computed. A truck holding a
 * constant speed emits no TRUCK_ETA_UPDATED at all (docs/realtime.md), so the
 * countdown is the only part of an on-schedule ETA that visibly moves.
 */
export function TrackingEtaCard({ eta, isDelayed }: { eta: string | null; isDelayed: boolean }) {
  const now = useNow();

  return (
    <Card>
      <CardContent className="flex flex-col gap-1">
        <p className="flex items-center gap-1.5 text-[0.65rem] uppercase tracking-wide text-muted-foreground">
          <ClockIcon className="size-3" />
          Estimated arrival
        </p>
        <p className="text-2xl font-semibold tabular-nums leading-tight">{formatDateTime(eta)}</p>
        <p className="text-xs text-muted-foreground tabular-nums">
          {formatCountdown(eta, now)}
          {isDelayed ? " · revised for the active delay" : null}
        </p>
      </CardContent>
    </Card>
  );
}
