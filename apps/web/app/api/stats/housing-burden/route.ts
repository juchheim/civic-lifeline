import { NextRequest, NextResponse } from "next/server";
import { CensusApiError, censusErrorResponse, fetchCensusDataset, invalidParamResponse } from "../_shared/census";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const stateFips = url.searchParams.get("stateFips")?.trim();
  const countyFips = url.searchParams.get("countyFips")?.trim();
  const dataset = url.searchParams.get("dataset")?.trim() ?? "2023/acs/acs5/profile";

  if (!stateFips || !/^\d{2}$/.test(stateFips)) {
    return invalidParamResponse("stateFips parameter required (2 digits)");
  }
  if (!countyFips || !/^\d{5}$/.test(countyFips)) {
    return invalidParamResponse("countyFips parameter required (5 digits)");
  }

  const countyCode = countyFips.slice(-3);

  try {
    const json = await fetchCensusDataset(dataset, {
      get: "NAME,DP04_0142PE",
      for: `county:${countyCode}`,
      in: `state:${stateFips}`,
    });

    const row = json[1] as [string, string | null];

    return NextResponse.json(
      {
        countyName: row[0] ?? "County",
        percent: row[1] ?? null,
        source: {
          dataset,
          retrievedAt: new Date().toISOString(),
        },
      },
      {
        headers: {
          "Cache-Control": "public, max-age=0, s-maxage=21600",
        },
      }
    );
  } catch (error) {
    if (error instanceof CensusApiError) {
      return censusErrorResponse(error, "housing-burden");
    }
    console.error("[Census:housing-burden] Unexpected error", error);
    return NextResponse.json({ error: "Unable to load ACS housing data." }, { status: 500 });
  }
}

