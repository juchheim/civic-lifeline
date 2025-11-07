import { NextRequest, NextResponse } from "next/server";
import { createLogger } from "@/lib/logger";
import {
  getElectricityCosts,
  getGasCosts,
  getWaterSewerAnnualCosts,
  resolveUtilitiesArea,
  type Area,
  type CostDistribution,
  UtilitiesDataError,
} from "@/server/services/utilities";
import { getRedis } from "../../housing/_shared/redis";
import { ACS_SOURCE, ACS_VINTAGE, CACHE_TTL_SECONDS, buildCacheKey, formatAreaLabel, mapUtilitiesError, parseAreaParams } from "../_shared";

const log = createLogger("api/utilities/costs");

const ASSUMPTIONS = {
  topBucketMidpoints: { electricGas: 225, waterSewerAnnual: 900 },
  notes: [
    "For $200+ electricity and gas buckets we assume a $225 midpoint to estimate the weighted median.",
    "Water and sewer costs are collected annually by ACS. We divide the annual midpoint by 12 to show a monthly estimate.",
  ],
};

type AreaSummary = Awaited<ReturnType<typeof resolveUtilitiesArea>>["summary"];

interface UtilitiesCostsResponse {
  area: AreaSummary & { label: string };
  electric: CostDistribution;
  gas: CostDistribution;
  waterSewer: { estTypicalMonthly: number | null; annual: CostDistribution };
  assumptions: typeof ASSUMPTIONS;
  source: string;
  lastUpdated: string;
  dataVintage: string;
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  let area: Area;
  let normalizedKeyInput;
  try {
    const parsed = parseAreaParams(url);
    area = parsed.area;
    normalizedKeyInput = parsed.normalized;
  } catch (error) {
    const mapped = mapUtilitiesError(error);
    return NextResponse.json(mapped.body, { status: mapped.status });
  }

  const redis = getRedis();
  const cacheKey = buildCacheKey("utilities:costs", normalizedKeyInput);
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

  try {
    const { summary: areaSummary, resolved } = await resolveUtilitiesArea(area);
    const [electric, gas, waterAnnual] = await Promise.all([
      getElectricityCosts(area, resolved),
      getGasCosts(area, resolved),
      getWaterSewerAnnualCosts(area, resolved),
    ]);
    const response: UtilitiesCostsResponse = {
      area: { ...areaSummary, label: formatAreaLabel(areaSummary) },
      electric,
      gas,
      waterSewer: { estTypicalMonthly: waterAnnual.estTypicalMonthly, annual: waterAnnual },
      assumptions: ASSUMPTIONS,
      source: ACS_SOURCE,
      lastUpdated: new Date().toISOString(),
      dataVintage: ACS_VINTAGE,
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
    return NextResponse.json({ error: { code: "SERVER_ERROR", message: "We could not load utility costs right now." } }, { status: 500 });
  }
}
