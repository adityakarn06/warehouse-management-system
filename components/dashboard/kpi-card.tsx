import type { LucideIcon } from "lucide-react";

import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type KpiTone = "neutral" | "info" | "success" | "warning" | "critical";

const toneToBorderClass: Record<KpiTone, string> = {
  neutral: "border-l-border",
  info: "border-l-info",
  success: "border-l-success",
  warning: "border-l-warning",
  critical: "border-l-destructive",
};

interface KpiCardProps {
  icon?: LucideIcon;
  label: string;
  value: number;
  tone?: KpiTone;
  hint?: string;
}

export function KpiCard({ icon: Icon, label, value, tone = "neutral", hint }: KpiCardProps) {
  return (
    <Card size="sm" className={cn("border-l-2", toneToBorderClass[tone])}>
      <CardContent className="flex flex-col gap-1">
        <div className="flex items-center gap-1.5">
          {Icon ? <Icon className="size-3.5 text-muted-foreground" /> : null}
          <CardDescription>{label}</CardDescription>
        </div>
        <CardTitle className="text-xl tabular-nums">{value}</CardTitle>
        {hint ? <span className="text-2xs text-muted-foreground">{hint}</span> : null}
      </CardContent>
    </Card>
  );
}
