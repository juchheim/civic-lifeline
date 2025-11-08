import { NextRequest, NextResponse } from "next/server";
import { createLogger } from "@/lib/logger";
import { fetchCountyFIPS, getPublicWaterSystemsByCounty, resolveUtilitiesArea, UtilitiesDataError } from "@/server/services/utilities";
import { getRedis } from "../../../housing/_shared/redis";
import { CACHE_TTL_SECONDS, formatAreaLabel, mapUtilitiesError, parseAreaParams } from "../../_shared";

const log = createLogger("api/utilities/providers/water");
const SOURCE = "EPA SDWIS county service (cached)";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  let normalizedState = "";
  let area;
  try {
    const parsed = parseAreaParams(url);
    area = parsed.area;
    normalizedState = parsed.normalized.state;
    log.info("request received", { area });
  } catch (error) {
    const mapped = mapUtilitiesError(error);
    return NextResponse.json(mapped.body, { status: mapped.status });
  }

  try {
    const { stateFips, countyFips } = await fetchCountyFIPS(area);
    log.info("fips resolved", { stateFips, countyFips });
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
    const stateCodeForWater = coverageArea.stateCode ?? areaSummary.stateCode ?? normalizedState;
    const { items: systems, total, scope } = await getPublicWaterSystemsByCounty({
      countyFips,
      stateCode: stateCodeForWater,
      limit: 1000,
    });
    log.info("water systems fetched", { countyFips, count: systems.length, scope });
    const meta = { total, returned: systems.length };

    const response = {
      area: { ...areaSummary, label: formatAreaLabel(areaSummary) },
      coverage: {
        countyFips,
        stateFips,
        countyName: coverageArea.countyName,
        stateCode: coverageArea.stateCode,
      },
      items: systems,
      summary: meta,
      source: SOURCE,
      lastUpdated: new Date().toISOString(),
      notes:
        scope === "state"
          ? "Showing the largest water systems in this state because no county-level SDWIS service area was listed."
          : "Public water systems from EPA's SDWIS county service dataset. Results are capped at the first 1,000 facilities to keep responses manageable.",
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
      log.warn("utilities data error", {
        code: error.code,
        message: error.message,
        details: error.details,
      });
      const mapped = mapUtilitiesError(error);
      return NextResponse.json(mapped.body, { status: mapped.status });
    }
    log.error("unhandled error", { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: { code: "SERVER_ERROR", message: "Water provider lookup failed." } }, { status: 500 });
  }
}
