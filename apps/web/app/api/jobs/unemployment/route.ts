import { NextRequest, NextResponse } from "next/server";
import Redis from "ioredis";
import { z } from "zod";
import { zSourceMeta } from "@cl/types";
import { createLogger } from "@/lib/logger";
import { zQuery, toSeriesId, normalizeBlsTimeseries } from "./lib";

const log = createLogger("api/jobs/unemployment");

function getRedis(): Redis | null {
  const url = process.env.REDIS_URL;
  if (!url) return null;
  const g = global as any;
  if (!g.__cl_redis) g.__cl_redis = new Redis(url, { maxRetriesPerRequest: 2 });
  return g.__cl_redis as Redis;
}

async function fetchWithRetry(url: string, body: any, opts: { timeoutMs: number }, maxRetries = 3): Promise<any> {
  let attempt = 0;
  let delay = 200;
  while (true) {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), opts.timeoutMs);
    try {
      const res = await fetch(url, {
        method: "POST",
        signal: controller.signal,
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify(body),
        cache: "no-store",
      });
      clearTimeout(t);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (json && json.status && json.status !== "REQUEST_SUCCEEDED") throw new Error("BLS error body");
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
  const raw = Object.fromEntries(url.searchParams.entries());
  const parsed = zQuery.safeParse({ countyFips: raw.countyFips, start: Number(raw.start), end: Number(raw.end) });
  if (!parsed.success) {
    return NextResponse.json({ error: { code: "BAD_REQUEST", message: parsed.error.message } }, { status: 400 });
  }
  const { countyFips, start, end } = parsed.data;
  const seriesId = toSeriesId(countyFips);
  const cacheKey = `laus:${countyFips}:${start}:${end}`;
  log.info("request", { countyFips, start, end, seriesId });

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
    const body: any = { seriesid: [seriesId], startyear: String(start), endyear: String(end) };
    const key = process.env.BLS_API_KEY;
    if (key) body.registrationkey = key;
    const json = await fetchWithRetry("https://api.bls.gov/publicAPI/v2/timeseries/data/", body, { timeoutMs: 10000 }, 3);
    const normalized = normalizeBlsTimeseries(json, seriesId);

    const response = {
      ...normalized,
      source: "BLS LAUS",
      lastUpdated: new Date().toISOString(),
    };
    // validate meta shape lightly
    zSourceMeta.parse({ source: response.source, lastUpdated: response.lastUpdated });

    try {
      const redis = getRedis();
      if (redis) {
        await redis.set(cacheKey, JSON.stringify(response), "EX", 86400);
        log.debug("cache set", { cacheKey });
      }
    } catch {}

    return NextResponse.json(response, { headers: { "x-cache": "miss" } });
  } catch (err) {
    log.error("upstream error", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: { code: "UPSTREAM_UNAVAILABLE", upstream: "BLS" } }, { status: 503 });
  }
}
