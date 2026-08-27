"use client";

import { useState } from "react";
import { SendIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FieldLabel } from "@/components/ui/field-label";
import { Input } from "@/components/ui/input";
import { WmsResultDetails } from "@/components/wms/wms-result-details";
import { type useSendWmsEvent } from "@/features/wms";
import { wmsCommandError } from "@/features/wms/errors";
import { useNow } from "@/hooks/use-now";
import { formatSecondsAgo } from "@/lib/format";
import { notify } from "@/lib/toast";
import { useAlertStore } from "@/stores/use-alert-store";
import { useTruck } from "@/stores/selectors";
import { wmsEventSchema } from "@/schemas/wms.schema";
import type { WmsEvent, WmsEventResult } from "@/types";

/** Only these three event types can carry `yardLocation`. */
function sentYardLocation(event: WmsEvent): { lat: number; lng: number } | null {
  if (event.eventType === "TRAILER_LOCATION_UPDATED") return event.yardLocation;
  if (event.eventType === "TRAILER_STATUS_UPDATED" || event.eventType === "TRAILER_ARRIVED") {
    return event.yardLocation ?? null;
  }
  return null;
}

type WmsEventType = WmsEvent["eventType"];

const EVENT_TYPES: WmsEventType[] = [
  "TRAILER_LOCATION_UPDATED",
  "TRAILER_STATUS_UPDATED",
  "TRAILER_ARRIVED",
  "TRAILER_DOCKED",
  "DOCK_STATUS_UPDATED",
  "APPOINTMENT_UPDATED",
];

/** `DELAYED`/`DOCKED` are refused on `TRAILER_STATUS_UPDATED` — the delay
 * endpoints and `TRAILER_DOCKED` respectively own those transitions
 * (docs/api.md). Omitted here as a contract-level fact, not a guess; a
 * situational refusal (a 409 for "clear the delay first") still comes back
 * from the server and is rendered verbatim. */
const TRAILER_STATUS_OPTIONS = ["IN_TRANSIT", "ARRIVING", "ARRIVED", "COMPLETED"] as const;

/** `RESERVED` is the assignment engine's transition — refused (400) on this
 * event (docs/api.md). */
const DOCK_STATUS_OPTIONS = ["AVAILABLE", "OCCUPIED", "UNAVAILABLE"] as const;

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <FieldLabel>{label}</FieldLabel>
      {children}
    </div>
  );
}

function PillSelect<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly T[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1">
      {options.map((option) => (
        <Button
          key={option}
          type="button"
          size="xs"
          variant={value === option ? "secondary" : "ghost"}
          onClick={() => onChange(option)}
        >
          {option}
        </Button>
      ))}
    </div>
  );
}

/**
 * Per-event-type field set. Keyed by `eventType` from the parent so switching
 * types remounts this component and its local state resets — no effect
 * syncing fields to a changed prop (forbidden by this project's React
 * Compiler lint rules).
 */
