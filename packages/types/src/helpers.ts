import { z } from "zod";

export const zFips = z.string().regex(/^\d{5}$/);
export const zISODate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/);
export const zYear = z.number().int().gte(1990).lte(2100);
export const zLon = z.number().gte(-180).lte(180);
export const zLat = z.number().gte(-90).lte(90);

export const zPoint = z.object({
  type: z.literal("Point"),
  coordinates: z.tuple([zLon, zLat]),
});

export type LonLat = z.infer<typeof zPoint>["coordinates"];
export type GeoPoint = z.infer<typeof zPoint>;
