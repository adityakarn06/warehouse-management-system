import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * The one micro-label recipe. Every "ETA", "Progress", "Appointment window"
 * caption in the app is this — previously it was retyped at eight sites, which
 * is how `font-medium` drifted onto some of them and not others.
 */
export const FIELD_LABEL_CLASS =
  "text-2xs font-medium uppercase tracking-wide text-muted-foreground";

interface FieldLabelProps {
  icon?: LucideIcon;
  children: React.ReactNode;
  className?: string;
}

export function FieldLabel({ icon: Icon, children, className }: FieldLabelProps) {
  return (
    <p className={cn("flex items-center gap-1.5", FIELD_LABEL_CLASS, className)}>
      {Icon ? <Icon className="size-3 shrink-0" /> : null}
      {children}
    </p>
  );
}
