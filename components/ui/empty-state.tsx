import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border p-6 text-center",
        className
      )}
    >
      {Icon ? (
        <span className="grid size-8 place-items-center rounded-full bg-muted">
          <Icon className="size-4 text-muted-foreground" />
        </span>
      ) : null}
      <p className="text-xs font-medium text-foreground">{title}</p>
      {description ? (
        <p className="max-w-sm text-2xs text-muted-foreground">{description}</p>
      ) : null}
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  );
}
