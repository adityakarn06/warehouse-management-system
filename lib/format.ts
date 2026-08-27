const timeFormatter = new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit" });
const dateTimeFormatter = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

/** `HH:MM` in the viewer's locale — for a same-context ETA or scheduled time. */
export function formatTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  return timeFormatter.format(new Date(iso));
}

/** `Mon DD, HH:MM` — for a timestamp shown without other date context. */
export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  return dateTimeFormatter.format(new Date(iso));
}

/** Coarse relative time ("just now" / "12m ago" / "3h ago") for a feed row. */
export function formatRelativeTime(iso: string): string {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  return `${Math.round(minutes / 60)}h ago`;
}
