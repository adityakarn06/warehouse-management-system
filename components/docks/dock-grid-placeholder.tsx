import { EmptyState } from "@/components/ui/empty-state";
import { WarehouseIcon } from "lucide-react";

export function DockGridPlaceholder() {
  return (
    <EmptyState
      icon={WarehouseIcon}
      title="No dock data yet"
      description="Dock status will appear here once the yard data is wired up."
    />
  );
}
