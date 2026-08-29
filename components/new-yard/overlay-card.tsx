import { cn } from "@/lib/utils";

import { glassSurface } from "./glass-surface";

interface OverlayCardProps {
  title: string;
  children: React.ReactNode;
  /** The card's top-right control. Without one the reference's decorative
   * affordance is drawn instead, so a card with nothing to do still reads the
   * same as one that does. */
  action?: React.ReactNode;
  className?: string;
}

/**
 * A card that floats *over* the live map rather than beside it.
 *
 * Translucent + backdrop-blurred so the yard stays readable underneath, and
 * `pointer-events-auto` on the card only — the wrapper the hero positions these
 * in is `pointer-events-none`, so panning the map through the gaps still works.
 * That is also what lets `action` be a real button up here.
 */
export function OverlayCard({ title, children, action, className }: OverlayCardProps) {
  return (
    <div
      className={cn(
        glassSurface,
        "pointer-events-auto flex w-64 flex-col gap-3 p-3",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-heading text-xs font-medium">{title}</h3>
        {action ?? (
          /* The reference's overflow affordance. Nothing behind it on this
             card, so it is decorative and hidden from the accessibility tree
             rather than a button that does nothing. */
          <span aria-hidden className="size-4 rounded-full border border-border/70 bg-muted/60" />
        )}
      </div>
      {children}
    </div>
  );
}

/** The big number + unit suffix pairing both hero overlays lead with. */
export function OverlayMetric({
  value,
  suffix,
  hint,
}: {
  value: string;
  suffix?: string;
  hint?: string;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-baseline gap-1.5">
        <span className="text-3xl font-semibold leading-none tracking-tight tabular-nums">
          {value}
        </span>
        {suffix ? <span className="text-xs text-muted-foreground">{suffix}</span> : null}
      </div>
      {hint ? <span className="text-2xs text-muted-foreground">{hint}</span> : null}
    </div>
  );
}
