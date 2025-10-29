import { NextRequest, NextResponse } from "next/server";
import Redis from "ioredis";
import { createLogger } from "@/lib/logger";
import { zQuery, buildHudCounselorsUrl, transformHudToCounselors, hashKey } from "./lib";

const log = createLogger("api/housing/counselors");

function getRedis(): Redis | null {
  const url = process.env.REDIS_URL;
  if (!url) return null;
  const g = global as any;
  if (!g.__cl_redis) g.__cl_redis = new Redis(url, { maxRetriesPerRequest: 2 });
  return g.__cl_redis as Redis;
}

async function fetchWithRetry(url: string, opts: { timeoutMs: number }, maxRetries = 3): Promise<any> {
  let attempt = 0;
  let delay = 200;
  while (true) {
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
      if (attempt >= maxRetries) throw err;
      await new Promise((r) => setTimeout(r, delay));
      attempt += 1;
      delay = Math.min(2000, delay * 2);
    }
  }
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const parsed = zQuery.safeParse(Object.fromEntries(url.searchParams.entries()));
  if (!parsed.success) {
    return NextResponse.json({ error: { code: "BAD_REQUEST", message: parsed.error.message } }, { status: 400 });
  }
  const { lat, lon, radius } = parsed.data;
  const cacheKey = `hud:hc:${hashKey({ lat, lon, radius })}`;
  log.info("request", { lat, lon, radius });

  try {
    const redis = getRedis();
    if (redis) {
      const cached = await redis.get(cacheKey);
      if (cached) {
        log.debug("cache hit", { cacheKey });
        return NextResponse.json(JSON.parse(cached), { headers: { "x-cache": "hit" } });
      }
    }
  } catch {}

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
      const redis = getRedis();
      if (redis) {
        await redis.set(cacheKey, JSON.stringify(response), "EX", 3600);
        log.debug("cache set", { cacheKey });
      }
    } catch {}
    return NextResponse.json(response, { headers: { "x-cache": "miss" } });
  } catch (err) {
    log.error("upstream error", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: { code: "UPSTREAM_UNAVAILABLE", upstream: "HUD" } }, { status: 503 });
  }
}
