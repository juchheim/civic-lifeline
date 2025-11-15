import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { zSocialSecurityOfficesResponse, type SocialSecurityFieldOffice } from "@cl/types";
import { createLogger } from "@/lib/logger";
import { getRedis } from "../../housing/_shared/redis";
import { hashKey } from "../../housing/_shared/hash";

const log = createLogger("api/benefits/social-security-offices");

const SSA_FEATURE_SERVER_URL =
  "https://services6.arcgis.com/zFiipv75rloRP5N4/arcgis/rest/services/SSA_Field_Office_Information/FeatureServer/0/query";
const SSA_DATASET_URL = "https://www.ssa.gov/data/FO-RS-Address-Open-Close-Time-App-Devs.html";
const DEFAULT_RADIUS_MILES = Number(process.env.SSA_OFFICE_RADIUS_MILES ?? "50");
const MAX_RECORD_COUNT = 50;
const CACHE_NAMESPACE = "benefits:ssa-offices";
const CACHE_TTL_SECONDS = 86_400; // 24 hours, dataset updates quarterly

const zLocationPayload = z.object({
  latitude: z.number({ required_error: "Latitude is required." }),
  longitude: z.number({ required_error: "Longitude is required." }),
  stateCode: z
    .string({ required_error: "State code is required." })
    .regex(/^[A-Za-z]{2}$/, { message: "State code must be a 2-letter abbreviation." })
    .transform((value) => value.toUpperCase()),
  displayLabel: z.string().optional(),
  countyName: z.string().nullable().optional(),
  countyFips: z.string().nullable().optional(),
  zip: z.string().nullable().optional(),
});

type LocationPayload = z.infer<typeof zLocationPayload>;

interface ArcgisFeature {
  attributes?: Record<string, unknown>;
  geometry?: { x?: number | null; y?: number | null };
}

export async function POST(req: NextRequest) {
  let jsonBody: unknown;
  try {
    jsonBody = await req.json();
  } catch {
    return NextResponse.json({ error: { code: "BAD_REQUEST", message: "Invalid JSON body." } }, { status: 400 });
  }

  const parsed = zLocationPayload.safeParse(jsonBody);
  if (!parsed.success) {
    const message = parsed.error.errors[0]?.message ?? "Invalid location payload.";
    return NextResponse.json({ error: { code: "BAD_LOCATION", message } }, { status: 400 });
  }

  const location = parsed.data;
  const radiusMiles = Number.isFinite(DEFAULT_RADIUS_MILES) && DEFAULT_RADIUS_MILES > 0 ? DEFAULT_RADIUS_MILES : 50;
  const redis = getRedis();
  const cacheKey = `${CACHE_NAMESPACE}:${hashKey({
    lat: location.latitude.toFixed(3),
    lon: location.longitude.toFixed(3),
    radius: radiusMiles,
  })}`;

  if (redis) {
    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        return NextResponse.json(JSON.parse(cached), { headers: { "x-cache": "hit" } });
      }
    } catch (error) {
      log.warn("redis get failed", { error: error instanceof Error ? error.message : String(error) });
    }
  }

  try {
    const offices = await fetchSsaFieldOffices(location, radiusMiles);
    const responsePayload = buildResponse(offices, radiusMiles);

    if (redis) {
      try {
        const ttl = CACHE_TTL_SECONDS + Math.floor(Math.random() * 1800); // add jitter up to 30 minutes
        await redis.set(cacheKey, JSON.stringify(responsePayload), "EX", ttl);
      } catch (error) {
        log.warn("redis set failed", { error: error instanceof Error ? error.message : String(error) });
      }
    }

    return NextResponse.json(responsePayload, {
      headers: {
        "Cache-Control": "public, max-age=0, s-maxage=300",
        "x-cache": "miss",
      },
    });
  } catch (error) {
    const isAbort = error instanceof Error && error.name === "AbortError";
    log.warn("ssa office lookup failed", { message: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      {
        error: {
          code: "UPSTREAM_UNAVAILABLE",
          message: "We could not load Social Security offices right now. Please try again later.",
        },
      },
      { status: isAbort ? 504 : 502 },
    );
  }
}

