"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import mapboxgl from "mapbox-gl";

import { truckStatusTone, type SemanticTone } from "@/components/ui/status-badge";
import { useLiveTruckFields, useLiveTruckPosition } from "@/features/yard";
import { formatTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/stores";
import type { YardTruck } from "@/types";

import { useMapInstance } from "./map-context";

/** The PNG cannot be recoloured, so status is carried by the dot and the ring. */
const toneDotClass: Record<SemanticTone, string> = {
  neutral: "bg-muted-foreground",
  info: "bg-info",
  success: "bg-success",
  warning: "bg-warning",
  critical: "bg-destructive",
};

const toneRingClass: Record<SemanticTone, string> = {
  neutral: "ring-border",
  info: "ring-info/60",
  success: "ring-success/60",
  warning: "ring-warning/70",
  critical: "ring-destructive",
};

export function TruckMarker({ truck }: { truck: YardTruck }) {
  const map = useMapInstance();
  const position = useLiveTruckPosition(truck);
  const live = useLiveTruckFields(truck);
  const selectedTruckId = useUIStore((s) => s.selectedTruckId);
  const isSelected = selectedTruckId === truck.id;

  const markerRef = useRef<mapboxgl.Marker | null>(null);

  // Created once during render (not in an effect), so React can portal into
  // it immediately and marker *content* updates never re-add the marker.
  const [container] = useState(() =>
    typeof document === "undefined" ? null : document.createElement("div"),
  );

  useEffect(() => {
    if (!map || !container) return;

    // Placed at the origin and immediately corrected by the position effect
    // below, which runs later in the same commit — so there is no flash, and
    // the live position stays out of this effect's dependencies.
    const marker = new mapboxgl.Marker({ element: container, anchor: "center" })
      .setLngLat([0, 0])
      .addTo(map);

    markerRef.current = marker;

    return () => {
      markerRef.current = null;
      marker.remove();
    };
  }, [map, container]);

  // Mapbox exposes no z-index API and stacks markers in DOM order, but the
  // element it positions is the one handed to it — so `z-index` on that
  // element does raise the selected truck above its neighbours. Re-adding the
  // marker instead would not: on a selection change both the newly selected
  // and the newly deselected marker are re-appended in the same commit, in
  // `trucks` order, so the *deselected* one lands on top whenever it sorts
  // later.
  useEffect(() => {
    // Reached through the marker rather than the `container` binding itself:
    // that one comes from `useState`, and the compiler's immutability rule
    // forbids writing to it directly.
    const element = markerRef.current?.getElement();
    if (element) element.style.zIndex = isSelected ? "1" : "";
  }, [map, container, isSelected]);

  // A direct set, no easing and no RAF: this phase renders the backend's
  // authoritative position only (AGENTS.md — animation comes later).
  useEffect(() => {
    markerRef.current?.setLngLat([position.longitude, position.latitude]);
  }, [map, position.latitude, position.longitude]);

  if (!container) return null;

  const tone = truckStatusTone[live.status];
  const isDelayed = live.activeDelay !== "NORMAL" || live.status === "DELAYED";

  return createPortal(
    <button
      type="button"
      aria-label={`${truck.reference} — ${live.status.replace(/_/g, " ")}`}
      aria-pressed={isSelected}
      onClick={(event) => {
        event.stopPropagation();
        useUIStore.getState().selectTruck(isSelected ? null : truck.id);
      }}
      className="flex items-center gap-1 focus-visible:outline-none"
    >
      <span
        className={cn(
          "relative grid place-items-center rounded-md bg-background/80 p-0.5 shadow-sm ring-1 transition",
          toneRingClass[tone],
          isSelected && "bg-background ring-2 ring-primary",
          !isSelected && isDelayed && "ring-2",
        )}
      >
        <Image
          src="/truck.png"
          alt=""
          width={108}
          height={80}
          className="h-[22px] w-[30px] object-contain"
          priority={false}
        />
        <span
          className={cn(
            "absolute -right-0.5 -top-0.5 size-2 rounded-full ring-1 ring-background",
            toneDotClass[tone],
          )}
        />
      </span>

      <span
        className={cn(
          "rounded bg-background/90 px-1 py-px text-[0.6rem] font-medium leading-tight tabular-nums shadow-sm ring-1",
          toneRingClass[tone],
          isSelected && "ring-primary",
        )}
      >
        {formatTime(live.eta)}
      </span>
    </button>,
    container,
  );
}
