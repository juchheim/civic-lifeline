import type { BenefitsLocalHelpResult } from "@cl/types";
import { z } from "zod";

export interface AjcConfig {
  baseUrl: string;
  token: string | undefined;
  userId: string | undefined;
  radiusMiles: number;
  enabled: boolean;
}

export class AjcNotConfiguredError extends Error {
  constructor() {
    super("American Job Center API not configured");
  }
}

export function getAjcConfig(): AjcConfig {
  const baseUrl = process.env.CAREERONESTOP_API_BASE?.trim() || "https://api.careeronestop.org";
  const token = process.env.CAREERONESTOP_API_TOKEN?.trim();
  const userId = process.env.CAREERONESTOP_USER_ID?.trim();
  const radiusSetting = Number(process.env.CAREERONESTOP_AJC_RADIUS_MILES ?? "25");
  const radiusMiles = Number.isFinite(radiusSetting) && radiusSetting > 0 ? radiusSetting : 25;

  return {
    baseUrl,
    token,
    userId,
    radiusMiles,
    enabled: Boolean(token && userId),
  };
}

const zAjcCenter = z.object({
  ID: z.union([z.string(), z.number()]).optional().nullable(),
  Name: z.string().nullable().optional(),
  Address1: z.string().nullable().optional(),
  Address2: z.string().nullable().optional(),
  City: z.string().nullable().optional(),
  StateAbbr: z.string().nullable().optional(),
  Zip: z.string().nullable().optional(),
  Phone: z.string().nullable().optional(),
  Latitude: z.union([z.number(), z.string()]).nullable().optional(),
  Longitude: z.union([z.number(), z.string()]).nullable().optional(),
  WebSiteUrl: z.string().nullable().optional(),
  WebsiteUrl: z.string().nullable().optional(),
  Distance: z.union([z.number(), z.string()]).nullable().optional(),
  Miles: z.union([z.number(), z.string()]).nullable().optional(),
});

const zAjcResponse = z.object({
  OneStopCenterList: z.array(zAjcCenter).optional().default([]),
  RecordCount: z.number().optional().nullable(),
  AreaValidationErr: z.string().optional().nullable(),
});

interface FetchAjcCentersParams {
  locationText: string;
  radiusMiles?: number;
  signal?: AbortSignal;
}

export interface AjcFetchResult {
  items: BenefitsLocalHelpResult[];
  rawCount: number;
  areaValidationErr: string | null;
}

export async function fetchAjcCentersForLocation(params: FetchAjcCentersParams): Promise<AjcFetchResult> {
  const config = getAjcConfig();
  if (!config.enabled) {
    throw new AjcNotConfiguredError();
  }

  const centerType = "0";
  const youthServices = "0";
  const workersServices = "0";
  const businessServices = "0";
  const sortColumns = "Distance";
  const sortDirections = "ASC";
  const startRecord = "0";
  const limitRecord = "25";

  const encodedUserId = encodeURIComponent(config.userId ?? "");
  const encodedLocation = encodeURIComponent(params.locationText.trim());
  const radius = params.radiusMiles ?? config.radiusMiles;

  const path = `/v1/ajcfinder/${encodedUserId}/${encodedLocation}/${radius}/${centerType}/${youthServices}/${workersServices}/${businessServices}/${sortColumns}/${sortDirections}/${startRecord}/${limitRecord}`;
  const url = new URL(path, config.baseUrl);

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: {
      Authorization: `Bearer ${config.token}`,
      Accept: "application/json",
    },
    signal: params.signal,
  });

  if (!res.ok) {
    const errorText = await res.text().catch(() => "Unable to read error response");
    throw new Error(`AJC request failed with ${res.status}: ${errorText}`);
  }

  const json = await res.json();
  const parsed = zAjcResponse.parse(json);

  const mappedItems =
    (parsed.OneStopCenterList ?? [])
      .filter((center) => (center.Name ?? "").trim().length > 0)
      .map((center, index): BenefitsLocalHelpResult => {
        const id =
          typeof center.ID === "number"
            ? String(center.ID)
            : typeof center.ID === "string" && center.ID.trim().length > 0
              ? center.ID
              : undefined;
        const name = (center.Name ?? "").trim() || "American Job Center";
        const address = [center.Address1, center.Address2].filter((line) => (line ?? "").trim().length > 0).join(", ");
        const phone = (center.Phone ?? "").trim();
        const website = (center.WebSiteUrl ?? center.WebsiteUrl ?? "").trim();

        return {
          id: id ?? `ajc-${index}`,
          name,
          address: address || undefined,
          city: center.City ?? undefined,
          state: center.StateAbbr ?? undefined,
          postalCode: center.Zip ?? undefined,
          phone: phone || undefined,
          website: website || undefined,
          distanceMiles: parseDistance(center.Distance ?? center.Miles),
          source: "career-onestop-ajc",
        };
      }) ?? [];

  return {
    items: mappedItems,
    rawCount: parsed.RecordCount ?? mappedItems.length,
    areaValidationErr: parsed.AreaValidationErr ?? null,
  };
}

function parseDistance(value: unknown): number | undefined {
  if (typeof value === "number") return Number.isFinite(value) ? value : undefined;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}
