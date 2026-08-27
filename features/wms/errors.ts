"use client";

import { isApiError } from "@/lib/api/errors";

/**
 * Presents a failed WMS command without hiding what the backend said.
 *
 * The WMS feed is a *source of facts*, and the backend is what decides whether
 * a fact is admissible (AGENTS.md §2). Its refusals are specific and already
 * operator-readable — a `409` naming the door a truck actually holds, a `400`
 * explaining that `DELAYED` belongs to the delay endpoints — so on `400` /
 * `404` / `409` its own sentence passes through verbatim. Only transport- and
 * envelope-level failures, which carry no meaningful text, get substitute
 * wording.
 *
 * This mirrors `features/docks/errors.ts` deliberately; the reasoning is the
 * same, and the two should not drift apart.
 */
export function wmsCommandError(error: unknown, fallback: string): string {
  if (!isApiError(error)) {
    return error instanceof Error && error.message ? error.message : fallback;
  }

  if (error.code === "NETWORK") {
    return "Could not reach the backend — check the connection and try again.";
  }

  if (error.code === "VALIDATION") {
    return "The backend returned a response this panel could not read.";
  }

  return error.message || fallback;
}
