import { NextRequest, NextResponse } from "next/server";
import { createLogger } from "@/lib/logger";
import { zQuery, buildHudCounselorsUrl, transformHudToCounselors, normalizeRadius } from "./lib";
import { getRedis } from "../_shared/redis";
import { hashKey } from "../_shared/hash";
import { resolveLocation } from "../_shared/location";
import { fetchArcgisCounselors } from "./arcgis";

const log = createLogger("api/housing/counselors");

async function fetchWithRetry(url: string, opts: { timeoutMs: number }, maxRetries = 3): Promise<any> {
  let delay = 200;
  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), opts.timeoutMs);
    try {
      const res = await fetch(url, {
        method: "GET",
        signal: controller.signal,
        headers: {
          accept: "application/json",
          ...(process.env.HUD_TOKEN ? { Authorization: `Bearer ${process.env.HUD_TOKEN}` } : {}),
        },
        cache: "no-store",
      });
      clearTimeout(t);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (json && json.error) throw new Error("HUD error body");
      return json;
    } catch (err) {
      clearTimeout(t);
      if (attempt === maxRetries) throw err;
      await new Promise((r) => setTimeout(r, delay));
      delay = Math.min(2000, delay * 2);
    }
  }
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const redis = getRedis();
  const useHudApi = process.env.HUD_COUNSELORS_USE_LIVE_API === "true";

  const q = url.searchParams.get("q")?.trim();
  const latParam = url.searchParams.get("lat");
  const lonParam = url.searchParams.get("lon");
  const radiusParam = url.searchParams.get("radius");
  let lat: number;
  let lon: number;
  let radius: number;

  if (latParam && lonParam) {
    const parsed = zQuery.safeParse({ lat: latParam, lon: lonParam, radius: radiusParam ?? undefined });
    if (!parsed.success) {
      return NextResponse.json({ error: { code: "BAD_REQUEST", message: parsed.error.message } }, { status: 400 });
    }
    lat = parsed.data.lat;
    lon = parsed.data.lon;
    radius = parsed.data.radius;
  } else if (q) {
    try {
      const resolved = await resolveLocation(q, { origin: req.nextUrl.origin, redis });
      lat = resolved.lat;
      lon = resolved.lon;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to resolve location.";
      return NextResponse.json({ error: { code: "BAD_LOCATION_QUERY", message } }, { status: 400 });
    }
    radius = normalizeRadius(radiusParam);
  } else {
    return NextResponse.json({ error: { code: "BAD_REQUEST", message: "Provide either lat/lon or q." } }, { status: 400 });
  }

  const cacheKey = `hud:hc:${hashKey({ lat: lat.toFixed(5), lon: lon.toFixed(5), radius })}`;
  log.info("request", { lat, lon, radius, q: q || undefined });

  try {
    if (redis) {
      const cached = await redis.get(cacheKey);
      if (cached) {
        log.debug("cache hit", { cacheKey });
        return NextResponse.json(JSON.parse(cached), { headers: { "x-cache": "hit" } });
      }
    }
  } catch (e) {
    log.warn("cache get error", { cacheKey, error: e instanceof Error ? e.message : String(e) });
  }

  try {
    const arcgisItems = await fetchArcgisCounselors({ lat, lon, radiusMiles: radius, maxResults: 100 });
    if (arcgisItems.length > 0) {
      const response = {
        items: arcgisItems,
        source: "HUD Housing Counselors (ArcGIS)",
        lastUpdated: new Date().toISOString(),
      };
      try {
        if (redis) {
          await redis.set(cacheKey, JSON.stringify(response), "EX", 1800);
        }
      } catch (e) {
        log.warn("cache set error", { cacheKey, error: e instanceof Error ? e.message : String(e) });
      }
      return NextResponse.json(response, { headers: { "x-cache": "miss", "x-data-source": "arcgis" } });
    }
  } catch (error) {
    log.warn("arcgis counselor fetch failed", { error: error instanceof Error ? error.message : String(error) });
  }

  if (!useHudApi) {
    return NextResponse.json(
      {
        items: [],
        source: "HUD Housing Counselors (ArcGIS)",
        lastUpdated: new Date().toISOString(),
      },
      { headers: { "x-data-source": "arcgis" } }
    );
  }

  try {
    const endpoint = buildHudCounselorsUrl(lat, lon, radius);
    const json = await fetchWithRetry(endpoint, { timeoutMs: 10000 }, 3);
    const items = transformHudToCounselors(json);
    const response = {
      items,
      source: "HUD Housing Counselor API",
      lastUpdated: new Date().toISOString(),
    };
    try {
      if (redis) {
        await redis.set(cacheKey, JSON.stringify(response), "EX", 3600);
        log.debug("cache set", { cacheKey });
      }
    } catch (e) {
      log.warn("cache set error", { cacheKey, error: e instanceof Error ? e.message : String(e) });
    }
    return NextResponse.json(response, { headers: { "x-cache": "miss" } });
  } catch (err) {
    if (err instanceof Error && err.message === "HTTP 404") {
      log.info("upstream 404, returning empty counselors", { lat, lon, radius, q: q || undefined });
      const response = {
        items: [],
        source: "HUD Housing Counselor API",
        lastUpdated: new Date().toISOString(),
      };
      return NextResponse.json(response, { headers: { "x-cache": "miss" } });
    }
    log.error("upstream error", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: { code: "UPSTREAM_UNAVAILABLE", upstream: "HUD" } }, { status: 503 });
  }
}
