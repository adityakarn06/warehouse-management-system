import { cn } from "@/lib/utils";

interface ProgressBarProps {
  /** 0–100, as the backend sent it. Clamped for rendering only — a value out
   * of range must not paint outside the track, but it is never corrected in
   * the number shown next to it. */
  value: number;
  className?: string;
  indicatorClassName?: string;
  label?: string;
}

export function ProgressBar({ value, className, indicatorClassName, label }: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, Number.isFinite(value) ? value : 0));

  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label ?? "Progress"}
      className={cn("h-2 w-full overflow-hidden rounded-full bg-muted", className)}
    >
      <div
        className={cn("h-full rounded-full bg-primary transition-[width] duration-700 ease-out", indicatorClassName)}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
