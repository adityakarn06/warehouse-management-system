"use client";

import { ClockIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { FieldLabel } from "@/components/ui/field-label";
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
        <FieldLabel icon={ClockIcon}>Estimated arrival</FieldLabel>
        <p className="text-lg font-semibold leading-tight tabular-nums">{formatDateTime(eta)}</p>
        <p className="text-xs text-muted-foreground tabular-nums">
          {formatCountdown(eta, now)}
          {isDelayed ? " · revised for the active delay" : null}
        </p>
      </CardContent>
    </Card>
  );
}