async function fetchSsaFieldOffices(location: LocationPayload, radiusMiles: number): Promise<SocialSecurityFieldOffice[]> {
  const geometry = JSON.stringify({
    x: location.longitude,
    y: location.latitude,
    spatialReference: { wkid: 4326 },
  });
  const params = new URLSearchParams({
    f: "json",
    geometry,
    geometryType: "esriGeometryPoint",
    inSR: "4326",
    spatialRel: "esriSpatialRelIntersects",
    distance: String(radiusMiles),
    units: "esriSRUnit_StatuteMile",
    outSR: "4326",
    outFields: [
      "OFFICE_CODE",
      "OFFICE_NAME",
      "ADDRESS_LINE_1",
      "ADDRESS_LINE_2",
      "ADDRESS_LINE_3",
      "CITY",
      "STATE",
      "ZIP_CODE",
      "PHONE",
      "FAX",
      "MONDAY_OPEN_TIME",
      "MONDAY_CLOSE_TIME",
      "TUESDAY_OPEN_TIME",
      "TUESDAY_CLOSE_TIME",
      "WEDNESDAY_OPEN_TIME",
      "WEDNESDAY_CLOSE_TIME",
      "THURSDAY_OPEN_TIME",
      "THURSDAY_CLOSE_TIME",
      "FRIDAY_OPEN_TIME",
      "FRIDAY_CLOSE_TIME",
      "LATITUDE_NUM",
      "LONGITUDE_NUM",
    ].join(","),
    returnGeometry: "true",
    orderByFields: "OFFICE_NAME",
    resultRecordCount: String(MAX_RECORD_COUNT),
  });

  const url = `${SSA_FEATURE_SERVER_URL}?${params.toString()}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);

  try {
    const res = await fetch(url, {
      headers: { accept: "application/json" },
      signal: controller.signal,
      cache: "no-store",
    });
    if (!res.ok) {
      throw new Error(`ArcGIS HTTP ${res.status}`);
    }
    const json = (await res.json()) as { features?: ArcgisFeature[]; error?: { message?: string } };
    if (json.error) throw new Error(json.error.message || "ArcGIS error");
    const features = Array.isArray(json.features) ? json.features : [];
    const origin = { lat: location.latitude, lon: location.longitude };
    return features
      .map((feature) => mapFeatureToOffice(feature, origin))
      .filter((item): item is { office: SocialSecurityFieldOffice; distance: number | null } => Boolean(item))
      .sort((a, b) => {
        const left = typeof a.distance === "number" ? a.distance : Number.POSITIVE_INFINITY;
        const right = typeof b.distance === "number" ? b.distance : Number.POSITIVE_INFINITY;
        return left - right;
      })
      .map((item) => item.office);
  } finally {
    clearTimeout(timeout);
  }
}

function mapFeatureToOffice(
  feature: ArcgisFeature,
  origin: { lat: number; lon: number },
): { office: SocialSecurityFieldOffice; distance: number | null } | null {
  const attributes = feature.attributes ?? {};
  const officeCode = toTrimmedString(attributes.OFFICE_CODE);
  const officeName = toTrimmedString(attributes.OFFICE_NAME);
  const address1 = toTrimmedString(attributes.ADDRESS_LINE_1) || toTrimmedString(attributes.ADDRESS_LINE_2) || "Social Security Office";
  const address2Parts = [toTrimmedString(attributes.ADDRESS_LINE_2), toTrimmedString(attributes.ADDRESS_LINE_3)].filter(
    (value) => value && value !== address1,
  );
  const city = toTrimmedString(attributes.CITY);
  const state = toTrimmedString(attributes.STATE).toUpperCase();
  const postalCode = toTrimmedString(attributes.ZIP_CODE);
  const phone = normalizeContact(attributes.PHONE);
  const fax = normalizeContact(attributes.FAX);

  const latitude = pickCoordinate(attributes.LATITUDE_NUM, feature.geometry?.y);
  const longitude = pickCoordinate(attributes.LONGITUDE_NUM, feature.geometry?.x);
  if (typeof latitude !== "number" || typeof longitude !== "number") return null;
  if (!officeCode || !officeName || !address1 || !city || !state || state.length !== 2 || !postalCode) return null;

  const formatHours = (open?: unknown, close?: unknown) => formatOfficeHours(toTrimmedString(open), toTrimmedString(close));

  const office: SocialSecurityFieldOffice = {
    id: String(attributes.ObjectId ?? officeCode),
    officeCode,
    name: officeName,
    address1,
    address2: address2Parts.join(" ").trim() || null,
    city,
    state,
    postalCode,
    phone,
    fax,
    latitude,
    longitude,
    mondayHours: formatHours(attributes.MONDAY_OPEN_TIME, attributes.MONDAY_CLOSE_TIME),
    tuesdayHours: formatHours(attributes.TUESDAY_OPEN_TIME, attributes.TUESDAY_CLOSE_TIME),
    wednesdayHours: formatHours(attributes.WEDNESDAY_OPEN_TIME, attributes.WEDNESDAY_CLOSE_TIME),
    thursdayHours: formatHours(attributes.THURSDAY_OPEN_TIME, attributes.THURSDAY_CLOSE_TIME),
    fridayHours: formatHours(attributes.FRIDAY_OPEN_TIME, attributes.FRIDAY_CLOSE_TIME),
  };
  const distance = haversineMiles(origin.lat, origin.lon, latitude, longitude);
  return { office, distance };
}

function pickCoordinate(attributeValue?: unknown, geometryValue?: number | null): number | null {
  if (typeof attributeValue === "number" && Number.isFinite(attributeValue)) return attributeValue;
  if (typeof geometryValue === "number" && Number.isFinite(geometryValue)) return geometryValue;
  if (typeof attributeValue === "string") {
    const parsed = Number(attributeValue);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function toTrimmedString(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim();
}

function normalizeContact(value: unknown): string | null {
  const raw = toTrimmedString(value);
  return raw.length > 0 ? raw : null;
}

function formatOfficeHours(open?: string, close?: string): string | null {
  const hasOpen = Boolean(open);
  const hasClose = Boolean(close);
  if (!hasOpen && !hasClose) return null;
  if (hasOpen && hasClose) return `${open} – ${close}`;
  return open ?? close ?? null;
}

function haversineMiles(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const lat1Rad = toRad(lat1);
  const lat2Rad = toRad(lat2);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1Rad) * Math.cos(lat2Rad);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const earthRadiusMiles = 3958.8;
  return Math.round(earthRadiusMiles * c * 100) / 100;
}

function buildResponse(offices: SocialSecurityFieldOffice[], radiusMiles: number) {
  const notes =
    offices.length === 0
      ? `No SSA field offices found within ${radiusMiles} miles of this location.`
      : "SSA field office locations, phone numbers, and hours of operation. Updated quarterly by SSA.";

  return zSocialSecurityOfficesResponse.parse({
    source: "ssa-field-offices",
    lastUpdated: null,
    offices,
    meta: {
      provider: "SSA Field Office Contact Information",
      datasetUrl: SSA_DATASET_URL,
      notes,
    },
  });
}
