import { NextRequest, NextResponse } from "next/server";
import { CensusApiError, censusErrorResponse, fetchCensusDataset, invalidParamResponse } from "../_shared/census";

export const runtime = "nodejs";

const DATASET_PATH = "timeseries/healthins/sahie";
const SELECT_FIELDS = "NAME,NUI_PT,PCTUI_PT";
type Scope = "county" | "state" | "national";
type CensusRow = [string | null, string | null, string | null];

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const stateFips = url.searchParams.get("stateFips")?.trim();
  const countyFips = url.searchParams.get("countyFips")?.trim() ?? null;
  const time = url.searchParams.get("time")?.trim() ?? "2022";

  if (!stateFips || !/^\d{2}$/.test(stateFips)) {
    return invalidParamResponse("stateFips parameter required (2 digits)");
  }
  if (countyFips) {
    if (!/^\d{5}$/.test(countyFips)) {
      return invalidParamResponse("countyFips parameter required (5 digits)");
    }
    if (countyFips.slice(0, 2) !== stateFips) {
      return invalidParamResponse("countyFips must belong to the same stateFips");
    }
  }

  try {
    const [countyRow, stateRow, nationalRow] = await Promise.all([
      countyFips ? fetchCountyRow(stateFips, countyFips, time) : Promise.resolve(null),
      fetchStateRow(stateFips, time),
      fetchNationalRow(time),
    ]);

    const county = toAreaStats(countyRow, "county", countyFips);
    const state = toAreaStats(stateRow, "state", stateFips);
    const national = toAreaStats(nationalRow, "national", "us");

    return NextResponse.json(
      {
        countyName: county?.name,
        uninsuredEstimate: county?.estimate ?? null,
        uninsuredPercent: county?.percent ?? null,
        county,
        state,
        national,
        source: {
          dataset: "SAHIE",
          time,
          retrievedAt: new Date().toISOString(),
        },
      },
      {
        headers: {
          "Cache-Control": "public, max-age=0, s-maxage=21600",
        },
      },
    );
  } catch (error) {
    if (error instanceof CensusApiError) {
      return censusErrorResponse(error, "uninsured");
    }
    console.error("[Census:uninsured] Unexpected error", error);
    return NextResponse.json({ error: "Unable to load SAHIE data." }, { status: 500 });
  }
}

async function fetchCountyRow(stateFips: string, countyFips: string, time: string): Promise<CensusRow | null> {
  const countyCode = countyFips.slice(-3);
  const json = await fetchCensusDataset(DATASET_PATH, {
    get: SELECT_FIELDS,
    for: `county:${countyCode}`,
    in: `state:${stateFips}`,
    time,
  });
  return (json[1] as CensusRow) ?? null;
}

async function fetchStateRow(stateFips: string, time: string): Promise<CensusRow | null> {
  const json = await fetchCensusDataset(DATASET_PATH, {
    get: SELECT_FIELDS,
    for: `state:${stateFips}`,
    time,
  });
  return (json[1] as CensusRow) ?? null;
}

async function fetchNationalRow(time: string): Promise<CensusRow | null> {
  const json = await fetchCensusDataset(DATASET_PATH, {
    get: SELECT_FIELDS,
    for: "us:1",
    time,
  });
  return (json[1] as CensusRow) ?? null;
}

function toAreaStats(row: CensusRow | null, scope: Scope, fips?: string | null) {
  if (!row) return null;
  const [name, estimate, percent] = row;
  return {
    name: name ?? getScopeLabel(scope),
    estimate: estimate ?? null,
    percent: percent ?? null,
    fips: fips ?? null,
    scope,
  };
}

function getScopeLabel(scope: Scope) {
  if (scope === "national") return "United States";
  if (scope === "state") return "State";
  return "County";
}
