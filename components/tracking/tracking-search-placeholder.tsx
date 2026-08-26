import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SearchIcon } from "lucide-react";

export function TrackingSearchPlaceholder() {
  return (
    <div className="flex max-w-md items-center gap-2">
      <Input placeholder="Enter tracking number…" disabled />
      <Button disabled size="icon">
        <SearchIcon />
      </Button>
    </div>
  );
}
