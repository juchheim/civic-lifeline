import { NextRequest, NextResponse } from "next/server";
import { createLogger } from "@/lib/logger";
import { fetchCountyFIPS, getPublicWaterSystemsByCounty, resolveUtilitiesArea, UtilitiesDataError } from "@/server/services/utilities";
import { getRedis } from "../../../housing/_shared/redis";
import { CACHE_TTL_SECONDS, formatAreaLabel, mapUtilitiesError, parseAreaParams } from "../../_shared";

const log = createLogger("api/utilities/providers/water");
const SOURCE = "EPA SDWIS / Envirofacts";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  let normalizedState = "";
  let area;
  try {
    const parsed = parseAreaParams(url);
    area = parsed.area;
    normalizedState = parsed.normalized.state;
  } catch (error) {
    const mapped = mapUtilitiesError(error);
    return NextResponse.json(mapped.body, { status: mapped.status });
  }

  try {
    const { stateFips, countyFips } = await fetchCountyFIPS(area);
    const cacheKey = `utilities:providers:water:${countyFips}`;

    const redis = getRedis();
    if (redis) {
      try {
        const cached = await redis.get(cacheKey);
        if (cached) {
          log.debug("cache hit", { cacheKey });
          return NextResponse.json(JSON.parse(cached), { headers: { "x-cache": "hit" } });
        }
      } catch (error) {
        log.warn("cache get failed", { cacheKey, error: error instanceof Error ? error.message : String(error) });
      }
    }

    const [{ summary: areaSummary }, { summary: coverageArea }] = await Promise.all([
      resolveUtilitiesArea(area),
      resolveUtilitiesArea({ state: normalizedState, county: countyFips }),
    ]);
    const systems = await getPublicWaterSystemsByCounty(countyFips);
    systems.sort((a, b) => (b.populationServed ?? 0) - (a.populationServed ?? 0));

    const response = {
      area: { ...areaSummary, label: formatAreaLabel(areaSummary) },
      coverage: {
        countyFips,
        stateFips,
        countyName: coverageArea.countyName,
        stateCode: coverageArea.stateCode,
      },
      items: systems,
      source: SOURCE,
      lastUpdated: new Date().toISOString(),
      notes: "County-level coverage for public water systems from SDWIS county summary.",
    };

    if (redis) {
      try {
        await redis.set(cacheKey, JSON.stringify(response), "EX", CACHE_TTL_SECONDS);
      } catch (error) {
        log.warn("cache set failed", { cacheKey, error: error instanceof Error ? error.message : String(error) });
      }
    }

    return NextResponse.json(response, { headers: { "x-cache": "miss" } });
  } catch (error) {
    if (error instanceof UtilitiesDataError) {
      const mapped = mapUtilitiesError(error);
      return NextResponse.json(mapped.body, { status: mapped.status });
    }
    log.error("unhandled error", { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: { code: "SERVER_ERROR", message: "Water provider lookup failed." } }, { status: 500 });
  }
}
