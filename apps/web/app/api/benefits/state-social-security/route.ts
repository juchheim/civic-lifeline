import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import type { BenefitStateSocialSecurityStats } from "@cl/types";
import { zBenefitStateSocialSecurityResponse } from "@cl/types";
import { createLogger } from "@/lib/logger";

const log = createLogger("api/benefits/state-social-security");

const SSA_ENDPOINT =
  "https://services6.arcgis.com/zFiipv75rloRP5N4/ArcGIS/rest/services/OASDI_2015/FeatureServer/2/query";
const SSA_FIELDS = [
  "State_Territory",
  "ORDER1_ABB",
  "Total_Population",
  "Total_Population_Receiving_Bene",
  "Population65_Older",
  "Population65_Older_Receiving_Be",
].join(",");

const SSA_SOURCE = "SSA OASDI Beneficiaries by Total Population, 2015 (ArcGIS)";
const SSA_LAST_UPDATED = "2020-04-23T00:00:00.000Z";
const SSA_YEAR = 2015;

const zQuery = z.object({
  stateCode: z
    .string()
    .regex(/^[A-Za-z]{2}$/, { message: "Missing or invalid state code." })
    .transform((value) => value.toUpperCase()),
});

interface ArcgisFeature {
  attributes?: Record<string, unknown>;
}

async function fetchArcgisAttributes(stateCode: string): Promise<Record<string, unknown> | null> {
  const params = new URLSearchParams({
    f: "json",
    where: `ORDER1_ABB='${stateCode}'`,
    outFields: SSA_FIELDS,
    returnGeometry: "false",
    cacheHint: "true",
  });
  const url = `${SSA_ENDPOINT}?${params.toString()}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch(url, { headers: { accept: "application/json" }, signal: controller.signal });
    if (!res.ok) {
      throw new Error(`ArcGIS HTTP ${res.status}`);
    }
    const json = (await res.json()) as { features?: ArcgisFeature[]; error?: { message?: string } };
    if (json.error) {
      throw new Error(json.error.message || "ArcGIS error");
    }
    const features = Array.isArray(json.features) ? json.features : [];
    if (features.length === 0) {
      return null;
    }
    return features[0]?.attributes ?? null;
  } finally {
    clearTimeout(timeout);
  }
}

function toThousandValue(value: unknown): number | null {
  const num = Number(value);
  if (!Number.isFinite(num)) return null;
  return Math.round(num * 1000);
}

function toRawNumber(value: unknown): number | null {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function mapAttributesToStats(stateCode: string, attributes: Record<string, unknown>): BenefitStateSocialSecurityStats {
  const stateName = String(attributes.State_Territory ?? stateCode);
  const totalPopulationRaw = toRawNumber(attributes.Total_Population);
  const percentReceivingBenefits = toRawNumber(attributes.Total_Population_Receiving_Bene);
  const total65Raw = toRawNumber(attributes.Population65_Older);
  const percent65ReceivingBenefits = toRawNumber(attributes.Population65_Older_Receiving_Be);

  // Note: The ArcGIS data provides percentages for "_Receiving_Bene" fields, not raw counts
  // Convert percentages to decimals (divide by 100)
  const shareReceivingBenefits = percentReceivingBenefits === null ? null : percentReceivingBenefits / 100;
  const share65PlusReceivingBenefits = percent65ReceivingBenefits === null ? null : percent65ReceivingBenefits / 100;

  // Convert population from thousands to actual count
  const totalPopulation = totalPopulationRaw === null ? null : toThousandValue(totalPopulationRaw);
  const total65Plus = total65Raw === null ? null : toThousandValue(total65Raw);

  // Calculate actual counts from population * percentage
  const totalReceivingBenefits =
    totalPopulation !== null && shareReceivingBenefits !== null ? Math.round(totalPopulation * shareReceivingBenefits) : null;
  const total65PlusReceivingBenefits =
    total65Plus !== null && share65PlusReceivingBenefits !== null ? Math.round(total65Plus * share65PlusReceivingBenefits) : null;

  return {
    stateCode,
    stateName,
    totalPopulation,
    totalReceivingBenefits,
    shareReceivingBenefits,
    total65Plus,
    total65PlusReceivingBenefits,
    share65PlusReceivingBenefits,
    year: SSA_YEAR,
  };
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const parsed = zQuery.safeParse(Object.fromEntries(url.searchParams.entries()));
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "INVALID_STATE", message: "Missing or invalid state code." } },
      { status: 400 },
    );
  }

  const { stateCode } = parsed.data;
  log.info("state stats request", { stateCode });

  try {
    const attributes = await fetchArcgisAttributes(stateCode);
    if (!attributes) {
      return NextResponse.json(
        { error: { code: "STATE_NOT_FOUND", message: "No Social Security data found for this state." } },
        { status: 404 },
      );
    }

    const stats = mapAttributesToStats(stateCode, attributes);
    const response = zBenefitStateSocialSecurityResponse.parse({
      stats,
      source: SSA_SOURCE,
      lastUpdated: SSA_LAST_UPDATED,
      dataVintage: String(SSA_YEAR),
    });

    return NextResponse.json(response, {
      headers: {
        "Cache-Control": "public, max-age=0, s-maxage=3600",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const isAbort = error instanceof Error && error.name === "AbortError";
    log.error("ssa lookup failed", { stateCode, error: message });
    const status = isAbort ? 504 : 502;
    return NextResponse.json(
      { error: { code: "UPSTREAM_ERROR", message: "Unable to load Social Security stats right now." } },
      { status },
    );
  }
}
