import { z } from "zod";
import crypto from "node:crypto";

export const zQuery = z.object({
  lat: z
    .string()
    .transform((v) => Number(v))
    .refine((n) => !Number.isNaN(n) && n >= -90 && n <= 90, "invalid lat"),
  lon: z
    .string()
    .transform((v) => Number(v))
    .refine((n) => !Number.isNaN(n) && n >= -180 && n <= 180, "invalid lon"),
  radius: z
    .string()
    .optional()
    .transform((v) => (v ? Math.min(100, Math.max(5, parseInt(v, 10))) : 30)),
});

export function hashKey(parts: Record<string, string | number | undefined>): string {
  const norm = Object.keys(parts)
    .sort()
    .map((k) => `${k}=${parts[k] ?? ""}`)
    .join("|");
  return crypto.createHash("sha256").update(norm).digest("hex");
}

export function buildHudCounselorsUrl(lat: number, lon: number, radius: number, base?: string): string {
  const endpoint = base?.trim() || process.env.HUD_COUNSELORS_URL ||
    // Provide a configurable default; must be overridden in env for production.
    "https://data.hud.gov/housing_counseling/search";
  const u = new URL(endpoint);
  // Common params for proximity search; adjust per actual API once wired
  u.searchParams.set("lat", String(lat));
  u.searchParams.set("lng", String(lon));
  u.searchParams.set("distance", String(radius));
  return u.toString();
}

export interface CounselorItem {
  id: string; name: string; phone?: string; website?: string; services?: string[]; languages?: string[]; coords?: [number, number]
}

export function transformHudToCounselors(json: any): CounselorItem[] {
  if (!json || typeof json !== "object") return [];
  const list = (json.results || json.agencies || json.items || []) as any[];
  if (!Array.isArray(list)) return [];
  const items: CounselorItem[] = [];
  for (const a of list) {
    const id = String(
      a.id || a.agc_CODE || a.agency_id || a.org_id || crypto.createHash("sha1").update(JSON.stringify(a)).digest("hex")
    );
    const name = String(a.name || a.agency_name || a.ORG_NAME || "");
    if (!name) continue;
    const phone = (a.phone || a.PHONE || a.agency_phone) ? String(a.phone || a.PHONE || a.agency_phone) : undefined;
    const website = (a.website || a.WEBSITE || a.agency_website) ? String(a.website || a.WEBSITE || a.agency_website) : undefined;
    const services: string[] | undefined = Array.isArray(a.services)
      ? a.services.map(String)
      : (typeof a.services_offered === "string" ? String(a.services_offered).split(",").map((s) => s.trim()).filter(Boolean) : undefined);
    const languages: string[] | undefined = Array.isArray(a.languages)
      ? a.languages.map(String)
      : (typeof a.languages_spoken === "string" ? String(a.languages_spoken).split(",").map((s) => s.trim()).filter(Boolean) : undefined);

    const lat = Number(a.latitude ?? a.lat ?? a.LATITUDE);
    const lon = Number(a.longitude ?? a.lng ?? a.LONGITUDE);
    const coords = Number.isFinite(lat) && Number.isFinite(lon) ? ([lon, lat] as [number, number]) : undefined;

    items.push({ id, name, phone, website, services, languages, coords });
  }
  return items;
}
