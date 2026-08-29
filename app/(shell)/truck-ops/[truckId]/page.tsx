import { notFound } from "next/navigation";

import { TruckOpsView } from "@/components/truck-ops/truck-ops-view";

/**
 * Deep-linkable truck operations. The segment is validated for *shape* here
 * (non-empty after decoding) so a malformed URL is a 404 page rather than a
 * failed fetch; whether a well-formed identifier actually exists is the
 * backend's answer, rendered as a not-found state inside `TruckOpsView`.
 *
 * The identifier may be a truck id, its `reference` (`TRK-101`) or its
 * `trailerId` (`TRL-101`) — `GET /trucks/:id` tries all three in that order.
 */
export default async function TruckOpsDetailPage(props: PageProps<"/truck-ops/[truckId]">) {
  const { truckId } = await props.params;
  const identifier = decodeURIComponent(truckId).trim();

  if (!identifier) notFound();

  return <TruckOpsView identifier={identifier} />;
}
