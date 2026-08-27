import { useDockStore } from "@/stores/use-dock-store";
import type { DockAssignmentResult, DockRecommendationsResponse } from "@/types";

/**
 * The human dock code for a dock id, taken from a row that actually carries
 * one — never derived from the id, which is a different field.
 *
 * The assignment row returned by `POST /dock-assignment` identifies its door by
 * id only, so the code has to come from one of the response's other rows (the
 * ranking, the exclusions, the current assignment) or from a door the store has
 * already seen. Falling back to the id would print a raw identifier into an
 * operator-facing line, so callers get `null` and decide what to show instead.
 */
export function resolveDockCode(
  data: DockRecommendationsResponse | DockAssignmentResult,
  dockId: string,
): string | null {
  if (data.currentAssignment?.dockDoorId === dockId) return data.currentAssignment.dockCode;

  const ranked = data.recommendations.find((rec) => rec.dockId === dockId);
  if (ranked) return ranked.dockCode;

  // A door the post-commit ranking no longer lists (now reserved by this very
  // commit, or excluded) still appears in `excluded[]` with its code.
  const excluded = data.excluded.find((entry) => entry.dockId === dockId);
  if (excluded) return excluded.dockCode;

  return useDockStore.getState().docksById[dockId]?.code ?? null;
}
