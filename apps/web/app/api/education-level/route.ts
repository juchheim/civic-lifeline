import { NextRequest, NextResponse } from "next/server";

type EducationLevelResponse = {
  name: string;
  totalAdults: number;
  highSchoolDiploma: number;
};

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const stateFips = url.searchParams.get("stateFips");
  const countyFips = url.searchParams.get("countyFips");

  if (!stateFips || !countyFips) {
    return NextResponse.json({ error: "stateFips and countyFips required" }, { status: 400 });
  }

  const countyCode = countyFips.slice(-3);
  const apiUrl = new URL("https://api.census.gov/data/2023/acs/acs5");
  apiUrl.searchParams.set("get", "NAME,B15003_001E,B15003_017E");
  apiUrl.searchParams.set("for", `county:${countyCode}`);
  apiUrl.searchParams.set("in", `state:${stateFips}`);

  try {
    const res = await fetch(apiUrl.toString());
    if (!res.ok) {
      return NextResponse.json(
        { error: "ACS education service unavailable", status: res.status },
        { status: 502 }
      );
    }

    const json = await res.json();
    if (!Array.isArray(json) || json.length < 2) {
      return NextResponse.json({ error: "ACS returned unexpected data" }, { status: 502 });
    }

    const row = json[1] as [string, string | null, string | null, string, string];
    const name = row[0];
    const totalAdults = Number(row[1]);
    const highSchoolDiploma = Number(row[2]);

    if (!Number.isFinite(totalAdults) || !Number.isFinite(highSchoolDiploma) || totalAdults === 0) {
      return NextResponse.json({ error: "ACS education fields missing" }, { status: 502 });
    }

    return NextResponse.json({
      name,
      totalAdults,
      highSchoolDiploma,
    } as EducationLevelResponse);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: "Failed to fetch ACS education", details: message }, { status: 500 });
  }
}
