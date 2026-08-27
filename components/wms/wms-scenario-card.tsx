"use client";

import { Loader2Icon, PlayIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { WmsScenario } from "@/types";

export interface WmsScenarioMeta {
  scenario: WmsScenario;
  label: string;
  description: string;
  /** The event sequence `docs/api.md` §WMS documents for this scenario, and the
   * state it says the run ends in. Rendered as the *script*, never as a claim
   * about what a run just did — that only ever comes from the response. */
  sequence: string[];
  endsWith: string;
}

interface WmsScenarioCardProps {
  meta: WmsScenarioMeta;
  isRunning: boolean;
  disabled: boolean;
  onRun: (scenario: WmsScenario) => void;
}

export function WmsScenarioCard({ meta, isRunning, disabled, onRun }: WmsScenarioCardProps) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-0.5">
          <span className="text-xs font-semibold">{meta.label}</span>
          <code className="text-2xs text-muted-foreground">{meta.scenario}</code>
        </div>
        <Button size="xs" disabled={disabled} onClick={() => onRun(meta.scenario)}>
          {isRunning ? <Loader2Icon className="animate-spin" /> : <PlayIcon />}
          {isRunning ? "Running" : "Run"}
        </Button>
      </div>

      <p className="text-2xs text-muted-foreground">{meta.description}</p>

      <div className="flex flex-col gap-1">
        <span className="text-2xs font-medium tracking-wide text-muted-foreground uppercase">
          Documented sequence
        </span>
        <div className="flex flex-wrap items-center gap-1">
          {meta.sequence.map((step, index) => (
            <div key={`${step}-${index}`} className="flex items-center gap-1">
              {index > 0 ? <span className="text-2xs text-muted-foreground">→</span> : null}
              <Badge variant="outline">{step}</Badge>
            </div>
          ))}
        </div>
      </div>

      <p className="text-2xs text-muted-foreground">
        <span className="font-medium">Ends with:</span> {meta.endsWith}
      </p>
    </div>
  );
}
