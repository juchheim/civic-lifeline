import { NextRequest, NextResponse } from "next/server";

const SNAP_BASE_URL =
  "https://gisportal.ers.usda.gov/server/rest/services/SNAP/SNAP_Participation/MapServer/3/query";

const buildSnapUrl = (countyFips?: string) => {
  const url = new URL(SNAP_BASE_URL);
  const where = countyFips ? `FIPS=${Number(countyFips)}` : "1=1";
  url.searchParams.set("where", where);
  url.searchParams.set("outFields", "FIPS,County,State,PRG_POP10");
  url.searchParams.set("returnGeometry", "false");
  url.searchParams.set("f", "json");
  url.searchParams.set("resultRecordCount", "1");
  return url;
};

type SnapAttributes = {
  County?: string;
  State?: string;
  PRG_POP10?: number;
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const countyFips = searchParams.get("countyFips") ?? undefined;

  try {
    const url = buildSnapUrl(countyFips);
    const res = await fetch(url.toString());
    if (!res.ok) {
      return NextResponse.json({ error: "SNAP participation service unavailable" }, { status: 502 });
    }

    const json = await res.json();
    const attributes = json?.features?.[0]?.attributes as SnapAttributes | undefined;

    if (!attributes || typeof attributes.PRG_POP10 !== "number") {
      return NextResponse.json({ error: "SNAP participation data missing" }, { status: 502 });
    }

    return NextResponse.json({
      countyName: attributes.County ?? "County",
      stateCode: attributes.State ?? null,
      percent: attributes.PRG_POP10,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: "Failed to fetch SNAP participation", details: message }, { status: 500 });
  }
}
