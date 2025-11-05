import crypto from "node:crypto";
import { CounselorItem } from "./lib";

const DEFAULT_FEATURESERVER_URL =
  "https://services.arcgis.com/VTyQ9soqVukalItT/ArcGIS/rest/services/Active_HCAs/FeatureServer/0/query";

const SERVICE_LABELS: Record<string, string> = {
  DFC: "Mortgage delinquency & default counseling",
  DFW: "Mortgage delinquency & default workshops",
  FBC: "Financial management/budget counseling",
  FBW: "Financial management/budget workshops",
  FHW: "Fair housing pre-purchase education workshops",
  HIC: "Home improvement & rehabilitation counseling",
  HMC: "Homebuyer coaching",
  NDW: "Non-delinquency post-purchase workshops",
  PLW: "Post-purchase counseling workshops",
  PPC: "Pre-purchase/homebuying counseling",
  PPW: "Pre-purchase/homebuying workshops",
  RHC: "Rental housing counseling",
  RHW: "Rental housing workshops",
  RMC: "Reverse mortgage counseling",
};

const LANGUAGE_LABELS: Record<string, string> = {
  ARA: "Arabic",
  ASL: "American Sign Language",
  CAM: "Khmer",
  CAN: "Cantonese",
  CHI: "Chinese",
  CRE: "Creole",
  CZE: "Czech",
  ENG: "English",
  FAR: "Farsi",
  FRE: "French",
  GER: "German",
  HIN: "Hindi",
  HMO: "Hmong",
  IND: "Indonesian",
  ITA: "Italian",
  KOR: "Korean",
  OTH: "Other",
  POL: "Polish",
  POR: "Portuguese",
  RUS: "Russian",
  SPA: "Spanish",
  SWA: "Swahili",
  TUR: "Turkish",
  UKR: "Ukrainian",
  VIE: "Vietnamese",
};

function splitCodes(value: unknown, map: Record<string, string>): string[] | undefined {
  if (!value || typeof value !== "string") return undefined;
  const parts = value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (parts.length === 0) return undefined;
  return parts.map((code) => map[code] || code);
}

function normalizeWebsite(url?: string | null): string | undefined {
  if (!url || typeof url !== "string") return undefined;
  const trimmed = url.trim();
  if (!trimmed || trimmed.toLowerCase() === "n/a" || trimmed.toLowerCase() === "na") return undefined;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function haversineMiles(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3958.8; // Earth radius in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export interface ArcgisCounselorParams {
  lat: number;
  lon: number;
  radiusMiles: number;
  maxResults?: number;
}

export async function fetchArcgisCounselors({ lat, lon, radiusMiles, maxResults = 100 }: ArcgisCounselorParams): Promise<CounselorItem[]> {
  const featureUrl = process.env.HUD_COUNSELORS_ARCGIS_URL?.trim() || DEFAULT_FEATURESERVER_URL;
  const params = new URLSearchParams({
    f: "json",
    where: "1=1",
    geometry: `${lon},${lat}`,
    geometryType: "esriGeometryPoint",
    inSR: "4326",
    spatialRel: "esriSpatialRelIntersects",
    distance: radiusMiles.toString(),
    units: "esriSRUnit_StatuteMile",
    outFields:
      "OBJECTID,AGCID,NME,ADR1,ADR2,CITY,STATECD,ZIPCD,PHONE1,WEBURL,SERVICES,LANGUAGES,COUNSLG_METHOD,AGC_ADDR_LATITUDE,AGC_ADDR_LONGITUDE",
    returnGeometry: "false",
    resultRecordCount: String(Math.min(maxResults, 1000)),
    cacheHint: "true",
  });

  const url = `${featureUrl}${featureUrl.includes("?") ? "&" : "?"}${params.toString()}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);
  try {
    const res = await fetch(url, { headers: { accept: "application/json" }, signal: controller.signal });
    if (!res.ok) {
      throw new Error(`ArcGIS HTTP ${res.status}`);
    }
    const json = await res.json();
    const features = Array.isArray(json.features) ? json.features : [];
    const items: CounselorItem[] = [];
    for (const feature of features) {
      const attrs = feature?.attributes ?? {};
      const latAttr = Number(attrs.AGC_ADDR_LATITUDE);
      const lonAttr = Number(attrs.AGC_ADDR_LONGITUDE);
      const hasCoords = Number.isFinite(latAttr) && Number.isFinite(lonAttr);
      const distance = hasCoords ? haversineMiles(lat, lon, latAttr, lonAttr) : undefined;
      if (typeof distance === "number" && distance > radiusMiles + 5) continue; // extra guard
      const id = String(
        attrs.AGCID ?? attrs.OBJECTID ?? (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2))
      );
      const services = splitCodes(attrs.SERVICES, SERVICE_LABELS) ?? [];
      const methods =
        typeof attrs.COUNSLG_METHOD === "string"
          ? attrs.COUNSLG_METHOD.split(",").map((s: string) => s.trim()).filter(Boolean)
          : [];
      const languages = splitCodes(attrs.LANGUAGES, LANGUAGE_LABELS);
      const website = normalizeWebsite(typeof attrs.WEBURL === "string" ? attrs.WEBURL : undefined);
      const combined = new Set<string>();
      for (const label of [...services, ...methods]) {
        if (label) combined.add(label);
      }
      const item: CounselorItem = {
        id,
        name: typeof attrs.NME === "string" ? attrs.NME.trim() : "",
        phone: typeof attrs.PHONE1 === "string" ? attrs.PHONE1.trim() : undefined,
        website,
        services: combined.size > 0 ? Array.from(combined.values()) : undefined,
        languages,
        coords: hasCoords ? ([lonAttr, latAttr] as [number, number]) : undefined,
        address: typeof attrs.ADR1 === "string" ? attrs.ADR1.trim() : undefined,
        city: typeof attrs.CITY === "string" ? attrs.CITY.trim() : undefined,
        state: typeof attrs.STATECD === "string" ? attrs.STATECD.trim() : undefined,
        postalCode: typeof attrs.ZIPCD === "string" ? attrs.ZIPCD.trim() : undefined,
        distanceMiles: distance,
      };
      if (!item.name) continue;
      items.push(item);
    }
    items.sort((a, b) => (a.distanceMiles ?? Number.POSITIVE_INFINITY) - (b.distanceMiles ?? Number.POSITIVE_INFINITY));
    return items.slice(0, maxResults);
  } finally {
    clearTimeout(timeout);
  }
}
