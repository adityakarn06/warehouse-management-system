"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import mapboxgl from "mapbox-gl";

import { cn } from "@/lib/utils";

import { useMapInstance } from "./map-context";

export interface WarehouseMarkerProps {
  latitude: number;
  longitude: number;
  name: string;
  kind: "origin" | "destination";
}

/**
 * A facility endpoint. There is no warehouse endpoint in the backend — these
 * coordinates come from the route detail (`originLatitude/Longitude`,
 * `destinationLatitude/Longitude`) already fetched for the polyline, so this
 * costs no extra request.
 */
export function WarehouseMarker({ latitude, longitude, name, kind }: WarehouseMarkerProps) {
  const map = useMapInstance();

  // Created during render, not in an effect, so React can portal into it
  // straight away — see the same pattern in `truck-marker.tsx`.
  const [container] = useState(() =>
    typeof document === "undefined" ? null : document.createElement("div"),
  );

  useEffect(() => {
    if (!map || !container) return;

    const marker = new mapboxgl.Marker({ element: container, anchor: "bottom" })
      .setLngLat([longitude, latitude])
      .addTo(map);

    return () => {
      marker.remove();
    };
  }, [map, container, latitude, longitude]);

  if (!container) return null;

  const isDestination = kind === "destination";

  return createPortal(
    <div className="pointer-events-none flex flex-col items-center gap-0.5">
      <Image
        src="/warehouse.png"
        alt=""
        width={459}
        height={350}
        className={cn(
          "object-contain drop-shadow-sm",
          isDestination ? "h-[46px] w-[60px]" : "h-[32px] w-[42px] opacity-80",
        )}
      />
      <span
        className={cn(
          "max-w-28 truncate rounded-sm border border-border bg-background px-1 py-px text-2xs leading-tight shadow-sm",
          isDestination ? "font-medium" : "text-muted-foreground",
        )}
      >
        {name}
      </span>
    </div>,
    container,
  );
}
