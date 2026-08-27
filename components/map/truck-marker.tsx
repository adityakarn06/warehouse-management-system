"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import mapboxgl from "mapbox-gl";

import { truckStatusTone, type SemanticTone } from "@/components/ui/status-badge";
import { useLiveTruckFields } from "@/features/yard";
import { useNow } from "@/hooks/use-now";
import { formatCountdown } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useTruckStore, useUIStore } from "@/stores";
import type { MapTruck } from "@/types";

import { useMapInterpolator } from "./interpolator-context";
import { useMapInstance } from "./map-context";

/** The PNG cannot be recoloured, so status is carried by the dot. */
const toneDotClass: Record<SemanticTone, string> = {
  neutral: "bg-muted-foreground",
  info: "bg-info",
  success: "bg-success",
  warning: "bg-warning",
  critical: "bg-destructive",
};


export function TruckMarker({ truck }: { truck: MapTruck }) {
  const map = useMapInstance();
  const interpolator = useMapInterpolator();
  const live = useLiveTruckFields(truck);
  // Whether the realtime layer holds this truck at all. A boolean, so this
  // re-renders only when liveness flips — never on a position tick.
  const isLiveTracked = useTruckStore((s) => truck.id in s.trucksById);
  // Ticks the label once a second. It re-renders this component's *content*
  // only — the marker instance, its DOM node and its position are untouched,
  // since position comes from the interpolator's rAF loop and never a render.
  const now = useNow();
  const selectedTruckId = useUIStore((s) => s.selectedTruckId);
  const isSelected = selectedTruckId === truck.id;

  const markerRef = useRef<mapboxgl.Marker | null>(null);

  // Created once during render (not in an effect), so React can portal into
  // it immediately and marker *content* updates never re-add the marker.
  const [container] = useState(() =>
    typeof document === "undefined" ? null : document.createElement("div"),
  );

  // The REST snapshot's position, frozen at first render. Kept out of the
  // effect's dependencies deliberately: a debounced overview refetch hands
  // back a new `truck` object every time, and the marker must survive that —
  // recreating the DOM node on a refetch is exactly what the interpolator
  // exists to avoid. After the first live tick this value is irrelevant.
  const [initialPosition] = useState<[number, number]>(() => [truck.longitude, truck.latitude]);

  useEffect(() => {
    if (!map || !container) return;

    const marker = new mapboxgl.Marker({ element: container, anchor: "center" })
      .setLngLat(initialPosition)
      .addTo(map);

    markerRef.current = marker;

    // The one and only position writer from here on. `setLngLat` is called
    // from the interpolator's rAF loop — never from a render, never from an
    // effect, and never with a coordinate this component computed.
    const unregister = interpolator?.registerMarker(truck.id, (longitude, latitude) => {
      marker.setLngLat([longitude, latitude]);
    });

    return () => {
      unregister?.();
      markerRef.current = null;
      marker.remove();
    };
  }, [map, container, interpolator, truck.id, initialPosition]);

  // Mapbox exposes no z-index API and stacks markers in DOM order, but the
  // element it positions is the one handed to it — so `z-index` on that
  // element does raise the selected truck above its neighbours. Re-adding the
  // marker instead would not: on a selection change both the newly selected
  // and the newly deselected marker are re-appended in the same commit, in
  // `trucks` order, so the *deselected* one lands on top whenever it sorts
  // later.
  // Position fallback for a truck the realtime layer has never delivered — a
  // socket that never connected, or a truck absent from the operations
  // snapshot. The interpolator owns position for every *live* truck, but it
  // is fed exclusively from the truck store, so without this a non-live
  // marker would sit wherever it was first painted while the debounced
  // `/yard/overview` refetches moved on without it.
  useEffect(() => {
    if (isLiveTracked) return;
    markerRef.current?.setLngLat([truck.longitude, truck.latitude]);
  }, [map, container, isLiveTracked, truck.longitude, truck.latitude]);

  useEffect(() => {
    // Reached through the marker rather than the `container` binding itself:
    // that one comes from `useState`, and the compiler's immutability rule
    // forbids writing to it directly.
    const element = markerRef.current?.getElement();
    if (element) element.style.zIndex = isSelected ? "1" : "";
  }, [map, container, isSelected]);

  if (!container) return null;

  const tone = truckStatusTone[live.status];

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
          "relative grid place-items-center rounded-md bg-background/80 p-0.5 shadow-sm transition",
          isSelected && "bg-background",
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

      <span className="rounded bg-background/90 px-1 py-px text-[0.6rem] font-medium leading-tight tabular-nums shadow-sm">
        {formatCountdown(live.eta, now, { compact: true })}
      </span>
    </button>,
    container,
  );
}
