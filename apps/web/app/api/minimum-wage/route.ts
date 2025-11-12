import { NextRequest, NextResponse } from "next/server";

const DOL_API_URL = "https://apiprod.dol.gov/v4/get/whd/whd_minimumwage/json";
const DOL_API_KEY = process.env.DOL_API_KEY ?? process.env.NEXT_PUBLIC_DOL_API_KEY ?? "";

const normalizeKey = (key: string) => key.toLowerCase().replace(/[^a-z0-9]/gi, "");

const getFieldValue = (record: Record<string, unknown>, target: string) => {
  const normalizedTarget = normalizeKey(target);
  const entry = Object.entries(record).find(([key]) => normalizeKey(key) === normalizedTarget);
  return entry?.[1];
};

type MinimumWageResponse = {
  stateName: string;
  stateWage: number | null;
  federalWage: number;
  effectiveDate: string;
  usesFederal: boolean;
};

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const stateName = url.searchParams.get("stateName");

  if (!stateName) {
    return NextResponse.json({ error: "stateName parameter required" }, { status: 400 });
  }

  if (!DOL_API_KEY) {
    return NextResponse.json(
      { error: "DOL_API_KEY environment variable missing. Please set DOL_API_KEY to query the DOL API." },
      { status: 500 }
    );
  }

  try {
    const apiUrl = new URL(DOL_API_URL);
    apiUrl.searchParams.set("limit", "1000");
    apiUrl.searchParams.set("X-API-KEY", DOL_API_KEY);

    const res = await fetch(apiUrl.toString(), { cache: "no-store" });
    if (!res.ok) {
      return NextResponse.json(
        { error: "Minimum wage service unavailable", status: res.status },
        { status: 502 }
      );
    }

    const json = await res.json();
    const records = Array.isArray(json?.data) ? json.data : json;

    if (!Array.isArray(records)) {
      return NextResponse.json({ error: "Minimum wage data missing" }, { status: 502 });
    }

    const matched = records.find((record) => {
      if (!record || typeof record !== "object") return false;
      const name = getFieldValue(record as Record<string, unknown>, "state");
      if (typeof name !== "string") return false;
      return name.toLowerCase() === stateName.toLowerCase();
    }) as Record<string, unknown> | undefined;

    if (!matched) {
      return NextResponse.json({ error: "Data unavailable for this state" }, { status: 404 });
    }

    const rawStateWage = Number(getFieldValue(matched, "stateminimumwage") ?? getFieldValue(matched, "minimumwage"));
    const rawFederalWage = Number(getFieldValue(matched, "federalminimumwage") ?? getFieldValue(matched, "federal"));
    const effectiveDate =
      (getFieldValue(matched, "effectivedate") ?? getFieldValue(matched, "effective"))?.toString() ?? "N/A";
    const usesFederal = !Number.isFinite(rawStateWage) || rawStateWage === rawFederalWage;

    return NextResponse.json({
      stateName,
      stateWage: Number.isFinite(rawStateWage) ? rawStateWage : null,
      federalWage: Number.isFinite(rawFederalWage) ? rawFederalWage : 0,
      effectiveDate,
      usesFederal,
    } as MinimumWageResponse);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: "Failed to fetch minimum wage", details: message }, { status: 500 });
  }
}
