import Redis from "ioredis";
import { hashKey } from "./hash";

export interface CountyLookupResult {
  fips: string;
  countyName: string;
  stateCode: string;
  stateName?: string;
}

const CACHE_PREFIX = "housing:fcc:";
const CACHE_TTL_SECONDS = 24 * 60 * 60; // 24 hours

async function fetchWithRetry(url: string, maxRetries = 2, timeoutMs = 8000): Promise<any> {
  let delay = 200;
  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        headers: {
          accept: "application/json",
        },
        signal: controller.signal,
        cache: "no-store",
      });
      clearTimeout(timeout);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (error) {
      clearTimeout(timeout);
      if (attempt === maxRetries) throw error;
      await new Promise((resolve) => setTimeout(resolve, delay));
      delay = Math.min(2000, delay * 2);
    }
  }
}

export async function lookupCountyFips(lat: number, lon: number, opts: { redis?: Redis | null }): Promise<CountyLookupResult> {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) throw new Error("Latitude and longitude required for county lookup.");
  const latKey = lat.toFixed(4);
  const lonKey = lon.toFixed(4);
  const cacheKey = `${CACHE_PREFIX}${hashKey({ lat: latKey, lon: lonKey })}`;
  const redis = opts.redis ?? null;

  if (redis) {
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached) as CountyLookupResult;
  }

  const url = new URL("https://geo.fcc.gov/api/census/block/find");
  url.searchParams.set("latitude", lat.toString());
  url.searchParams.set("longitude", lon.toString());
  url.searchParams.set("format", "json");

  const json = await fetchWithRetry(url.toString(), 2, 8000);
  const county = json?.County;
  const state = json?.State;

  const rawFips = county?.FIPS ?? county?.fips ?? state?.FIPS;
  const fips = typeof rawFips === "string" ? rawFips.padStart(5, "0") : undefined;
  const countyName = typeof county?.name === "string" ? county.name : undefined;
  const stateCode = typeof state?.code === "string" ? state.code : undefined;
  const stateName = typeof state?.name === "string" ? state.name : undefined;

  if (!fips || fips.length < 5) {
    throw new Error("County FIPS could not be determined for that location.");
  }
  if (!stateCode) {
    throw new Error("State code missing for that location.");
  }

  const result: CountyLookupResult = {
    fips: fips.slice(0, 5),
    countyName: countyName ?? "",
    stateCode,
    stateName,
  };

  if (redis) {
    await redis.set(cacheKey, JSON.stringify(result), "EX", CACHE_TTL_SECONDS);
  }

  return result;
}
