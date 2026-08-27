"use client";

import { isApiError } from "@/lib/api/errors";

/**
 * Turns a failed delay / clear-delay command into something an operator can act
 * on. The status codes are the ones `docs/api.md` §Delay scenarios defines for
 * these two endpoints — `409` in particular is not a client bug but a real
 * operational state (the loop was stopped, or the truck arrived mid-command).
 */
export function delayCommandErrorMessage(error: unknown, reference: string): string {
  if (!isApiError(error)) {
    return error instanceof Error ? error.message : `Could not update ${reference}.`;
  }

  if (error.code === "NETWORK") {
    return "Could not reach the backend — check the connection and try again.";
  }

  switch (error.status) {
    case 409:
      return `${reference} can't be changed right now — it has already arrived, or the simulation loop is stopped.`;
    case 404:
      return `${reference} isn't being simulated right now, so scenarios can't be applied to it.`;
    // 400 is a refused command (unknown scenario) — the backend's own wording is
    // more specific than anything worth writing here.
    default:
      return error.message || `Could not update ${reference}.`;
  }
}
