import type { LucideIcon } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

import { glassSurface } from "./glass-surface";

export interface YardStat {
  key: string;
  label: string;
  value: number | string;
  icon: LucideIcon;
  /** Tints the icon chip only — the number itself stays foreground-coloured so
   * the row reads as one scale rather than five competing ones. */
  tone?: "neutral" | "info" | "success" | "warning" | "critical";
}

const toneToChipClass: Record<NonNullable<YardStat["tone"]>, string> = {
  neutral: "bg-muted text-muted-foreground",
  info: "bg-info/10 text-info",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  critical: "bg-destructive/10 text-destructive",
};

/**
 * The header rail: label above value, icon in a rounded chip on the left.
 * Sits flush against the hero below it, so it carries a border rather than the
 * card surface — the hero is the only raised plane on this page.
 */
export function YardStatRail({ stats, isPending }: { stats: YardStat[]; isPending: boolean }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5">
      {stats.map((stat) => (
        <div
          key={stat.key}
          className={cn(glassSurface, "flex items-center gap-3 px-3 py-2.5")}
        >
          <span
            className={cn(
              "grid size-8 shrink-0 place-items-center rounded-md",
              toneToChipClass[stat.tone ?? "neutral"],
            )}
          >
            <stat.icon className="size-4" />
          </span>
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="truncate text-2xs text-muted-foreground">{stat.label}</span>
            {isPending ? (
              <Skeleton className="h-4 w-12" />
            ) : (
              <span className="text-lg font-semibold leading-none tabular-nums">{stat.value}</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
