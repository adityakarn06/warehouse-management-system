import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

import { glassSurface } from "./glass-surface";

interface YardPanelProps {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
}

/** The shared shell for the row of panels under the hero. */
export function YardPanel({
  title,
  action,
  children,
  className,
  contentClassName,
}: YardPanelProps) {
  return (
    <Card size="sm" className={cn(glassSurface, "min-h-0", className)}>
      <CardHeader>
        <CardTitle className="text-xs">{title}</CardTitle>
        {action ? <CardAction>{action}</CardAction> : null}
      </CardHeader>
      <CardContent className={cn("flex min-h-0 flex-1 flex-col", contentClassName)}>
        {children}
      </CardContent>
    </Card>
  );
}
