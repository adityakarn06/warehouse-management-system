import { z } from "zod";

export const routeGeometryPointSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
});

export const routeSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  geometry: z.array(routeGeometryPointSchema).optional(),
});

export type Route = z.infer<typeof routeSchema>;
export type RouteGeometryPoint = z.infer<typeof routeGeometryPointSchema>;
