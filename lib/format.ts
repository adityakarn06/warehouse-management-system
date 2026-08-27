const timeFormatter = new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit" });
const dateTimeFormatter = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

/**
 * `Intl.DateTimeFormat.format` throws `RangeError: Invalid time value` on an
 * unparseable input, and the timestamps these take (`eta`, `scheduledStart`)
 * are typed as plain `z.string()` — so a malformed value would take down the
 * marker/panel/board that renders it rather than showing the em-dash.
 */
function parseIso(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** `HH:MM` in the viewer's locale — for a same-context ETA or scheduled time. */
export function formatTime(iso: string | null | undefined): string {
  const date = parseIso(iso);
  return date ? timeFormatter.format(date) : "—";
}

/** `Mon DD, HH:MM` — for a timestamp shown without other date context. */
export function formatDateTime(iso: string | null | undefined): string {
  const date = parseIso(iso);
  return date ? dateTimeFormatter.format(date) : "—";
}

/** Coarse relative time ("just now" / "12m ago" / "3h ago") for a feed row. */
export function formatRelativeTime(iso: string): string {
  const date = parseIso(iso);
  if (!date) return "—";
  const minutes = Math.round((Date.now() - date.getTime()) / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  return `${Math.round(minutes / 60)}h ago`;
}
