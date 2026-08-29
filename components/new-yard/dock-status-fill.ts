import type { DockStatus } from "@/types";

/** Board order — free first, down last. Also the legend/stack order. */
export const DOCK_STATUS_ORDER: DockStatus[] = [
  "AVAILABLE",
  "RESERVED",
  "OCCUPIED",
  "UNAVAILABLE",
];

/**
 * The same green/blue/amber/red semantics `StatusBadge`'s `dockStatusTone`
 * assigns, as background fills — for the surfaces that carry dock status as a
 * bar segment or a legend dot rather than a badge.
 */
export const dockStatusFill: Record<DockStatus, string> = {
  AVAILABLE: "bg-success",
  RESERVED: "bg-info",
  OCCUPIED: "bg-warning",
  UNAVAILABLE: "bg-destructive",
};

/** `AVAILABLE` → `Available`, for a label that is not a badge. */
export function dockStatusLabel(status: DockStatus): string {
  return `${status.charAt(0)}${status.slice(1).toLowerCase()}`;
}
