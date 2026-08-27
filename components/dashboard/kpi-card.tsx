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
    <Card>
      <CardContent className="flex flex-col gap-1">
        <CardDescription>{label}</CardDescription>
        <CardTitle className={cn("text-2xl tabular-nums", toneToTextClass[tone])}>
          {value}
        </CardTitle>
        {hint ? <span className="text-[0.65rem] text-muted-foreground">{hint}</span> : null}
      </CardContent>
    </Card>
  );
}
