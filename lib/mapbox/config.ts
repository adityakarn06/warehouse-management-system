export const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;

/** No `ThemeProvider` is mounted yet, so the app is light-only — one constant to swap later. */
export const MAP_STYLE_URL = "mapbox://styles/mapbox/light-v11";

/** Centred on the seeded corridor (Delhi NCR → Kolkata); superseded by the
 * one-time `fitBounds` as soon as the first fleet snapshot lands. */
export const DEFAULT_MAP_CENTER = { longitude: 82.5, latitude: 25.2 };
export const DEFAULT_MAP_ZOOM = 4.2;

/** Leaves room for the control cluster and the marker labels. */
export const FIT_BOUNDS_PADDING = { top: 48, bottom: 48, left: 48, right: 64 };
export const FIT_BOUNDS_MAX_ZOOM = 9;

/** Zoom used when the user explicitly focuses one truck. */
export const FOCUS_ZOOM = 8;
export const FLY_DURATION_MS = 900;

/**
 * Route corridor colours.
 *
 * Mapbox paint properties take literal colour strings, so these cannot read the
 * `oklch` custom properties in `globals.css` directly — they are the sRGB
 * equivalents of the design tokens, kept here so the map is not the one place
 * in the app carrying unexplained hex values:
 *
 *   ROUTE_CASING_COLOR   = `--card`            oklch(1 0 0)
 *   ROUTE_IDLE_COLOR     = `--muted-foreground` oklch(0.556 0 0)
 *   ROUTE_SELECTED_COLOR = `--info`            oklch(0.55 0.12 240)
 *
 * The app is light-only (see `MAP_STYLE_URL`); revisit these together with it.
 */
export const ROUTE_CASING_COLOR = "#ffffff";
export const ROUTE_IDLE_COLOR = "#737373";
export const ROUTE_SELECTED_COLOR = "#1479b0";

/** Idle corridors recede so the selected one reads first. */
export const ROUTE_IDLE_WIDTH = 2;
export const ROUTE_SELECTED_WIDTH = 4;
export const ROUTE_IDLE_OPACITY = 0.4;
export const ROUTE_SELECTED_OPACITY = 1;
