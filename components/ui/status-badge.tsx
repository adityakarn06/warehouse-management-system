import {
  AlertTriangleIcon,
  CheckCircle2Icon,
  ClockIcon,
  CircleIcon,
  InfoIcon,
  type LucideIcon,
} from "lucide-react";

import { Badge, type badgeVariants } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type {
  AlertSeverity,
  DockAssignmentStatus,
  DockStatus,
  ShipmentStatus,
  TruckStatus,
} from "@/types";
import type { VariantProps } from "class-variance-authority";

export type SemanticTone = "neutral" | "info" | "success" | "warning" | "critical";
type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>["variant"]>;

const toneToVariant: Record<SemanticTone, BadgeVariant> = {
  neutral: "secondary",
  info: "info",
  success: "success",
  warning: "warning",
  critical: "destructive",
};

const toneToIcon: Record<SemanticTone, LucideIcon> = {
  neutral: CircleIcon,
  info: InfoIcon,
  success: CheckCircle2Icon,
  warning: ClockIcon,
  critical: AlertTriangleIcon,
};

/** Exported so non-badge surfaces (map markers) can carry the same semantics. */
export const truckStatusTone: Record<TruckStatus, SemanticTone> = {
  IN_TRANSIT: "info",
  DELAYED: "critical",
  ARRIVING: "warning",
  ARRIVED: "success",
  DOCKED: "success",
  COMPLETED: "neutral",
};

const shipmentStatusTone: Record<ShipmentStatus, SemanticTone> = {
  CREATED: "neutral",
  IN_TRANSIT: "info",
  DELAYED: "critical",
  ARRIVING: "warning",
  ARRIVED: "success",
  DOCKED: "success",
  DELIVERED: "success",
};

/**
 * Green = take it, blue = spoken for, amber = working, red = down.
 * `AVAILABLE` and `RESERVED` both read as `info` would make a free door
 * indistinguishable from a committed one on the 8-up board, which is the one
 * thing that board exists to answer.
 */
const dockStatusTone: Record<DockStatus, SemanticTone> = {
  AVAILABLE: "success",
  RESERVED: "info",
  OCCUPIED: "warning",
  UNAVAILABLE: "critical",
};

const dockAssignmentStatusTone: Record<DockAssignmentStatus, SemanticTone> = {
  RECOMMENDED: "info",
  ASSIGNED: "success",
  REASSIGNED: "warning",
  COMPLETED: "neutral",
  CANCELLED: "neutral",
};

const alertSeverityTone: Record<AlertSeverity, SemanticTone> = {
  INFO: "info",
  WARNING: "warning",
  CRITICAL: "critical",
};

/**
 * The row's own left edge, so severity is legible before the badge is read.
 * Exported because the dashboard feed and the /alerts page render the same
 * concept and previously each kept their own copy of this map.
 */
export const alertSeverityBorder: Record<AlertSeverity, string> = {
  CRITICAL: "border-l-destructive",
  WARNING: "border-l-warning",
  INFO: "border-l-info",
};

type StatusBadgeProps = {
  className?: string;
  showIcon?: boolean;
} & (
  | { domain: "truck"; value: TruckStatus }
  | { domain: "shipment"; value: ShipmentStatus }
  | { domain: "dock"; value: DockStatus }
  | { domain: "dockAssignment"; value: DockAssignmentStatus }
  | { domain: "alertSeverity"; value: AlertSeverity }
);

function toneFor(domain: StatusBadgeProps["domain"], value: string): SemanticTone {
  switch (domain) {
    case "truck":
      return truckStatusTone[value as TruckStatus];
    case "shipment":
      return shipmentStatusTone[value as ShipmentStatus];
    case "dock":
      return dockStatusTone[value as DockStatus];
    case "dockAssignment":
      return dockAssignmentStatusTone[value as DockAssignmentStatus];
    case "alertSeverity":
      return alertSeverityTone[value as AlertSeverity];
  }
}

export function StatusBadge({ domain, value, className, showIcon = false }: StatusBadgeProps) {
  const tone = toneFor(domain, value);
  const Icon = toneToIcon[tone];

  return (
    <Badge variant={toneToVariant[tone]} className={cn(className)}>
      {showIcon ? <Icon /> : null}
      {value.replace(/_/g, " ")}
    </Badge>
  );
}
