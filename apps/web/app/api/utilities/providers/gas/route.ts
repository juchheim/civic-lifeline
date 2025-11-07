import { NextRequest, NextResponse } from "next/server";
import { createLogger } from "@/lib/logger";
import { fetchCountyFIPS, getGasLDCByCounty, resolveUtilitiesArea, UtilitiesDataError } from "@/server/services/utilities";
import { getRedis } from "../../../housing/_shared/redis";
import { CACHE_TTL_SECONDS, formatAreaLabel, mapUtilitiesError, parseAreaParams } from "../../_shared";

const log = createLogger("api/utilities/providers/gas");
const SOURCE = "HIFLD Natural Gas Service Territories";

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
    const cacheKey = `utilities:providers:gas:${countyFips}`;
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

    const [
      { summary: areaSummary },
      { summary: coverageArea },
      ldcs,
    ] = await Promise.all([
      resolveUtilitiesArea(area),
      resolveUtilitiesArea({ state: normalizedState, county: countyFips }),
      getGasLDCByCounty(countyFips),
    ]);

    const response = {
      area: { ...areaSummary, label: formatAreaLabel(areaSummary) },
      coverage: {
        countyFips,
        stateFips,
        countyName: coverageArea.countyName,
        stateCode: coverageArea.stateCode,
      },
      items: ldcs,
      source: SOURCE,
      lastUpdated: new Date().toISOString(),
      notes: "County FIPS filter applied to the HIFLD Natural Gas LDC layer.",
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
    return NextResponse.json({ error: { code: "SERVER_ERROR", message: "Gas provider lookup failed." } }, { status: 500 });
  }
}
