import type { Area, ResolvedUtilitiesArea } from "@/server/services/utilities";
import { UtilitiesDataError } from "@/server/services/utilities";

export interface NormalizedQuery {
  state: string;
  county?: string;
  city?: string;
}

export const CACHE_TTL_SECONDS = 60 * 60 * 24;
export const ACS_SOURCE = "U.S. Census Bureau ACS 5-year (2023)";
export const ACS_VINTAGE = "2023";

export function parseAreaParams(url: URL): { area: Area; normalized: NormalizedQuery } {
  const state = url.searchParams.get("state")?.trim();
  const county = url.searchParams.get("county")?.trim();
  const city = url.searchParams.get("city")?.trim();
  if (!state) throw new UtilitiesDataError("INVALID_INPUT", "State (2-letter code) is required.");
  if (!county && !city) throw new UtilitiesDataError("INVALID_INPUT", "Provide a county or city.");
  return {
    area: { state, ...(county ? { county } : {}), ...(city ? { city } : {}) },
    normalized: {
      state: state.toUpperCase(),
      county: county ? county.toLowerCase() : undefined,
      city: city ? city.toLowerCase() : undefined,
    },
  };
}

export function buildCacheKey(prefix: string, normalized: NormalizedQuery, extras: string[] = []): string {
  const base = [prefix, normalized.state, normalized.county ?? "", normalized.city ?? ""].join(":");
  if (!extras.length) return base;
  return `${base}:${extras.join(":")}`;
}

const STATUS_BY_CODE: Record<UtilitiesDataError["code"], number> = {
  INVALID_INPUT: 400,
  STATE_UNSUPPORTED: 400,
  LOCATION_NOT_FOUND: 404,
  LOCATION_AMBIGUOUS: 400,
  UPSTREAM_RATE_LIMIT: 503,
  UPSTREAM_ERROR: 502,
};

export function mapUtilitiesError(error: unknown): { status: number; body: { error: { code: string; message: string; details?: Record<string, unknown> } } } {
  if (error instanceof UtilitiesDataError) {
    return {
      status: STATUS_BY_CODE[error.code] ?? 500,
      body: { error: { code: error.code, message: error.message, details: error.details } },
    };
  }
  throw error;
}

export function formatAreaLabel(area: ResolvedUtilitiesArea): string {
  if (area.kind === "county") {
    return area.countyName ? `${area.countyName}, ${area.stateCode}` : `${area.stateCode} county`;
  }
  return area.placeName ? `${area.placeName}, ${area.stateCode}` : `${area.stateCode} city`;
}
