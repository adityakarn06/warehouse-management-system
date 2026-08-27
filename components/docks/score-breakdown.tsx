import { cn } from "@/lib/utils";
import type { DockRecommendation } from "@/types";

/** Fixed order and labels only — the *values* are entirely the backend's.
 * `docs/api.md` documents a maximum for each component, but deliberately none
 * is encoded here: hardcoding them would be reproducing the scoring model the
 * backend owns (AGENTS.md §2), and it would silently misdraw the bar the day
 * the backend retunes a weight. */
const COMPONENTS = [
  { key: "loadTypeFit", label: "Load type", className: "bg-chart-1" },
  { key: "availabilityFit", label: "Availability", className: "bg-chart-2" },
  { key: "appointmentFit", label: "Appointment", className: "bg-chart-3" },
  { key: "priorityFit", label: "Priority", className: "bg-chart-4" },
  { key: "statusBonus", label: "Status", className: "bg-chart-5" },
] as const satisfies ReadonlyArray<{
  key: keyof DockRecommendation["breakdown"];
  label: string;
  className: string;
}>;

/**
 * Renders the five numbers the backend returned in `breakdown`.
 *
 * Each segment is sized as its share of the *returned* `score`, so the bar is a
 * pure restatement of the response — no total is recomputed and no component
 * maximum is assumed. The raw values are printed alongside, because the bar is
 * the summary and the numbers are the evidence.
 */
export function ScoreBreakdown({ recommendation }: { recommendation: DockRecommendation }) {
  const { breakdown, score } = recommendation;

  // Only used to turn the returned values into bar widths. A zero or negative
  // score would make that meaningless, so the bar is dropped and the numbers
  // stand on their own rather than being drawn wrong.
  const canDrawBar = score > 0;

  return (
    <div className="flex flex-col gap-1.5">
      {canDrawBar ? (
        <div
          className="flex h-1.5 w-full overflow-hidden rounded-full bg-muted"
          aria-hidden="true"
        >
          {COMPONENTS.map(({ key, className }) => (
            <div
              key={key}
              className={className}
              style={{ width: `${(breakdown[key] / score) * 100}%` }}
            />
          ))}
        </div>
      ) : null}

      <dl className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[0.65rem] text-muted-foreground">
        {COMPONENTS.map(({ key, label, className }) => (
          <div key={key} className="flex items-center justify-between gap-2">
            <dt className="flex items-center gap-1 truncate">
              <span className={cn("size-1.5 shrink-0 rounded-full", className)} />
              {label}
            </dt>
            <dd className="font-medium tabular-nums text-foreground">{breakdown[key]}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
