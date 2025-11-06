import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getFccBroadbandCollection } from "@cl/db";
import { lookupCountyFips } from "../../housing/_shared/county";
import { resolveLocation } from "../../housing/_shared/location";
import { getRedis } from "../../housing/_shared/redis";

const zQuery = z.object({
  geo: z.enum(["county", "tract"]).default("county"),
  fips: z
    .string()
    .regex(/^\d{5,11}$/)
    .optional(),
  q: z
    .string()
    .trim()
    .min(1, { message: "Location query cannot be empty." })
    .optional(),
});

function parseCoordinate(kind: "lat" | "lon", raw: string | null): number | null {
  if (raw == null) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const value = Number(trimmed);
  if (!Number.isFinite(value)) {
    throw new Error(`${kind === "lat" ? "Latitude" : "Longitude"} must be a valid number.`);
  }
  if (kind === "lat" && (value < -90 || value > 90)) {
    throw new Error("Latitude must be between -90 and 90.");
  }
  if (kind === "lon" && (value < -180 || value > 180)) {
    throw new Error("Longitude must be between -180 and 180.");
  }
  return value;
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const parsed = zQuery.safeParse(Object.fromEntries(url.searchParams.entries()));
  if (!parsed.success) return NextResponse.json({ error: { code: "BAD_REQUEST", message: parsed.error.message } }, { status: 400 });
  const { geo, fips: initialFips, q } = parsed.data;
  // Only county implemented currently
  if (geo !== "county") return NextResponse.json({ error: { code: "UNSUPPORTED_GEO" } }, { status: 400 });

  let coordinateParseError: Error | null = null;
  let lat: number | null = null;
  let lon: number | null = null;
  try {
    lat = parseCoordinate("lat", url.searchParams.get("lat"));
    lon = parseCoordinate("lon", url.searchParams.get("lon"));
  } catch (error) {
    coordinateParseError = error instanceof Error ? error : new Error("Invalid coordinates.");
  }
  if (coordinateParseError) {
    return NextResponse.json({ error: { code: "BAD_REQUEST", message: coordinateParseError.message } }, { status: 400 });
  }

  const redis = getRedis();
  let fips = initialFips ?? null;
  let resolvedLocation: { name?: string; postalCode?: string } | null = null;

  if (!fips) {
    try {
      if (lat !== null && lon !== null) {
        const county = await lookupCountyFips(lat, lon, { redis });
        fips = county.fips;
        if (county.countyName && county.stateCode) {
          resolvedLocation = { name: `${county.countyName}, ${county.stateCode}` };
        }
      } else if (q) {
        const resolved = await resolveLocation(q, { origin: req.nextUrl.origin, redis });
        resolvedLocation = { name: resolved.name, postalCode: resolved.postalCode };
        const county = await lookupCountyFips(resolved.lat, resolved.lon, { redis });
        fips = county.fips;
        if (county.countyName && county.stateCode) {
          resolvedLocation.name = `${county.countyName}, ${county.stateCode}`;
        }
      } else {
        return NextResponse.json(
          { error: { code: "BAD_REQUEST", message: "Provide q, lat/lon, or fips." } },
          { status: 400 },
        );
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to determine FIPS for that location.";
      return NextResponse.json({ error: { code: "FIPS_LOOKUP_FAILED", message } }, { status: 400 });
    }
  }

  if (!fips) {
    return NextResponse.json({ error: { code: "BAD_REQUEST", message: "FIPS code required." } }, { status: 400 });
  }

  try {
    const col = await getFccBroadbandCollection();
    const doc = await col.find({ fips }).sort({ asOf: -1 }).limit(1).next();
    if (!doc) {
      console.warn("broadband summary not found", { fips, q: q ?? null, lat, lon });
      return NextResponse.json({ error: { code: "NOT_FOUND" } }, { status: 404 });
    }
    const { coverage, totalUnits, technologies, asOf, source, fetchedAt, countyName, stateName } = doc as any;
    const residentialCoverage = coverage?.residential ?? { "25_3": null, "100_20": null, "1000_100": null };
    const residentialTechnologies = Array.isArray(technologies?.residential) ? technologies.residential : [];

    const fallbackResolved =
      resolvedLocation ??
      (countyName && stateName
        ? {
            name: `${countyName}, ${stateName}`,
          }
        : null);

    return NextResponse.json({
      fips,
      asOf,
      coverage: {
        "25_3": residentialCoverage["25_3"] ?? null,
        "100_20": residentialCoverage["100_20"] ?? null,
        "1000_100": residentialCoverage["1000_100"] ?? null,
      },
      totalUnits: totalUnits?.residential ?? undefined,
      technologies: residentialTechnologies,
      source,
      lastUpdated: fetchedAt,
      dataVintage: asOf.slice(0, 7),
      resolvedLocation: fallbackResolved,
    });
  } catch (err) {
    return NextResponse.json({ error: { code: "SERVER_ERROR" } }, { status: 500 });
  }
}
