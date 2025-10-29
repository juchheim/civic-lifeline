import { NextRequest, NextResponse } from "next/server";
import Redis from "ioredis";
import { zSourceMeta } from "@cl/types";
import { createLogger } from "@/lib/logger";
import { zQuery, buildHudFmrUrl, transformHudFmr } from "./lib";

const log = createLogger("api/housing/fmr");

function getRedis(): Redis | null {
  const url = process.env.REDIS_URL;
  if (!url) return null;
  const g = global as any;
  if (!g.__cl_redis) g.__cl_redis = new Redis(url, { maxRetriesPerRequest: 2 });
  return g.__cl_redis as Redis;
}

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
  const parsed = zQuery.safeParse({ fips: url.searchParams.get("fips"), year: Number(url.searchParams.get("year")) });
  if (!parsed.success) {
    return NextResponse.json({ error: { code: "BAD_REQUEST", message: parsed.error.message } }, { status: 400 });
  }
  const { fips, year } = parsed.data;
  const cacheKey = `hud:fmr:${fips}:${year}`;
  log.info("request", { fips, year });

  try {
    const redis = getRedis();
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
    const endpoint = buildHudFmrUrl(fips, year);
    const json = await fetchWithRetry(endpoint, { timeoutMs: 10000 }, 3);
    const fmr = transformHudFmr(json);

    const response = {
      year,
      areaName: fmr.areaName,
      br0: fmr.br0,
      br1: fmr.br1,
      br2: fmr.br2,
      br3: fmr.br3,
      br4: fmr.br4,
      source: "HUD FMR API",
      lastUpdated: new Date().toISOString(),
      dataVintage: String(year),
    };
    // validate meta shape lightly
    zSourceMeta.parse({ source: response.source, lastUpdated: response.lastUpdated, dataVintage: response.dataVintage });

    try {
      const redis = getRedis();
      if (redis) {
        await redis.set(cacheKey, JSON.stringify(response), "EX", 86400);
        log.debug("cache set", { cacheKey });
      }
    } catch (e) {
      log.warn("cache set error", { cacheKey, error: e instanceof Error ? e.message : String(e) });
    }

    return NextResponse.json(response, { headers: { "x-cache": "miss" } });
  } catch (err) {
    log.error("upstream error", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: { code: "UPSTREAM_UNAVAILABLE", upstream: "HUD" } }, { status: 503 });
  }
}
