"use client";

import { useEffect } from "react";

import { notify } from "@/lib/toast";
import type { RealtimeAlert } from "@/stores/alert-helpers";
import { useAlertStore } from "@/stores/use-alert-store";

/**
 * Module-level, like the socket registry — a component-scoped ref would let a
 * StrictMode/Fast-Refresh remount re-toast every alert already on screen.
 * Re-derived from the store's own (capped) alert list on each pass, so it
 * cannot grow past `MAX_ALERTS`.
 */
const toasted = new Set<string>();

function toastFor(alert: RealtimeAlert): void {
  // The server's own title and message, unedited — this bridge does not
  // compose an operator line the backend did not write.
  const options = { description: alert.message };

  switch (alert.severity) {
    case "CRITICAL":
      // A NO_DOCK_AVAILABLE means a truck is stranded with nowhere to go and
      // needs a human. It must not auto-dismiss out from under the operator.
      notify.error(alert.title, { ...options, duration: Infinity });
      return;
    case "WARNING":
      notify.warning(alert.title, options);
      return;
    case "INFO":
      notify.info(alert.title, options);
      return;
  }
}

/**
 * Toasts alerts as they are *pushed* — never as they are seeded.
 *
 * `seedAlerts` marks every REST-snapshot row `isRead: true`
 * (`stores/alert-helpers.ts`), so gating on `!isRead` is what stops a page load
 * from firing a hundred toasts for history the operator has already lived
 * through. The `toasted` set is the second guard: a seed merges rows in
 * *behind* live ones, so the array identity changes without anything new
 * arriving.
 *
 * Subscribed imperatively rather than derived during render: the React
 * Compiler lint rules in this project forbid setState-in-effect, and a toast is
 * a side effect on an external system either way.
 */
export function useAlertToasts(): void {
  useEffect(() => {
    const emit = (alerts: readonly RealtimeAlert[], silent = false) => {
      // Oldest first, so a cascade's toasts stack in the order the backend
      // raised them (the feed itself is newest-first).
      for (let index = alerts.length - 1; index >= 0; index -= 1) {
        const alert = alerts[index];
        if (toasted.has(alert.id)) continue;
        toasted.add(alert.id);
        if (!silent && !alert.isRead) toastFor(alert);
      }

      // Forget anything that has fallen off the end of the capped feed.
      const live = new Set(alerts.map((alert) => alert.id));
      for (const id of toasted) {
        if (!live.has(id)) toasted.delete(id);
      }
    };

    // Anything already in the store when this mounts has been on screen
    // without a toast; record it as seen rather than replaying it.
    emit(useAlertStore.getState().alerts, true);

    return useAlertStore.subscribe((state, previous) => {
      if (state.alerts === previous.alerts) return;
      emit(state.alerts);
    });
  }, []);
}
