"use client";

import { CalendarClockIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { FieldLabel } from "@/components/ui/field-label";
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
        <FieldLabel icon={CalendarClockIcon}>Appointment window</FieldLabel>
        <p className="text-lg font-semibold leading-tight tabular-nums">
          {formatDateTime(appointmentWindow.start)} – {formatTime(appointmentWindow.end)}
        </p>
        <p className="text-xs text-muted-foreground tabular-nums">
          Expected {appointmentWindow.expectedDurationMinutes} min at the door
        </p>
      </CardContent>
    </Card>
  );
}
