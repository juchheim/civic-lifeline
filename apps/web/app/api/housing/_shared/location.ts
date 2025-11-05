import Redis from "ioredis";
import { hashKey } from "./hash";

export interface ResolvedLocation {
  lat: number;
  lon: number;
  name: string;
  query: string;
  postalCode?: string;
  city?: string;
  county?: string;
  state?: string;
  stateCode?: string;
}

const CACHE_PREFIX = "housing:loc:";
const CACHE_TTL_SECONDS = 30 * 60; // 30 minutes

function normalizeQuery(query: string): string {
  return query.trim().toLowerCase().replace(/\s+/g, " ");
}

export async function resolveLocation(query: string, opts: { origin: string; redis?: Redis | null }): Promise<ResolvedLocation> {
  const trimmed = query.trim();
  if (!trimmed) throw new Error("Location query required");
  const normalized = normalizeQuery(trimmed);
  const cacheKey = `${CACHE_PREFIX}${hashKey({ q: normalized })}`;
  const redis = opts.redis ?? null;

  if (redis) {
    const cached = await redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached) as ResolvedLocation;
    }
  }

  const url = new URL("/api/geocode", opts.origin);
  url.searchParams.set("q", trimmed);

  const res = await fetch(url.toString(), {
    headers: {
      accept: "application/json",
    },
    cache: "no-store",
  });

  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const message = (body && typeof body === "object" && "error" in body && typeof (body as any).error === "string"
      ? (body as any).error
      : null) ?? "Unable to resolve location.";
    throw new Error(message);
  }

  const lat = typeof (body as any)?.lat === "number" ? (body as any).lat : Number.NaN;
  const lon = typeof (body as any)?.lon === "number" ? (body as any).lon : Number.NaN;
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    throw new Error("Geocoding service returned invalid coordinates.");
  }

  const result: ResolvedLocation = {
    lat,
    lon,
    name: typeof (body as any)?.name === "string" ? (body as any).name : trimmed,
    query: trimmed,
  };

  const address = (body as any)?.address;
  if (address && typeof address === "object") {
    if (typeof (address as any).postalCode === "string") result.postalCode = (address as any).postalCode;
    if (typeof (address as any).city === "string") result.city = (address as any).city;
    if (typeof (address as any).county === "string") result.county = (address as any).county;
    if (typeof (address as any).state === "string") result.state = (address as any).state;
    if (typeof (address as any).stateCode === "string") result.stateCode = (address as any).stateCode;
  }

  if (redis) {
    await redis.set(cacheKey, JSON.stringify(result), "EX", CACHE_TTL_SECONDS);
  }

  return result;
}
