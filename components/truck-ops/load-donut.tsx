import { cn } from "@/lib/utils";

interface LoadDonutProps {
  /** 0–100, as the backend sent it. Clamped for drawing only. */
  value: number;
  label: string;
  className?: string;
}

/**
 * The reference's headline dial.
 *
 * It shows **route progress**, not load-versus-capacity. The reference reads
 * "48% Weight · 6.5 of 13.5 tons", but no truck capacity field exists anywhere
 * in this API — not on `truckDetailSchema`, not on `fleetTruckSchema`, not in
 * `flows/api.md`. A percentage-of-capacity would mean inventing the
 * denominator, so the dial renders the one 0–100 figure the backend does send
 * for a truck, and the load itself (`weightKg`, `palletCount`) sits beside it
 * as the plain figures they are.
 *
 * Hand-rolled `conic-gradient` rather than a chart dependency: there is no
 * charting library in this project, and `ScoreBreakdown` / `ProgressBar` set
 * the precedent.
 */
export function LoadDonut({ value, label, className }: LoadDonutProps) {
  const clamped = Math.min(100, Math.max(0, Number.isFinite(value) ? value : 0));
  const rounded = Math.round(clamped);

  return (
    <div
      role="progressbar"
      aria-valuenow={rounded}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      className={cn("relative size-24 shrink-0", className)}
    >
      <div
        aria-hidden
        className="size-full rounded-full"
        style={{
          background: `conic-gradient(var(--color-success) ${clamped}%, var(--color-muted) ${clamped}% 100%)`,
        }}
      />
      <div className="absolute inset-[9px] flex flex-col items-center justify-center gap-0 rounded-full bg-card">
        <span className="text-lg font-semibold leading-none tabular-nums">{rounded}%</span>
        <span className="text-2xs leading-tight text-muted-foreground">{label}</span>
      </div>
    </div>
  );
}