function EventFields({
  eventType,
  onSubmit,
  pending,
}: {
  eventType: WmsEventType;
  onSubmit: (event: WmsEvent) => void;
  pending: boolean;
}) {
  const [trailerId, setTrailerId] = useState("TRL-101");
  const [lat, setLat] = useState("28.6");
  const [lng, setLng] = useState("77.2");
  const [progress, setProgress] = useState("");
  const [speedKmph, setSpeedKmph] = useState("");
  const [status, setStatus] = useState<(typeof TRAILER_STATUS_OPTIONS)[number]>("ARRIVING");
  const [eta, setEta] = useState("");
  const [includeYardLocation, setIncludeYardLocation] = useState(true);
  const [dockCode, setDockCode] = useState("D2");
  const [dockStatus, setDockStatus] = useState<(typeof DOCK_STATUS_OPTIONS)[number]>("UNAVAILABLE");
  const [reason, setReason] = useState("");
  const [appointmentReference, setAppointmentReference] = useState("APT-2001");
  const [windowStart, setWindowStart] = useState("");
  const [windowEnd, setWindowEnd] = useState("");
  const [expectedDurationMinutes, setExpectedDurationMinutes] = useState("");
  const [notes, setNotes] = useState("");

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const yardLocation =
      includeYardLocation && lat.trim() && lng.trim()
        ? { lat: Number(lat), lng: Number(lng) }
        : undefined;

    const draft: WmsEvent =
      eventType === "TRAILER_LOCATION_UPDATED"
        ? {
            eventType,
            trailerId,
            yardLocation: { lat: Number(lat), lng: Number(lng) },
            ...(progress.trim() ? { progress: Number(progress) } : {}),
            ...(speedKmph.trim() ? { speedKmph: Number(speedKmph) } : {}),
          }
        : eventType === "TRAILER_STATUS_UPDATED"
          ? {
              eventType,
              trailerId,
              status,
              ...(eta.trim() ? { eta } : {}),
              ...(yardLocation ? { yardLocation } : {}),
            }
          : eventType === "TRAILER_ARRIVED"
            ? { eventType, trailerId, ...(yardLocation ? { yardLocation } : {}) }
            : eventType === "TRAILER_DOCKED"
              ? { eventType, trailerId, dockCode }
              : eventType === "DOCK_STATUS_UPDATED"
                ? {
                    eventType,
                    dockCode,
                    status: dockStatus,
                    ...(reason.trim() ? { reason: reason.trim() } : {}),
                  }
                : {
                    eventType,
                    appointmentReference,
                    ...(windowStart.trim() ? { windowStart } : {}),
                    ...(windowEnd.trim() ? { windowEnd } : {}),
                    ...(expectedDurationMinutes.trim()
                      ? { expectedDurationMinutes: Number(expectedDurationMinutes) }
                      : {}),
                    ...(notes.trim() ? { notes: notes.trim() } : {}),
                  };

    const parsed = wmsEventSchema.safeParse(draft);
    if (!parsed.success) {
      notify.error(parsed.error.issues[0]?.message ?? "This event is missing a required field.");
      return;
    }
    onSubmit(parsed.data);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      {eventType === "TRAILER_LOCATION_UPDATED" || eventType === "TRAILER_STATUS_UPDATED" || eventType === "TRAILER_ARRIVED" || eventType === "TRAILER_DOCKED" ? (
        <Field label="Trailer ID">
          <Input value={trailerId} onChange={(event) => setTrailerId(event.target.value)} className="font-mono" />
        </Field>
      ) : null}

      {eventType === "TRAILER_LOCATION_UPDATED" ? (
        <>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Latitude">
              <Input value={lat} onChange={(event) => setLat(event.target.value)} inputMode="decimal" />
            </Field>
            <Field label="Longitude">
              <Input value={lng} onChange={(event) => setLng(event.target.value)} inputMode="decimal" />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Progress (optional)">
              <Input
                value={progress}
                onChange={(event) => setProgress(event.target.value)}
                placeholder="0–100"
                inputMode="decimal"
              />
            </Field>
            <Field label="Speed km/h (optional)">
              <Input
                value={speedKmph}
                onChange={(event) => setSpeedKmph(event.target.value)}
                inputMode="decimal"
              />
            </Field>
          </div>
          <p className="text-2xs text-muted-foreground">
            Send <code>progress</code> alongside a position while the simulation is running —
            without it, the engine recomputes the truck&apos;s position from its route on the next
            tick and this resync is corrected away (docs/api.md).
          </p>
        </>
      ) : null}

      {eventType === "TRAILER_STATUS_UPDATED" ? (
        <>
          <Field label="Status">
            <PillSelect options={TRAILER_STATUS_OPTIONS} value={status} onChange={setStatus} />
          </Field>
          <Field label="ETA (optional, ISO 8601)">
            <Input value={eta} onChange={(event) => setEta(event.target.value)} placeholder="2026-08-27T18:40:00.000Z" />
          </Field>
        </>
      ) : null}

      {eventType === "TRAILER_STATUS_UPDATED" || eventType === "TRAILER_ARRIVED" ? (
        <div className="flex flex-col gap-1.5">
          <label className="flex items-center gap-1.5 text-2xs text-muted-foreground">
            <input
              type="checkbox"
              checked={includeYardLocation}
              onChange={(event) => setIncludeYardLocation(event.target.checked)}
            />
            Include yard location (optional)
          </label>
          {includeYardLocation ? (
            <div className="grid grid-cols-2 gap-2">
              <Input value={lat} onChange={(event) => setLat(event.target.value)} inputMode="decimal" aria-label="Latitude" />
              <Input value={lng} onChange={(event) => setLng(event.target.value)} inputMode="decimal" aria-label="Longitude" />
            </div>
          ) : null}
        </div>
      ) : null}

      {eventType === "TRAILER_DOCKED" || eventType === "DOCK_STATUS_UPDATED" ? (
        <Field label="Dock code">
          <Input value={dockCode} onChange={(event) => setDockCode(event.target.value)} className="font-mono" />
        </Field>
      ) : null}

      {eventType === "DOCK_STATUS_UPDATED" ? (
        <>
          <Field label="Status">
            <PillSelect options={DOCK_STATUS_OPTIONS} value={dockStatus} onChange={setDockStatus} />
          </Field>
          <Field label="Reason (optional)">
            <Input value={reason} onChange={(event) => setReason(event.target.value)} placeholder="WMS: leveler fault" />
          </Field>
        </>
      ) : null}

      {eventType === "APPOINTMENT_UPDATED" ? (
        <>
          <Field label="Appointment reference">
            <Input
              value={appointmentReference}
              onChange={(event) => setAppointmentReference(event.target.value)}
              className="font-mono"
            />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Window start (optional, ISO 8601)">
              <Input value={windowStart} onChange={(event) => setWindowStart(event.target.value)} />
            </Field>
            <Field label="Window end (optional, ISO 8601)">
              <Input value={windowEnd} onChange={(event) => setWindowEnd(event.target.value)} />
            </Field>
          </div>
          <Field label="Expected duration, minutes (optional)">
            <Input
              value={expectedDurationMinutes}
              onChange={(event) => setExpectedDurationMinutes(event.target.value)}
              inputMode="numeric"
            />
          </Field>
          <Field label="Notes (optional)">
            <Input value={notes} onChange={(event) => setNotes(event.target.value)} />
          </Field>
        </>
      ) : null}

      <Button type="submit" size="sm" disabled={pending} className="self-start">
        <SendIcon />
        {pending ? "Sending…" : "Send event"}
      </Button>
    </form>
  );
}

