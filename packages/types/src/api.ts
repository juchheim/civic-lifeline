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
  fips: string;
  asOf: string;
  coverage: { "25_3": number | null; "100_20": number | null; "1000_100": number | null };
  totalUnits?: number;
  technologies?: Array<{ name: string; coverage: number }>;
  resolvedLocation?: { name?: string | null; postalCode?: string | null } | null;
}
export const zBroadbandSummaryResponse = z
  .object({
    fips: z.string(),
    asOf: z.string(),
    coverage: z.object({
      "25_3": z.number().nullable(),
      "100_20": z.number().nullable(),
      "1000_100": z.number().nullable(),
    }),
    totalUnits: z.number().optional(),
    technologies: z
      .array(
        z.object({
          name: z.string(),
          coverage: z.number(),
        }),
      )
      .optional(),
    resolvedLocation: z
      .object({
        name: z.string().nullable().optional(),
        postalCode: z.string().nullable().optional(),
      })
      .nullable()
      .optional(),
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

// Utilities
export const zUtilitiesAreaSummary = z.object({
  kind: z.union([z.literal("county"), z.literal("place")]),
  stateCode: z.string().length(2),
  stateName: z.string(),
  stateFips: z.string().length(2),
  countyFips: z.string().length(5).optional(),
  countyName: z.string().optional(),
  placeCode: z.string().optional(),
  placeName: z.string().optional(),
  label: z.string().optional(),
});
export type UtilitiesAreaSummary = z.infer<typeof zUtilitiesAreaSummary>;

export const zUtilitiesCoverageSummary = z.object({
  countyFips: z.string().length(5),
  stateFips: z.string().length(2),
  countyName: z.string().optional(),
  stateCode: z.string().length(2),
});
export type UtilitiesCoverageSummary = z.infer<typeof zUtilitiesCoverageSummary>;

export const zUtilitiesCostBucket = z.object({
  label: z.string(),
  var: z.string(),
  count: z.number(),
});
export type UtilitiesCostBucket = z.infer<typeof zUtilitiesCostBucket>;

export const zUtilitiesCostDistribution = z.object({
  total: z.number(),
  buckets: z.array(zUtilitiesCostBucket),
  estTypicalMonthly: z.number().nullable(),
});
export type UtilitiesCostDistribution = z.infer<typeof zUtilitiesCostDistribution>;

export const zUtilitiesCostsResponse = z
  .object({
    area: zUtilitiesAreaSummary,
    electric: zUtilitiesCostDistribution,
    gas: zUtilitiesCostDistribution,
    waterSewer: z.object({
      estTypicalMonthly: z.number().nullable(),
      annual: zUtilitiesCostDistribution,
    }),
    assumptions: z.object({
      topBucketMidpoints: z.object({
        electricGas: z.number(),
        waterSewerAnnual: z.number(),
      }),
      notes: z.array(z.string()),
    }),
  })
  .and(zSourceMeta);
export type UtilitiesCostsResponse = z.infer<typeof zUtilitiesCostsResponse>;

export const zUtilitiesWaterProvider = z.object({
  systemName: z.string(),
  populationServed: z.number().optional(),
  pwsId: z.string().optional(),
});
export type UtilitiesWaterProvider = z.infer<typeof zUtilitiesWaterProvider>;

export const zUtilitiesCompanyProvider = z.object({
  name: z.string(),
  state: z.string(),
  phone: z.string().optional(),
  website: z.string().optional(),
});
export type UtilitiesCompanyProvider = z.infer<typeof zUtilitiesCompanyProvider>;

const zUtilitiesProvidersBaseFields = z.object({
  area: zUtilitiesAreaSummary,
  coverage: zUtilitiesCoverageSummary,
  notes: z.string().optional(),
});

export const zUtilitiesWaterProvidersResponse = zUtilitiesProvidersBaseFields
  .extend({
    items: z.array(zUtilitiesWaterProvider),
    summary: z
      .object({
        total: z.number().optional(),
        returned: z.number().optional(),
      })
      .optional(),
  })
  .and(zSourceMeta);
export type UtilitiesWaterProvidersResponse = z.infer<typeof zUtilitiesWaterProvidersResponse>;

export const zUtilitiesElectricProvidersResponse = zUtilitiesProvidersBaseFields
  .extend({
    items: z.array(zUtilitiesCompanyProvider),
  })
  .and(zSourceMeta);
export type UtilitiesElectricProvidersResponse = z.infer<typeof zUtilitiesElectricProvidersResponse>;

export const zUtilitiesGasProvidersResponse = zUtilitiesProvidersBaseFields
  .extend({
    items: z.array(zUtilitiesCompanyProvider),
  })
  .and(zSourceMeta);
export type UtilitiesGasProvidersResponse = z.infer<typeof zUtilitiesGasProvidersResponse>;

// Optional: generic API error (kept for convenience)
export const zApiError = z.object({ error: z.object({ code: z.string(), message: z.string(), upstream: z.string().optional() }) });
export type ApiError = z.infer<typeof zApiError>;
