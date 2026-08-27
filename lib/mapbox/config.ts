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
