import { NextRequest } from "next/server";
import { createLogger } from "@/lib/logger";

export const revalidate = 0;

const logger = createLogger("api/geocode/suggest");

const USER_AGENT = "CivicLifeline/1.0 (contact@civiclifeline.org)";

const RATE_LIMIT_CAPACITY = 2;
const RATE_LIMIT_RATE_PER_MS = 1 / 1000; // ~1 request per second
let availableTokens = RATE_LIMIT_CAPACITY;
let lastRefillMs = Date.now();

const CACHE_MAX_SIZE = 200;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
type Suggestion = {
  id: string;
  name: string;
  lat: number;
  lon: number;
  kind: string;
  state?: string;
  stateCode?: string;
  county?: string;
};
type CacheEntry = { expiresAt: number; value: Suggestion[] };
const cache = new Map<string, CacheEntry>();

function refillTokens(nowMs: number) {
  const elapsed = nowMs - lastRefillMs;
  if (elapsed <= 0) return;
  const tokensToAdd = elapsed * RATE_LIMIT_RATE_PER_MS;
  if (tokensToAdd > 0) {
    availableTokens = Math.min(RATE_LIMIT_CAPACITY, availableTokens + tokensToAdd);
    lastRefillMs = nowMs;
  }
}

function takeToken(): boolean {
  const now = Date.now();
  refillTokens(now);
  if (availableTokens < 1) {
    return false;
  }
  availableTokens -= 1;
  return true;
}

function normalizeQuery(q: string): string {
  return q.trim().toLowerCase().replace(/\s+/g, " ");
}

function getCache(key: string): Suggestion[] | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (entry.expiresAt < Date.now()) {
    cache.delete(key);
    return null;
  }
  // touch entry for LRU ordering
  cache.delete(key);
  cache.set(key, entry);
  return entry.value;
}

function setCache(key: string, value: Suggestion[]) {
  cache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
  if (cache.size > CACHE_MAX_SIZE) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey) cache.delete(oldestKey);
  }
}

function buildNominatimUrl(query: string, limit: number): string {
  const params = new URLSearchParams({
    q: query,
    format: "jsonv2",
    addressdetails: "1",
    countrycodes: "us",
    limit: String(limit),
  });
  return `https://nominatim.openstreetmap.org/search?${params.toString()}`;
}

function parseLimit(raw: string | null): number {
  const DEFAULT_LIMIT = 5;
  const MAX_LIMIT = 7;
  if (!raw) return DEFAULT_LIMIT;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_LIMIT;
  return Math.min(parsed, MAX_LIMIT);
}

export async function GET(request: NextRequest) {
  const startedAt = Date.now();
  const { searchParams } = new URL(request.url);
  const rawQuery = searchParams.get("q") ?? "";
  const query = rawQuery.trim();
  const limit = parseLimit(searchParams.get("limit"));
  const normalized = normalizeQuery(query);

  if (query.length < 3) {
    logger.warn("invalid query", { length: query.length });
    return Response.json({ error: "Query must be at least 3 characters." }, { status: 400 });
  }

  if (!takeToken()) {
    logger.warn("rate limited", { query: normalized });
    return new Response(JSON.stringify({ error: "Rate limit exceeded. Please retry shortly." }), {
      status: 429,
      headers: {
        "content-type": "application/json",
        "retry-after": "1",
      },
    });
  }

  const cacheKey = `${normalized}|${limit}`;
  const cached = getCache(cacheKey);
  if (cached) {
    const latencyMs = Date.now() - startedAt;
    logger.debug("cache hit", { query: normalized, limit, resultCount: cached.length, latencyMs });
    return Response.json(cached);
  }

  const url = buildNominatimUrl(query, limit);
  const abort = new AbortController();
  const timeout = setTimeout(() => abort.abort(), 5000);
  let responseBody: Suggestion[] = [];
  try {
    const res = await fetch(url, {
      headers: {
        accept: "application/json",
        "user-agent": USER_AGENT,
      },
      signal: abort.signal,
      cache: "no-store",
    });

    clearTimeout(timeout);

    if (!res.ok) {
      logger.error("upstream error", { status: res.status, query: normalized });
      const status = res.status === 504 ? 504 : 502;
      return Response.json({ error: "Suggestion lookup failed." }, { status });
    }

    const payload: Array<{
      place_id: number;
      display_name: string;
      lat: string;
      lon: string;
      type?: string;
      address?: Record<string, unknown>;
    }> = await res.json();

    responseBody = payload
      .map((item) => {
        const address = item.address && typeof item.address === "object" ? item.address : {};
        const county =
          typeof address?.county === "string"
            ? address.county
            : typeof address?.region === "string"
              ? address.region
              : undefined;
        const state =
          typeof address?.state === "string"
            ? address.state
            : typeof address?.state_district === "string"
              ? address.state_district
              : undefined;
        const stateCode = typeof address?.state_code === "string" ? address.state_code : undefined;
        const suggestion: Suggestion = {
          id: String(item.place_id),
          name: item.display_name,
          lat: Number.parseFloat(item.lat),
          lon: Number.parseFloat(item.lon),
          kind: item.type ?? "",
          county,
          state,
          stateCode,
        };
        return suggestion;
      })
      .filter((item) => Number.isFinite(item.lat) && Number.isFinite(item.lon));

    if (responseBody.length === 0) {
      logger.info("no matches", { query: normalized, limit });
      return Response.json({ error: "No matches found." }, { status: 404 });
    }

    setCache(cacheKey, responseBody);

    const latencyMs = Date.now() - startedAt;
    logger.info("suggestions fetched", { query: normalized, limit, resultCount: responseBody.length, latencyMs, cache: "miss" });

    return Response.json(responseBody);
  } catch (error) {
    clearTimeout(timeout);
    const latencyMs = Date.now() - startedAt;
    logger.error("upstream fetch failed", { error: error instanceof Error ? error.message : String(error), query: normalized, latencyMs });
    return Response.json({ error: "Suggestion service timed out." }, { status: 504 });
  }
}
