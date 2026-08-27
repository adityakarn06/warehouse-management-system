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

/**
 * Time remaining until a server-sent arrival instant ("in 2h 14m", "in 8m",
 * "due"). Pair it with `formatTime`/`formatDateTime`, never replace them: the
 * absolute instant is what a dock gets scheduled against.
 *
 * This is presentation of `eta` as the backend sent it, not a second opinion
 * about it — the ETA itself is computed server-side and the frontend never
 * derives one (AGENTS.md). A truck holding a constant speed keeps a constant
 * arrival *instant* and emits no `TRUCK_ETA_UPDATED` at all
 * (docs/realtime.md), so this countdown is the only part of an on-schedule
 * truck's ETA that visibly moves.
 *
 * `now` is passed in rather than read from the clock so the caller controls
 * the cadence — see `useNow`.
 *
 * `compact` drops the "in " prefix ("2h 14m"). Meant for the map markers,
 * where the label is a pill floating over the tiles and the extra three
 * characters on nine trucks is the difference between labels that sit apart
 * and labels that overlap.
 */
export function formatCountdown(
  iso: string | null | undefined,
  now: number,
  { compact = false }: { compact?: boolean } = {},
): string {
  const date = parseIso(iso);
  // `now` is 0 during server rendering, where there is no clock to count from.
  if (!date || now <= 0) return "—";

  const remainingMs = date.getTime() - now;
  if (remainingMs <= 0) return "due";

  const prefix = compact ? "" : "in ";
  const minutes = Math.floor(remainingMs / 60_000);
  if (minutes < 1) return `${prefix}<1m`;
  if (minutes < 60) return `${prefix}${minutes}m`;

  const hours = Math.floor(minutes / 60);
  const restMinutes = minutes % 60;
  if (hours < 24) {
    return restMinutes === 0 ? `${prefix}${hours}h` : `${prefix}${hours}h ${restMinutes}m`;
  }

  const days = Math.floor(hours / 24);
  const restHours = hours % 24;
  return restHours === 0 ? `${prefix}${days}d` : `${prefix}${days}d ${restHours}h`;
}

/**
 * Coarse relative time ("just now" / "12m ago" / "3h ago") for a feed row.
 *
 * `now` is injected like `formatCountdown`'s rather than read from the clock
 * here: reading it internally made the value a render-time constant, so an
 * alert's age froze at whatever it was when the feed last re-rendered for
 * some unrelated reason. Pass `useNow()`.
 */
export function formatRelativeTime(iso: string, now: number): string {
  const date = parseIso(iso);
  // `now` is 0 during server rendering, where there is no clock to measure from.
  if (!date || now <= 0) return "—";

  const minutes = Math.round((now - date.getTime()) / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  return `${Math.round(minutes / 60)}h ago`;
}

/**
 * Seconds-resolution age of a server-sent instant ("2s ago", "1m 20s ago").
 *
 * `formatRelativeTime`'s coarser buckets are right for a feed row but wrong for
 * a heartbeat: a simulation loop ticking every 2s and one that wedged 50s ago
 * both read "just now" there, which is exactly the distinction an operator
 * opens the control popover to make.
 */
export function formatSecondsAgo(iso: string | null | undefined, now: number): string {
  const date = parseIso(iso);
  if (!date || now <= 0) return "—";

  const seconds = Math.max(0, Math.round((now - date.getTime()) / 1000));
  if (seconds < 60) return `${seconds}s ago`;

  const minutes = Math.floor(seconds / 60);
  const restSeconds = seconds % 60;
  if (minutes < 60) return restSeconds === 0 ? `${minutes}m ago` : `${minutes}m ${restSeconds}s ago`;

  const hours = Math.floor(minutes / 60);
  const restMinutes = minutes % 60;
  return restMinutes === 0 ? `${hours}h ago` : `${hours}h ${restMinutes}m ago`;
}
