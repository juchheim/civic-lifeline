import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getFccBroadbandCollection } from "@cl/db";

const zQuery = z.object({
  geo: z.enum(["county", "tract"]).default("county"),
  fips: z.string().regex(/^\d{5,11}$/),
});

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const parsed = zQuery.safeParse(Object.fromEntries(url.searchParams.entries()));
  if (!parsed.success) return NextResponse.json({ error: { code: "BAD_REQUEST", message: parsed.error.message } }, { status: 400 });
  const { geo, fips } = parsed.data;
  // Only county implemented currently
  if (geo !== "county") return NextResponse.json({ error: { code: "UNSUPPORTED_GEO" } }, { status: 400 });

  try {
    const col = await getFccBroadbandCollection();
    const doc = await col.find({ fips }).sort({ asOf: -1 }).limit(1).next();
    if (!doc) return NextResponse.json({ error: { code: "NOT_FOUND" } }, { status: 404 });
    const { providerCount, speed, tech, asOf, source, fetchedAt } = doc as any;
    return NextResponse.json({ providerCount, speed, tech, asOf, source, lastUpdated: fetchedAt, dataVintage: asOf.slice(0, 7) });
  } catch (err) {
    return NextResponse.json({ error: { code: "SERVER_ERROR" } }, { status: 500 });
  }
}
