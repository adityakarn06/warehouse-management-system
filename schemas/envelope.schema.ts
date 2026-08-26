import { z } from "zod";

export const apiErrorSchema = z.object({
  error: z.object({
    message: z.string(),
    status: z.number(),
    details: z.array(z.unknown()).optional(),
  }),
});

export function apiSuccessSchema<T extends z.ZodTypeAny>(dataSchema: T) {
  return z.object({ data: dataSchema });
}

export function apiListSuccessSchema<T extends z.ZodTypeAny>(dataSchema: T) {
  return z.object({
    data: z.array(dataSchema),
    meta: z.object({
      total: z.number(),
      limit: z.number(),
      offset: z.number(),
    }),
  });
}

export type ApiError = z.infer<typeof apiErrorSchema>;
