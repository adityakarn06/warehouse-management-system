"use client";

import { useMemo } from "react";
import dynamic from "next/dynamic";
import { PlugZapIcon, RadarIcon, TruckIcon, type LucideIcon } from "lucide-react";

import { EmptyState } from "@/components/ui/empty-state";
import { mapTruckFromLiveEntry } from "@/features/tracking";
import { useConnectionStatus, useTruckStore, type LiveTruckEntry } from "@/stores";
import type { ShipmentResolution } from "@/stores/use-realtime-store";
import type { MapTruck } from "@/types";

/** Mapbox GL touches `window` at construction — never initialise it on the server. */
const LiveMap = dynamic(() => import("@/components/map/live-map").then((mod) => mod.LiveMap), {
  ssr: false,
  loading: () => <div className="size-full animate-pulse rounded-lg border border-border bg-muted/20" />,
});

/**
 * The tracking view's map is the *same* map the dashboard uses, handed one
 * truck instead of the fleet — the interpolator, route corridor, endpoint
 * markers and camera policy all come with it. Two props differ: the fit/locate
 * controls are off (with a single truck they are the same gesture), and the
 * viewport is not persisted into the shared operations-map slot.
 *
 * Getting a truck on screen takes three steps, and each can stall on its own:
 * the socket connects, the `subscribe:shipment` ack resolves the tracking
 * number to a truck id, and that truck's first snapshot lands in the store.
 * The REST tracking row carries neither a truck id nor a route, so none of it
 * can be short-circuited — and a single "no position yet" for all three is
 * unactionable, so each reports itself.
 */
export function TrackingMap({
  live,
  resolution,
}: {
  live: LiveTruckEntry | undefined;
  resolution: ShipmentResolution | undefined;
}) {
  const connectionStatus = useConnectionStatus();

  if (live) return <TrackingMapCanvas live={live} />;

  const waiting = describeWait(connectionStatus, resolution);

  return (
    <EmptyState
      icon={waiting.icon}
      title={waiting.title}
      description={waiting.description}
      className="size-full"
    />
  );
}

function describeWait(
  connectionStatus: ReturnType<typeof useConnectionStatus>,
  resolution: ShipmentResolution | undefined,
): { icon: LucideIcon; title: string; description: string } {
  if (connectionStatus !== "CONNECTED") {
    return {
      icon: PlugZapIcon,
      title: "Connecting to live updates",
      description: `The realtime connection is ${connectionStatus.toLowerCase()}. The map appears once it is established.`,
    };
  }

  if (!resolution) {
    return {
      icon: RadarIcon,
      title: "Locating this shipment",
      description: "Connected — waiting for the backend to resolve this tracking number to a truck.",
    };
  }

  if (!resolution.truckId) {
    return {
      icon: TruckIcon,
      title: "No truck assigned yet",
      description: `${resolution.shipmentId} is not currently being carried by a truck, so there is nothing to place on the map.`,
    };
  }

  return {
    icon: TruckIcon,
    title: "Waiting for live position",
    description: `${resolution.truckId} has not reported a position yet.`,
  };
}

function TrackingMapCanvas({ live }: { live: LiveTruckEntry }) {
  const { truckId, reference, routeId } = live;

  // Frozen on the truck's *identity*, not its position.
  //
  // `live` is a new object on every 2s tick, and passing a fresh array straight
  // through would re-render the whole map subtree at that cadence. It buys
  // nothing: the interpolator owns position for every live truck (fed from the
  // truck store by its own rAF loop) and `TruckMarker` reads its label from the
  // store too, so the coordinates on this object are only the fallback for the
  // instant before the first frame. The dashboard gets the same property for
  // free by feeding `LiveMap` a debounced REST snapshot.
  const trucks = useMemo<MapTruck[]>(
    () => [mapTruckFromLiveEntry(useTruckStore.getState().trucksById[truckId] ?? live)],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [truckId, reference, routeId],
  );

  return (
    <LiveMap trucks={trucks} showControls={false} persistViewport={false} className="size-full" />
  );
}
