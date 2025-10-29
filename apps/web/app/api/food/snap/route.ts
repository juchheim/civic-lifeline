import { NextRequest, NextResponse } from "next/server";
import Redis from "ioredis";
import { zSnapItem } from "@cl/types";
import { zQuery, normalizeBbox, buildArcgisUrl, transformArcgisToSnapItems, hashKey } from "./lib";
import { createLogger } from "@/lib/logger";

const log = createLogger("api/food/snap");

function getRedis(): Redis | null {
  const url = process.env.REDIS_URL;
  if (!url) return null;
  // Reuse a global to avoid creating multiple connections in dev
  const g = global as any;
  if (!g.__cl_redis) g.__cl_redis = new Redis(url, { maxRetriesPerRequest: 2 });
  return g.__cl_redis as Redis;
}

async function fetchWithRetry(url: string, opts: { timeoutMs: number }, maxRetries = 4): Promise<any> {
  let delay = 200;
  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), opts.timeoutMs);
    try {
      const res = await fetch(url, { signal: controller.signal, headers: { accept: "application/json" }, cache: "no-store" });
      clearTimeout(t);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (json && json.error) throw new Error("ArcGIS error body");
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
  // Validate query
  const url = new URL(req.url);
  const parse = zQuery.safeParse(Object.fromEntries(url.searchParams.entries()));
  if (!parse.success) {
    return NextResponse.json({ error: { code: "BAD_REQUEST", message: parse.error.message } }, { status: 400 });
  }
  const { bbox: bboxStr, types, limit, debug } = parse.data;
  const bbox = normalizeBbox(bboxStr);
  const shouldUseCache = !debug;
  const cacheKey = shouldUseCache ? `snap:${hashKey({ bbox: bbox.join(","), types, limit })}` : null;
  log.info("request", { bbox: bbox.join(","), types, limit, debug });

  // Cache lookup
  if (shouldUseCache && cacheKey) {
    try {
      const redis = getRedis();
      if (redis) {
        const cached = await redis.get(cacheKey);
        if (cached) {
          const data = JSON.parse(cached);
          log.debug("cache hit", { key: cacheKey });
          return NextResponse.json(data, { headers: { "x-cache": "hit" } });
        }
      }
    } catch (e) {
      log.warn("cache get error", { key: cacheKey, error: e instanceof Error ? e.message : String(e) });
    }
  }

  // Upstream fetch
  let arcgisUrl: string | undefined;
  try {
    arcgisUrl = buildArcgisUrl(bbox, limit);
    const configuredTimeout = Number(process.env.USDA_SNAP_TIMEOUT_MS);
    const timeoutMs = Number.isFinite(configuredTimeout) && configuredTimeout > 0 ? configuredTimeout : 45000;
    const json = await fetchWithRetry(arcgisUrl, { timeoutMs }, 4);
    const items = transformArcgisToSnapItems(json);

    // Optional filter by types (comma-separated, case-insensitive contains)
    let filtered = items;
    if (types) {
      const want = new Set(types.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean));
      filtered = items.filter((it) => (it.storeType ? want.has(it.storeType.toLowerCase()) : false));
    }

    // Enforce limit
    const limited = filtered.slice(0, limit);

    const response = {
      items: limited.map((it) => zSnapItem.parse(it)),
      source: "USDA ArcGIS",
      lastUpdated: new Date().toISOString(),
    };
    if (debug === "raw") {
      return NextResponse.json({ upstream: json, response, arcgisUrl });
    }
    if (debug === "url") {
      return NextResponse.json({ arcgisUrl });
    }

    // Cache store 10-30 minutes
    if (shouldUseCache && cacheKey) {
      try {
        const redis = getRedis();
        if (redis) {
          const ttl = 600 + Math.floor(Math.random() * 1200);
          await redis.set(cacheKey, JSON.stringify(response), "EX", ttl);
          log.debug("cache set", { key: cacheKey, ttl });
        }
      } catch (e) {
        log.warn("cache set error", { key: cacheKey, error: e instanceof Error ? e.message : String(e) });
      }
    }

    log.info("success", { count: limited.length });
    return NextResponse.json(response, { headers: { "x-cache": "miss" } });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log.error("upstream error", { error: message, arcgisUrl });
    const payload: any = { error: { code: "UPSTREAM_UNAVAILABLE", upstream: "USDA" } };
    if (debug) {
      payload.error.message = message;
      if (arcgisUrl) payload.error.arcgisUrl = arcgisUrl;
    }
    return NextResponse.json(payload, { status: 503 });
  }
}
