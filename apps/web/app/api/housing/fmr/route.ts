import { NextRequest, NextResponse } from "next/server";
import { zSourceMeta } from "@cl/types";
import { createLogger } from "@/lib/logger";
import { zQuery, buildHudFmrUrl, transformHudFmr } from "./lib";
import { getRedis } from "../_shared/redis";
import { resolveLocation } from "../_shared/location";
import { lookupCountyFips } from "../_shared/county";
import { lookupStaticFmr } from "./static-data";
import { fetchArcgisFmrByFips } from "./arcgis";

const log = createLogger("api/housing/fmr");

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

function parseCoordinate(label: "lat" | "lon", raw: string | null): number | null {
  if (raw === null) return null;
  const value = Number(raw);
  const bounds = label === "lat" ? { min: -90, max: 90 } : { min: -180, max: 180 };
  if (!Number.isFinite(value) || value < bounds.min || value > bounds.max) {
    throw new Error(`Invalid ${label} value.`);
  }
  return value;
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const redis = getRedis();
  // During shutdowns we serve from static files; flip HUD_FMR_USE_LIVE_API to "true" once tokens are restored (see docs/hud-fmr-static.md).
  const useLiveHudApi = process.env.HUD_FMR_USE_LIVE_API === "true";
  const arcgisYear = Number.parseInt(process.env.HUD_FMR_ARCGIS_YEAR ?? "2024", 10);
  const q = url.searchParams.get("q")?.trim();
  const latParam = url.searchParams.get("lat");
  const lonParam = url.searchParams.get("lon");
  const fipsParam = url.searchParams.get("fips");
  const yearParam = url.searchParams.get("year");

  const yearResult = zQuery.pick({ year: true }).safeParse({ year: Number(yearParam) });
  if (!yearResult.success) {
    return NextResponse.json({ error: { code: "BAD_REQUEST", message: yearResult.error.message } }, { status: 400 });
  }
  const { year } = yearResult.data;

  let fips = fipsParam ?? undefined;
  let resolvedLocation: { name?: string; postalCode?: string } | null = null;
  let latForLog: number | undefined;
  let lonForLog: number | undefined;

  if (!fips) {
    try {
      const lat = parseCoordinate("lat", latParam);
      const lon = parseCoordinate("lon", lonParam);
      if (lat !== null && lon !== null) {
        latForLog = lat;
        lonForLog = lon;
        const county = await lookupCountyFips(lat, lon, { redis });
        fips = county.fips;
        resolvedLocation = {
          name: county.countyName && county.stateCode ? `${county.countyName}, ${county.stateCode}` : undefined,
        };
      } else if (q) {
        const resolved = await resolveLocation(q, { origin: req.nextUrl.origin, redis });
        latForLog = resolved.lat;
        lonForLog = resolved.lon;
        resolvedLocation = { name: resolved.name, postalCode: resolved.postalCode };
        const county = await lookupCountyFips(resolved.lat, resolved.lon, { redis });
        fips = county.fips;
        if (county.countyName && county.stateCode) {
          resolvedLocation.name = `${county.countyName}, ${county.stateCode}`;
        }
      } else {
        return NextResponse.json({ error: { code: "BAD_REQUEST", message: "Provide q, lat/lon, or fips." } }, { status: 400 });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to determine FIPS for that location.";
      return NextResponse.json({ error: { code: "FIPS_LOOKUP_FAILED", message } }, { status: 400 });
    }
  }

  const parsed = zQuery.safeParse({ fips, year });
  if (!parsed.success) {
    return NextResponse.json({ error: { code: "BAD_REQUEST", message: parsed.error.message } }, { status: 400 });
  }
  const { fips: finalFips } = parsed.data;

  const cacheKey = `hud:fmr:${finalFips}:${year}`;
  log.info("request", { fips: finalFips, year, q: q || undefined, lat: latForLog, lon: lonForLog });

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

  let arcgisRecord = null;
  if (year === arcgisYear) {
    try {
      arcgisRecord = await fetchArcgisFmrByFips(finalFips);
    } catch (error) {
      log.warn("arcgis lookup failed", { fips: finalFips, error: error instanceof Error ? error.message : String(error) });
    }
  }

  if (arcgisRecord) {
    log.info("serving fmr from arcgis dataset", { fips: finalFips, year });
    const response = {
      year,
      fips: finalFips,
      areaName: arcgisRecord.areaName,
      br0: arcgisRecord.br0,
      br1: arcgisRecord.br1,
      br2: arcgisRecord.br2,
      br3: arcgisRecord.br3,
      br4: arcgisRecord.br4,
      source: `HUD FMR ArcGIS (FY${arcgisYear})`,
      lastUpdated: new Date().toISOString(),
      dataVintage: String(arcgisYear),
      resolvedLocation: resolvedLocation ?? null,
    };
    try {
      if (redis) {
        await redis.set(cacheKey, JSON.stringify(response), "EX", 86400);
      }
    } catch (e) {
      log.warn("cache set error", { cacheKey, error: e instanceof Error ? e.message : String(e) });
    }
    return NextResponse.json(response, { headers: { "x-cache": "miss", "x-data-source": "arcgis" } });
  }

  const staticRecord = await lookupStaticFmr(finalFips, year);
  if (staticRecord) {
    log.info("serving fmr from static dataset", { fips: finalFips, year });
    const response = {
      year: staticRecord.year,
      fips: finalFips,
      areaName: staticRecord.areaName,
      br0: staticRecord.br0,
      br1: staticRecord.br1,
      br2: staticRecord.br2,
      br3: staticRecord.br3,
      br4: staticRecord.br4,
      source: `HUD FMR (static file ${staticRecord.year})`,
      lastUpdated: new Date().toISOString(),
      dataVintage: String(staticRecord.year),
      resolvedLocation: resolvedLocation ?? null,
    };
    try {
      if (redis) {
        await redis.set(cacheKey, JSON.stringify(response), "EX", 86400);
      }
    } catch (e) {
      log.warn("cache set error", { cacheKey, error: e instanceof Error ? e.message : String(e) });
    }
    return NextResponse.json(response, { headers: { "x-cache": "miss", "x-data-source": "static" } });
  }

  if (year !== arcgisYear && !useLiveHudApi) {
    return NextResponse.json(
      {
        error: {
          code: "HUD_FMR_YEAR_UNAVAILABLE",
          message: `ArcGIS dataset only contains FY${arcgisYear} Fair Market Rents. Switch the year or re-enable the live HUD API when tokens are available (see docs/hud-fmr-static.md).`,
        },
      },
      { status: 404 }
    );
  }

  if (!useLiveHudApi) {
    log.info("live hud api disabled", { fips: finalFips, year });
    return NextResponse.json(
      {
        error: {
          code: "HUD_FMR_STATIC_ONLY",
          message:
            "Static FMR dataset does not contain that county/year. Download the latest HUD file and update HUD_FMR_STATIC_PATH (see docs/hud-fmr-static.md).",
        },
      },
      { status: 404 }
    );
  }

  try {
    const endpoint = buildHudFmrUrl(finalFips, year);
    const json = await fetchWithRetry(endpoint, { timeoutMs: 10000 }, 3);
    const fmr = transformHudFmr(json);

    const response = {
      year,
      fips: finalFips,
      areaName: fmr.areaName,
      br0: fmr.br0,
      br1: fmr.br1,
      br2: fmr.br2,
      br3: fmr.br3,
      br4: fmr.br4,
      source: "HUD FMR API",
      lastUpdated: new Date().toISOString(),
      dataVintage: String(year),
      resolvedLocation: resolvedLocation ?? null,
    };
    zSourceMeta.parse({ source: response.source, lastUpdated: response.lastUpdated, dataVintage: response.dataVintage });

    try {
      if (redis) {
        await redis.set(cacheKey, JSON.stringify(response), "EX", 86400);
        log.debug("cache set", { cacheKey });
      }
    } catch (e) {
      log.warn("cache set error", { cacheKey, error: e instanceof Error ? e.message : String(e) });
    }

    return NextResponse.json(response, { headers: { "x-cache": "miss" } });
  } catch (err) {
    if (err instanceof Error && err.message === "HTTP 404") {
      log.info("fmr not found", { fips: finalFips, year });
      return NextResponse.json(
        {
          error: {
            code: "HUD_FMR_NOT_FOUND",
            message:
              "HUD did not return Fair Market Rent data for that county and year. Confirm the combination, HUD_TOKEN configuration, or fall back to the static dataset (docs/hud-fmr-static.md).",
          },
        },
        { status: 404 }
      );
    }
    log.error("upstream error", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: { code: "UPSTREAM_UNAVAILABLE", upstream: "HUD" } }, { status: 503 });
  }
}
