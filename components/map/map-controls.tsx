"use client";

import { CrosshairIcon, MaximizeIcon, MinusIcon, PlusIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

import { useMapInstance } from "./map-context";

export interface MapControlsProps {
  /** Fit the camera over the whole fleet and its route endpoints. */
  onFitFleet: () => void;
  /** Focus the currently selected truck. */
  onLocateSelected: () => void;
  canLocateSelected: boolean;
}

/**
 * Every button here is an *explicit* user-initiated camera move — together
 * with the one-time initial fit and truck selection, these are the only
 * things allowed to move the camera (never a realtime tick).
 */
export function MapControls({ onFitFleet, onLocateSelected, canLocateSelected }: MapControlsProps) {
  const map = useMapInstance();

  return (
    <div className="absolute right-3 top-3 z-10 flex flex-col gap-1 rounded-md border border-border bg-background/90 p-1 shadow-sm backdrop-blur">
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              size="icon-sm"
              variant="ghost"
              aria-label="Zoom in"
              onClick={() => map?.zoomIn()}
            >
              <PlusIcon />
            </Button>
          }
        />
        <TooltipContent side="left">Zoom in</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              size="icon-sm"
              variant="ghost"
              aria-label="Zoom out"
              onClick={() => map?.zoomOut()}
            >
              <MinusIcon />
            </Button>
          }
        />
        <TooltipContent side="left">Zoom out</TooltipContent>
      </Tooltip>

      <div className="h-px bg-border" />

      <Tooltip>
        <TooltipTrigger
          render={
            <Button size="icon-sm" variant="ghost" aria-label="Fit fleet" onClick={onFitFleet}>
              <MaximizeIcon />
            </Button>
          }
        />
        <TooltipContent side="left">Fit fleet</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              size="icon-sm"
              variant="ghost"
              aria-label="Focus selected truck"
              disabled={!canLocateSelected}
              onClick={onLocateSelected}
            >
              <CrosshairIcon />
            </Button>
          }
        />
        <TooltipContent side="left">Focus selected truck</TooltipContent>
      </Tooltip>
    </div>
  );
}
