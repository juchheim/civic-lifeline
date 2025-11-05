import { z } from "zod";
import { zISODate } from "./helpers";

// Common meta shared by all responses
export interface SourceMeta {
  source: string;
  lastUpdated: string; // ISO
  dataVintage?: string;
}
export const zSourceMeta = z.object({
  source: z.string(),
  lastUpdated: zISODate,
  dataVintage: z.string().optional(),
});

// SnapItem, SnapResponse
export interface SnapItem {
  id: string;
  name: string;
  address: string;
  coords: [number, number];
  storeType?: string;
  phone?: string | null;
  hours?: string | null;
}
export const zSnapItem = z.object({
  id: z.string(),
  name: z.string(),
  address: z.string(),
  coords: z.tuple([z.number(), z.number()]),
  storeType: z.string().optional(),
  phone: z.string().nullable().optional(),
  hours: z.string().nullable().optional(),
});

export interface SnapResponse extends SourceMeta {
  items: SnapItem[];
}
export const zSnapResponse = z.object({ items: z.array(zSnapItem) }).and(zSourceMeta);

// UnemploymentResponse
export interface UnemploymentResponse extends SourceMeta {
  seriesId: string;
  adjusted: boolean;
  points: Array<{ date: string; value: number }>;
}
export const zUnemploymentResponse = z
  .object({
    seriesId: z.string(),
    adjusted: z.boolean(),
    points: z.array(z.object({ date: z.string(), value: z.number() })),
  })
  .and(zSourceMeta);

// BroadbandSummaryResponse
export interface BroadbandSummaryResponse extends SourceMeta {
  providerCount: number;
  speed: { "25_3": boolean; "100_20": boolean; "1000_100": boolean };
  tech: string[];
  asOf: string; // YYYY-MM-DD
}
export const zBroadbandSummaryResponse = z
  .object({
    providerCount: z.number().int(),
    speed: z.object({ "25_3": z.boolean(), "100_20": z.boolean(), "1000_100": z.boolean() }),
    tech: z.array(z.string()),
    asOf: z.string(),
  })
  .and(zSourceMeta);

// CounselorsResponse
export interface CounselorsResponse extends SourceMeta {
  items: Array<{
    id: string;
    name: string;
    phone?: string;
    website?: string;
    services?: string[];
    languages?: string[];
    coords?: [number, number];
    address?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    distanceMiles?: number;
  }>;
}
const zCounselorItem = z.object({
  id: z.string(),
  name: z.string(),
  phone: z.string().optional(),
  website: z.string().optional(),
  services: z.array(z.string()).optional(),
  languages: z.array(z.string()).optional(),
  coords: z.tuple([z.number(), z.number()]).optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postalCode: z.string().optional(),
  distanceMiles: z.number().optional(),
});
export const zCounselorsResponse = z.object({ items: z.array(zCounselorItem) }).and(zSourceMeta);

// FmrResponse
export interface FmrResponse extends SourceMeta {
  year: number;
  fips?: string;
  areaName: string;
  br0: number;
  br1: number;
  br2: number;
  br3: number;
  br4: number;
  resolvedLocation?: { name?: string | null; postalCode?: string | null } | null;
}
export const zFmrResponse = z
  .object({
    year: z.number().int(),
    fips: z.string().optional(),
    areaName: z.string(),
    br0: z.number(),
    br1: z.number(),
    br2: z.number(),
    br3: z.number(),
    br4: z.number(),
    resolvedLocation: z
      .object({
        name: z.string().nullable().optional(),
        postalCode: z.string().nullable().optional(),
      })
      .nullable()
      .optional(),
  })
  .and(zSourceMeta);

// Optional: generic API error (kept for convenience)
export const zApiError = z.object({ error: z.object({ code: z.string(), message: z.string(), upstream: z.string().optional() }) });
export type ApiError = z.infer<typeof zApiError>;
