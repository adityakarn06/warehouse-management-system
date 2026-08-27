"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SearchIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trackingNumberInputSchema } from "@/schemas/tracking.schema";
import { cn } from "@/lib/utils";

/**
 * The lookup. Validation is client-side *shape* only — the schema normalises
 * casing and rejects an unparseable string, but whether a well-formed number
 * exists is the backend's answer (a 404), never a guess made here.
 */
export function TrackingSearchForm({
  className,
  autoFocus = false,
}: {
  className?: string;
  autoFocus?: boolean;
}) {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        const parsed = trackingNumberInputSchema.safeParse(value);
        if (!parsed.success) {
          setError(parsed.error.issues[0]?.message ?? "Enter a valid tracking number.");
          return;
        }
        setError(null);
        router.push(`/track/${encodeURIComponent(parsed.data)}`);
      }}
      className={cn("w-full max-w-md", className)}
    >
      <div className="flex items-center gap-2">
        <Input
          autoFocus={autoFocus}
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            if (error) setError(null);
          }}
          placeholder="E2-TRACK-101"
          aria-label="Tracking number"
          aria-invalid={error !== null}
          aria-describedby={error ? "tracking-number-error" : undefined}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          inputMode="text"
          enterKeyHint="search"
          className="font-mono uppercase"
        />
        <Button type="submit" size="icon" aria-label="Track shipment">
          <SearchIcon />
        </Button>
      </div>

      {error ? (
        <p id="tracking-number-error" role="alert" className="mt-2 text-xs text-destructive">
          {error}
        </p>
      ) : (
        <p className="mt-2 text-xs text-muted-foreground">
          Enter the tracking number from the shipment confirmation.
        </p>
      )}
    </form>
  );
}
