"use client";

import { isApiError } from "@/lib/api/errors";

export interface DockCommandError {
  message: string;
  /** `409` — the door changed between scoring and committing (taken by another
   * truck, or taken out of service). The ranking the operator was looking at is
   * stale, so callers should offer a re-check rather than a blind retry. */
  isConflict: boolean;
}

/**
 * Presents a failed dock command without hiding what the backend said.
 *
 * The backend is the source of truth for every dock decision (AGENTS.md §2), so
 * on `400` / `404` / `409` its own sentence *is* the explanation — a `400` for
 * an excluded dock quotes the exclusion reason verbatim
 * (`"Dock D3 cannot take TRK-101: Does not support REFRIGERATED loads"`), which
 * is strictly more useful than anything written here. Only transport- and
 * envelope-level failures, which carry no operator-meaningful text, get
 * substitute wording.
 */
export function dockCommandError(error: unknown, fallback: string): DockCommandError {
  if (!isApiError(error)) {
    return {
      message: error instanceof Error && error.message ? error.message : fallback,
      isConflict: false,
    };
  }

  if (error.code === "NETWORK") {
    return {
      message: "Could not reach the backend — check the connection and try again.",
      isConflict: false,
    };
  }

  if (error.code === "VALIDATION") {
    return {
      message: "The backend returned a response this board could not read.",
      isConflict: false,
    };
  }

  return { message: error.message || fallback, isConflict: error.status === 409 };
}
