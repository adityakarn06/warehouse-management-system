import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type KpiTone = "neutral" | "info" | "success" | "warning" | "critical";

const toneToTextClass: Record<KpiTone, string> = {
  neutral: "text-foreground",
  info: "text-info",
  success: "text-success",
  warning: "text-warning",
  critical: "text-destructive",
};

interface KpiCardProps {
  label: string;
  value: number;
  tone?: KpiTone;
  hint?: string;
}

export function KpiCard({ label, value, tone = "neutral", hint }: KpiCardProps) {
  return (
    <Card size="sm">
      <CardContent className="flex flex-col gap-1">
        <CardDescription>{label}</CardDescription>
        <CardTitle className={cn("text-xl tabular-nums", toneToTextClass[tone])}>
          {value}
        </CardTitle>
        {hint ? <span className="text-2xs text-muted-foreground">{hint}</span> : null}
      </CardContent>
    </Card>
  );
}
