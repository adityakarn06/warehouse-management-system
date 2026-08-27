import { AlertTriangleIcon, ArrowRightLeftIcon, CheckCircle2Icon, type LucideIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/**
 * The four states an operator must never confuse, in one badge.
 *
 * `NO_DOCK_AVAILABLE` is deliberately not folded into `StatusBadge`'s
 * `dockAssignment` domain: it is not a member of `DockAssignmentStatus`
 * (`schemas/common.schema.ts`) — it exists only as an alert type and a cascade
 * outcome — and adding it there would make that record lie about the schema.
 *
 * Tone alone is not enough to stop a *proposal* being read as a *commitment*,
 * so `RECOMMENDED` is the only dashed, unfilled badge of the four. That shape
 * difference is what survives a glance across a crowded board.
 */
export type AssignmentState = "RECOMMENDED" | "ASSIGNED" | "REASSIGNED" | "NO_DOCK_AVAILABLE";

const ASSIGNMENT_STATES: readonly AssignmentState[] = [
  "RECOMMENDED",
  "ASSIGNED",
  "REASSIGNED",
  "NO_DOCK_AVAILABLE",
];

/** The store types assignment `status` as a plain `string`, so callers can hand
 * over anything the backend sends (`COMPLETED`, `CANCELLED`, …). Narrowing here
 * beats widening the store's types to satisfy one badge. */
export function isAssignmentState(value: string | null | undefined): value is AssignmentState {
  return value !== null && value !== undefined && (ASSIGNMENT_STATES as readonly string[]).includes(value);
}

const stateStyles: Record<AssignmentState, { className: string; icon: LucideIcon | null; label: string }> = {
  RECOMMENDED: {
    // Dashed + unfilled: a ranking the backend produced, which nobody committed.
    className: "border-dashed border-info/50 bg-transparent text-info",
    icon: null,
    label: "RECOMMENDED",
  },
  ASSIGNED: {
    className: "bg-success/10 text-success",
    icon: CheckCircle2Icon,
    label: "ASSIGNED",
  },
  REASSIGNED: {
    className: "bg-warning/10 text-warning",
    icon: ArrowRightLeftIcon,
    label: "REASSIGNED",
  },
  NO_DOCK_AVAILABLE: {
    className: "bg-destructive/10 text-destructive",
    icon: AlertTriangleIcon,
    label: "NO DOCK AVAILABLE",
  },
};

interface AssignmentStateBadgeProps {
  state: AssignmentState;
  className?: string;
}

export function AssignmentStateBadge({ state, className }: AssignmentStateBadgeProps) {
  const { className: toneClassName, icon: Icon, label } = stateStyles[state];

  return (
    <Badge variant="outline" className={cn(toneClassName, className)}>
      {Icon ? <Icon /> : null}
      {label}
    </Badge>
  );
}
