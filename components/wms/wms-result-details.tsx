import { StatusBadge } from "@/components/ui/status-badge";
import { Badge } from "@/components/ui/badge";
import type { WmsEventResult } from "@/types";

/**
 * One `WmsEventResult`, rendered exactly as it arrived — `applied`, `effects`,
 * `emitted`, `alert`. Shared by `WmsStepList` (one row per scripted step) and
 * `WmsEventComposer` (the single result of a hand-sent event), so the two
 * surfaces never drift into two different renderings of the same response
 * shape.
 */
export function WmsResultDetails({ result }: { result: WmsEventResult }) {
  return (
    <>
      <div className="flex flex-wrap items-center gap-1">
        {/* `applied: false` is a success, not a failure: the fact the feed
            reported was already true, so nothing moved and no second alert
            was raised (docs/api.md §WMS). */}
        <Badge variant={result.applied ? "secondary" : "outline"}>
          {result.applied ? "applied" : "already true"}
        </Badge>
        {result.truckId ? <Badge variant="outline">{result.truckId}</Badge> : null}
        {result.dockDoorId ? <Badge variant="outline">{result.dockDoorId}</Badge> : null}
      </div>

      {result.effects.length > 0 ? (
        <ul className="flex flex-col gap-0.5">
          {result.effects.map((effect, effectIndex) => (
            <li key={`${effect}-${effectIndex}`} className="font-mono text-2xs text-muted-foreground">
              {effect}
            </li>
          ))}
        </ul>
      ) : null}

      <div className="flex flex-wrap items-center gap-1">
        <span className="text-2xs text-muted-foreground">Emitted</span>
        {result.emitted.length > 0 ? (
          result.emitted.map((event, eventIndex) => (
            <Badge key={`${event}-${eventIndex}`} variant="info">
              {event}
            </Badge>
          ))
        ) : (
          // APPOINTMENT_UPDATED deliberately emits nothing (docs/realtime.md
          // §Phase 9) — an empty list is the contract, not a missed event.
          <span className="text-2xs text-muted-foreground">
            nothing — this event raises no realtime event by contract
          </span>
        )}
      </div>

      {result.alert ? (
        <div className="flex flex-col gap-1 rounded-sm bg-muted/40 px-2 py-1.5">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-2xs font-medium">{result.alert.title}</span>
            <StatusBadge domain="alertSeverity" value={result.alert.severity} />
          </div>
          <p className="text-2xs text-muted-foreground">{result.alert.message}</p>
        </div>
      ) : null}
    </>
  );
}
