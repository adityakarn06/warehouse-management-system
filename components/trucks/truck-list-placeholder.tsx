import { EmptyState } from "@/components/ui/empty-state";
import { TruckIcon } from "lucide-react";

export function TruckListPlaceholder() {
  return (
    <EmptyState
      icon={TruckIcon}
      title="No live truck data yet"
      description="Truck positions will appear here once realtime data is wired up."
    />
  );
}