/**
 * A hand-composed `POST /wms/events` request — the arbitrary event path the
 * three canned scenarios below never exercise. `useSendWmsEvent` was fully
 * wired with zero callers before this (docs/flows/08-wms-feed.md).
 *
 * Contract-level refusals (which status values belong to which endpoint) are
 * kept out of the picker entirely; a *situational* refusal — a delay that must
 * be cleared first, a door the truck does not hold — is left to the backend,
 * whose sentence is rendered verbatim (AGENTS.md §2: the backend is the
 * source of truth).
 */
export function WmsEventComposer({
  externalPending,
  sendMutation,
}: {
  /** True when any sibling command (scenario run, etc.) is in flight. */
  externalPending: boolean;
  /** The shared mutation returned by `useSendWmsEvent`. */
  sendMutation: ReturnType<typeof useSendWmsEvent>;
}) {
  const [eventType, setEventType] = useState<WmsEventType>("TRAILER_LOCATION_UPDATED");
  const [lastResult, setLastResult] = useState<WmsEventResult | null>(null);
  const [lastSentEvent, setLastSentEvent] = useState<WmsEvent | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const send = sendMutation;

  const pending = send.isPending || externalPending;

  function handleSubmit(event: WmsEvent) {
    setErrorMessage(null);
    // Clear the previous result so a failed submission cannot leave
    // lastSentEvent pointing at the new event while lastResult holds the
    // previous success.
    setLastResult(null);
    setLastSentEvent(null);
    send.mutate(event, {
      onSuccess: (result) => {
        setLastSentEvent(event);
        setLastResult(result);
        // The same `pushAlert` path every other command uses — `prependAlert`
        // dedupes on the server's `alertId`, so this and the socket's
        // `ALERT_CREATED` for the same activation collapse to one feed row
        // and one toast, whichever arrives first.
        if (result.alert) useAlertStore.getState().pushAlert(result.alert);
      },
      onError: (error) => {
        const message = wmsCommandError(error, "Could not send this event.");
        setErrorMessage(message);
        notify.error(message);
      },
    });
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border p-3">
      <div className="flex flex-col gap-1">
        <span className="text-xs font-semibold">Compose an event</span>
        <p className="text-2xs text-muted-foreground">
          Any of the six event types `POST /wms/events` accepts, sent by hand through the same
          handler the live feed and the canned scenarios use.
        </p>
      </div>

      <div className="flex flex-wrap gap-1">
        {EVENT_TYPES.map((type) => (
          <Button
            key={type}
            type="button"
            size="xs"
            variant={eventType === type ? "secondary" : "ghost"}
            onClick={() => {
              setEventType(type);
              setLastResult(null);
              setErrorMessage(null);
            }}
          >
            {type.replace(/_/g, " ")}
          </Button>
        ))}
      </div>

      <EventFields key={eventType} eventType={eventType} onSubmit={handleSubmit} pending={pending} />

      {errorMessage ? (
        <p className="rounded-sm bg-destructive/10 px-2 py-1.5 text-2xs text-destructive">
          {errorMessage}
        </p>
      ) : null}

      {lastResult ? (
        <div className="flex flex-col gap-1.5 rounded-md border border-border px-3 py-2">
          <div className="flex items-center gap-1.5">
            <span className="text-2xs font-medium">Result</span>
            <Badge variant="outline">{lastResult.eventType.replace(/_/g, " ")}</Badge>
          </div>
          <WmsResultDetails result={lastResult} />
          {lastResult.truckId && lastSentEvent ? (
            <YardPositionEcho truckId={lastResult.truckId} sentEvent={lastSentEvent} />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/**
 * A resync is only visibly a resync if the sent position and the resulting
 * live position sit next to each other — otherwise "yardLocation was applied"
 * is a claim, not something shown. Renders nothing if the event carried no
 * `yardLocation` or the store has not (yet) picked up the truck.
 */
function YardPositionEcho({ truckId, sentEvent }: { truckId: string; sentEvent: WmsEvent }) {
  const sent = sentYardLocation(sentEvent);
  const live = useTruck(truckId);
  const now = useNow();

  if (!sent) return null;

  return (
    <div className="flex flex-col gap-0.5 border-t border-border pt-1.5 text-2xs">
      <span className="text-muted-foreground">
        Sent yard location:{" "}
        <span className="font-mono tabular-nums">
          {sent.lat.toFixed(5)}, {sent.lng.toFixed(5)}
        </span>
      </span>
      {live ? (
        <span className="text-muted-foreground">
          Live position:{" "}
          <span className="font-mono tabular-nums">
            {live.currentLatitude.toFixed(5)}, {live.currentLongitude.toFixed(5)}
          </span>{" "}
          · updated {formatSecondsAgo(live.serverTimestamp, now)}
        </span>
      ) : (
        <span className="text-muted-foreground">Truck not held live yet.</span>
      )}
    </div>
  );
}
