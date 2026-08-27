"use client";

import { useAlertFeed, useAlertToasts } from "@/features/alerts";

/**
 * Owns the alert feed's two app-wide concerns and renders nothing.
 *
 * It lives in the shell layout rather than on a page so the feed is seeded once
 * per session and stays populated across route changes — a dock takedown on
 * `/yard` must be visible from `/dashboard`, and the header bell needs a real
 * unread count on every route.
 */
export function AlertProvider() {
  useAlertFeed();
  useAlertToasts();

  return null;
}
