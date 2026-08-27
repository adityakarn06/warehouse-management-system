"use client";

import { useUIStore } from "@/stores/use-ui-store";

/** Anchor id on the Dock recommendations section of /yard. */
export const DOCK_RECOMMENDATIONS_ANCHOR = "dock-recommendations";

/**
 * "Review" hands a truck off to `DockRecommendationPanel`, which lives far up
 * the page from the boards that trigger it — selecting alone is invisible, so
 * the reveal is part of the action.
 */
export function useReviewTruck() {
  const selectedTruckId = useUIStore((s) => s.selectedTruckId);
  const selectTruck = useUIStore((s) => s.selectTruck);

  function reviewTruck(truckId: string) {
    const isSelected = selectedTruckId === truckId;
    selectTruck(isSelected ? null : truckId);
    if (isSelected) return;
    document.getElementById(DOCK_RECOMMENDATIONS_ANCHOR)?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
      block: "start",
    });
  }

  return { selectedTruckId, reviewTruck };
}
