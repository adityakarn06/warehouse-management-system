import Image from "next/image";
import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatWeightKg } from "@/lib/format";
import type { FleetTruck } from "@/types";

export function FleetTruckCard({ truck }: { truck: FleetTruck }) {
  const progress = Math.round(Math.min(100, Math.max(0, truck.progress)));

  return (
    <Card className="gap-0 bg-muted p-0" size="sm">
      {/* Status pill, on its own row above the photo/headline. */}
      <div className="px-4 pt-4">
        <StatusBadge domain="truck" value={truck.status} />
      </div>

      <div className="flex items-end gap-2 px-4 pb-2">
        <div className="flex shrink-0 flex-col gap-0.5 pr-6 pb-1">
          <span className="text-sm font-semibold text-foreground">{truck.reference}</span>
          <span className="text-2xs text-muted-foreground">
            {formatWeightKg(truck.shipment?.weightKg)} · ({progress}%)
          </span>
        </div>

        <div className="relative h-36 min-w-0 flex-1 overflow-hidden">
          <div className="absolute right-[-25%] top-2 bottom-1 w-[130%]">
            <Image
              src="/active-truck.png"
              alt=""
              fill
              className="object-contain object-right-bottom"
              sizes="(min-width: 1280px) 43vw, (min-width: 640px) 65vw, 130vw"
            />
          </div>
        </div>
      </div>

      {/* Meta panel — white, standing out against the card's grey background. */}
      <div className="m-4 mt-3 flex flex-col gap-2 rounded-lg bg-card p-3">
        <div className="flex items-center justify-between gap-2 text-xs">
          <span className="flex min-w-0 items-center gap-1 truncate font-medium">
            {truck.route ? (
              <>
                <span className="truncate">{truck.route.originName}</span>
                <ArrowRightIcon className="size-3 shrink-0 text-muted-foreground" />
                <span className="truncate">{truck.route.destinationName}</span>
              </>
            ) : (
              "—"
            )}
          </span>
          <span className="shrink-0 truncate text-2xs text-muted-foreground">
            {truck.driverName} · {truck.dock ? `Dock ${truck.dock.code}` : "No dock"}
          </span>
        </div>

        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between text-2xs text-muted-foreground">
            <span>Route progress</span>
            <span>{progress}%</span>
          </div>
          {/* Fixed green fill, matching the reference — the bar's color reads
              as "how far along", the status pill already carries DELAYED/etc. */}
          <ProgressBar value={truck.progress} label="Route progress" indicatorClassName="bg-success" />
        </div>

        {/* The way through to this truck's operations screen. Linked by
            `reference` rather than `id` — `GET /trucks/:id` resolves both, and
            the readable one is what an operator would type. */}
        <Button
          size="sm"
          variant="outline"
          className="w-full"
          nativeButton={false}
          render={<Link href={`/truck-ops/${encodeURIComponent(truck.reference)}`} />}
        >
          Open operations
          <ArrowRightIcon />
        </Button>
      </div>
    </Card>
  );
}
