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

type SemanticTone = "neutral" | "info" | "success" | "warning" | "critical";
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

const truckStatusTone: Record<TruckStatus, SemanticTone> = {
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

const dockStatusTone: Record<DockStatus, SemanticTone> = {
  AVAILABLE: "info",
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
