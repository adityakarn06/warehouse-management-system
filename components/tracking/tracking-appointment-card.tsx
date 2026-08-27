"use client";

import { CalendarClockIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { formatDateTime, formatTime } from "@/lib/format";
import type { TrackingResult } from "@/types";

/** The booked dock window. `null` on the REST row when none is booked. */
export function TrackingAppointmentCard({
  appointmentWindow,
}: {
  appointmentWindow: NonNullable<TrackingResult["appointmentWindow"]>;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-1">
        <p className="flex items-center gap-1.5 text-[0.65rem] uppercase tracking-wide text-muted-foreground">
          <CalendarClockIcon className="size-3" />
          Appointment window
        </p>
        <p className="text-sm font-medium tabular-nums">
          {formatDateTime(appointmentWindow.start)} – {formatTime(appointmentWindow.end)}
        </p>
        <p className="text-xs text-muted-foreground tabular-nums">
          Expected {appointmentWindow.expectedDurationMinutes} min at the door
        </p>
      </CardContent>
    </Card>
  );
}
