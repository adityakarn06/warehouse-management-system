import { EmptyState } from "@/components/ui/empty-state";
import { BellIcon } from "lucide-react";

export function AlertFeedPlaceholder() {
  return (
    <EmptyState
      icon={BellIcon}
      title="No alerts yet"
      description="Live alerts will appear here once realtime data is wired up."
    />
  );
}
