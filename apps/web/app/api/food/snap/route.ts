import { NextRequest, NextResponse } from "next/server";
import Redis from "ioredis";
import { z } from "zod";
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
  let attempt = 0;
  let delay = 200;
  while (true) {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), opts.timeoutMs);
    try {
      const res = await fetch(url, { signal: controller.signal, headers: { "accept": "application/json" }, cache: "no-store" });
      clearTimeout(t);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (json && json.error) throw new Error("ArcGIS error body");
      return json;
    } catch (err) {
      clearTimeout(t);
      if (attempt >= maxRetries) throw err;
      await new Promise((r) => setTimeout(r, delay));
      attempt += 1;
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
  const { bbox: bboxStr, types, limit } = parse.data;
  const bbox = normalizeBbox(bboxStr);
  const key = `snap:${hashKey({ bbox: bbox.join(","), types, limit })}`;
  log.info("request", { bbox: bbox.join(","), types, limit });

  // Cache lookup
  try {
    const redis = getRedis();
    if (redis) {
      const cached = await redis.get(key);
      if (cached) {
        const data = JSON.parse(cached);
        log.debug("cache hit", { key });
        return NextResponse.json(data, { headers: { "x-cache": "hit" } });
      }
    }
  } catch {}

  // Upstream fetch
  try {
    const arcgisUrl = buildArcgisUrl(bbox, limit);
    const json = await fetchWithRetry(arcgisUrl, { timeoutMs: 8000 }, 4);
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

    // Cache store 10-30 minutes
    try {
      const redis = getRedis();
      if (redis) {
        const ttl = 600 + Math.floor(Math.random() * 1200);
        await redis.set(key, JSON.stringify(response), "EX", ttl);
        log.debug("cache set", { key, ttl });
      }
    } catch {}

    log.info("success", { count: limited.length });
    return NextResponse.json(response, { headers: { "x-cache": "miss" } });
  } catch (err) {
    log.error("upstream error", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json(
      { error: { code: "UPSTREAM_UNAVAILABLE", upstream: "USDA" } },
      { status: 503 },
    );
  }
}
