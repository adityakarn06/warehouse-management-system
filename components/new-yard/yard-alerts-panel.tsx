"use client";

import { AlertFeed } from "@/components/alerts/alert-feed";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

import { glassSurface } from "./glass-surface";

/**
 * The alert feed on this page's panel surface. `AlertFeed` carries its own
 * header and mark-all-read control, so this deliberately does not use
 * `YardPanel` — a second title would just repeat it.
 */
export function YardAlertsPanel() {
  return (
    <Card size="sm" className={cn(glassSurface, "min-h-0")}>
      <CardContent className="flex min-h-0 flex-1 flex-col">
        <AlertFeed limit={20} />
      </CardContent>
    </Card>
  );
}
