import { NextRequest, NextResponse } from "next/server";
import { CensusApiError, censusErrorResponse, fetchCensusDataset, invalidParamResponse } from "../_shared/census";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const stateFips = url.searchParams.get("stateFips")?.trim();
  const countyFips = url.searchParams.get("countyFips")?.trim();
  const time = url.searchParams.get("time")?.trim() ?? "2022";

  if (!stateFips || !/^\d{2}$/.test(stateFips)) {
    return invalidParamResponse("stateFips parameter required (2 digits)");
  }
  if (!countyFips || !/^\d{5}$/.test(countyFips)) {
    return invalidParamResponse("countyFips parameter required (5 digits)");
  }

  const countyCode = countyFips.slice(-3);

  try {
    const json = await fetchCensusDataset("timeseries/healthins/sahie", {
      get: "NAME,NUI_PT,PCTUI_PT",
      for: `county:${countyCode}`,
      in: `state:${stateFips}`,
      time,
    });

    const row = json[1] as [string, string | null, string | null];

    return NextResponse.json(
      {
        countyName: row[0] ?? "County",
        uninsuredEstimate: row[1] ?? null,
        uninsuredPercent: row[2] ?? null,
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
      }
    );
  } catch (error) {
    if (error instanceof CensusApiError) {
      return censusErrorResponse(error, "uninsured");
    }
    console.error("[Census:uninsured] Unexpected error", error);
    return NextResponse.json({ error: "Unable to load SAHIE data." }, { status: 500 });
  }
}

