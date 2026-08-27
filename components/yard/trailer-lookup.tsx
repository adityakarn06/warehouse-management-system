"use client";

import { useRef, useState } from "react";
import { SearchIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTrucks } from "@/features/trucks";
import { getTruck } from "@/lib/api/trucks";
import { useUIStore } from "@/stores/use-ui-store";
import type { TruckListItem } from "@/types";

/**
 * `GET /trucks/:id` accepts a truck's own id, its `reference` (`TRK-104`) or
 * its `trailerId` (`TRL-104`), tried in that order — nothing in the frontend
 * looked a truck up by trailer before this (`trailerId` was only ever
 * displayed). This is the entry point for that fallback.
 *
 * The common case costs no request: the already-fetched truck list carries
 * both `reference` and `trailerId`, so a local match is tried first, and only
 * a miss there falls through to `GET /trucks/:id`, which is exactly where the
 * backend's fallback earns its keep — a runtime-created row absent from the
 * cached list.
 */
export function TrailerLookup() {
  const [value, setValue] = useState("");
  const [status, setStatus] = useState<"idle" | "pending" | "miss">("idle");
  const trucksQuery = useTrucks();
  const selectTruck = useUIStore((s) => s.selectTruck);
  /** Monotonically increasing counter — guards async getTruck results so only
   * the latest submission can update state. */
  const requestSeqRef = useRef(0);

  function findLocally(query: string): TruckListItem | null {
    const trucks = trucksQuery.data?.data ?? [];
    return (
      trucks.find(
        (truck) => truck.id === query || truck.reference === query || truck.trailerId === query,
      ) ?? null
    );
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const query = value.trim();
    if (!query) return;

    const seq = ++requestSeqRef.current;

    const local = findLocally(query);
    if (local) {
      // Always the canonical id — `selectedTruckId` is compared by identity
      // across the dock store and the recommendation panel, never by the
      // string the operator typed.
      selectTruck(local.id);
      setStatus("idle");
      return;
    }
    setStatus("pending");
    try {
      const truck = await getTruck(query);
      if (requestSeqRef.current !== seq) return; // superseded
      selectTruck(truck.id);
      setStatus("idle");
    } catch {
      if (requestSeqRef.current !== seq) return; // superseded
      // A 404 ("no such truck/reference/trailer") and any other failure both
      // render as the same inline miss — this is a quick lookup, not a page,
      // and does not warrant a full `ErrorState`.
      setStatus("miss");
    }
  }

  return (
    <form onSubmit={(event) => void handleSubmit(event)} className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        <Input
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            if (status !== "idle") setStatus("idle");
          }}
          placeholder="Truck id, reference or trailer ID"
          aria-label="Find by truck id, reference or trailer ID"
          className="font-mono"
          autoComplete="off"
          spellCheck={false}
        />
        <Button type="submit" size="icon" variant="outline" disabled={status === "pending"} aria-label="Find truck">
          <SearchIcon />
        </Button>
      </div>
      {status === "miss" ? (
        <p role="alert" className="text-2xs text-destructive">
          No truck, reference or trailer matches &quot;{value.trim()}&quot;.
        </p>
      ) : null}
    </form>
  );
}
