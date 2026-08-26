import { z } from "zod";

import { dockAssignmentStatusSchema, loadTypeSchema } from "./common.schema";

/** GET /dock-assignments row. Distinct from the assignment shapes nested under
 * trucks/docks/shipments — this is the flat, standalone list. */
export const dockAssignmentListItemSchema = z.object({
  id: z.string(),
  status: dockAssignmentStatusSchema,
  score: z.number().nullish(),
  reasons: z.array(z.string()).optional(),
  scheduledStart: z.string().nullish(),
  scheduledEnd: z.string().nullish(),
  assignedAt: z.string().nullish(),
  releasedAt: z.string().nullish(),
  reassignedAt: z.string().nullish(),
  previousAssignmentId: z.string().nullish(),
  createdAt: z.string(),
  truck: z.object({
    id: z.string(),
    reference: z.string(),
    trailerId: z.string(),
    status: z.string(),
    eta: z.string().nullish(),
  }),
  shipment: z.object({
    id: z.string(),
    reference: z.string(),
    priority: z.string(),
    loadType: loadTypeSchema,
  }),
  dockDoor: z.object({
    id: z.string(),
    code: z.string(),
    name: z.string(),
    zone: z.string(),
    status: z.string(),
    supportedLoadTypes: z.array(loadTypeSchema),
  }),
});

export type DockAssignmentListItem = z.infer<typeof dockAssignmentListItemSchema>;
