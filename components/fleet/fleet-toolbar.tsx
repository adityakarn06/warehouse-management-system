"use client";

import { ChevronDownIcon, SearchIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { truckStatusSchema } from "@/schemas/common.schema";
import type { TruckStatus } from "@/types";

const STATUS_OPTIONS = truckStatusSchema.options;

/** Empty string sentinel for "All" — `DropdownMenuRadioGroup` needs a string
 * value and `TruckStatus | null` doesn't round-trip through it cleanly. */
const ALL_VALUE = "ALL";

interface FleetToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  status: TruckStatus | null;
  onStatusChange: (value: TruckStatus | null) => void;
}

export function FleetToolbar({ search, onSearchChange, status, onStatusChange }: FleetToolbarProps) {
  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        <SearchIcon className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search for truck ID"
          className="w-48 pl-7"
        />
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="outline">
              {status ? status.replace(/_/g, " ") : "Status"}
              <ChevronDownIcon />
            </Button>
          }
        />
        <DropdownMenuContent align="end">
          <DropdownMenuRadioGroup
            value={status ?? ALL_VALUE}
            onValueChange={(value) => onStatusChange(value === ALL_VALUE ? null : (value as TruckStatus))}
          >
            <DropdownMenuRadioItem value={ALL_VALUE}>All statuses</DropdownMenuRadioItem>
            {STATUS_OPTIONS.map((option) => (
              <DropdownMenuRadioItem key={option} value={option}>
                {option.replace(/_/g, " ")}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
