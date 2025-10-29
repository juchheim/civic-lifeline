import crypto from "node:crypto";
import { z } from "zod";
import { parseBbox, clampToWorld, Bbox } from "@cl/utils";
import type { SnapItem } from "@cl/types";

export const zQuery = z.object({
  bbox: z
    .string()
    .refine((s) => s.split(",").length === 4, { message: "bbox must be minLon,minLat,maxLon,maxLat" }),
  types: z.string().optional(),
  limit: z
    .string()
    .optional()
    .transform((v) => (v ? Math.min(500, Math.max(1, parseInt(v, 10))) : 300)),
});

export function normalizeBbox(input: string): Bbox {
  const b = parseBbox(input);
  return clampToWorld(b);
}

export function hashKey(parts: Record<string, string | number | undefined>): string {
  const norm = Object.keys(parts)
    .sort()
    .map((k) => `${k}=${parts[k] ?? ""}`)
    .join("|");
  return crypto.createHash("sha256").update(norm).digest("hex");
}

export function buildArcgisUrl(bbox: Bbox, limit: number, base?: string): string {
  const endpoint =
    base?.trim() ||
    process.env.USDA_SNAP_ARCGIS_FEATURE_URL ||
    process.env.USDA_SNAP_ARCGIS_URL ||
    // Fallback: Many public SNAP layers follow FeatureServer/0/query. Allow override via env.
    "https://services2.arcgis.com/" +
      "VhQ18K5S5F7fNwJ0/ArcGIS/rest/services/USDA_SNAP_Retailers/FeatureServer/0/query"; // replace via env if needed

  const [minLon, minLat, maxLon, maxLat] = bbox;
  const u = new URL(endpoint);
  u.searchParams.set("f", "json");
  u.searchParams.set("where", "1=1");
  u.searchParams.set("inSR", "4326");
  u.searchParams.set("outSR", "4326");
  u.searchParams.set("spatialRel", "esriSpatialRelIntersects");
  u.searchParams.set("returnGeometry", "true");
  u.searchParams.set("geometryType", "esriGeometryEnvelope");
  u.searchParams.set("geometry", `${minLon},${minLat},${maxLon},${maxLat}`);
  u.searchParams.set("outFields", "*");
  u.searchParams.set("resultOffset", "0");
  u.searchParams.set("resultRecordCount", String(limit));
  return u.toString();
}

function attr(attrs: Record<string, unknown>, names: string[]): any {
  const lower = new Map(Object.entries(attrs).map(([k, v]) => [k.toLowerCase(), v]));
  for (const n of names) {
    const v = lower.get(n.toLowerCase());
    if (v !== undefined && v !== null && String(v).length > 0) return v;
  }
  return undefined;
}

export function transformArcgisToSnapItems(json: any): SnapItem[] {
  if (!json || typeof json !== "object") return [];
  if ((json as any).error) throw new Error("ArcGIS error body");
  const feats = Array.isArray((json as any).features) ? (json as any).features : [];
  const items: SnapItem[] = [];

  for (const f of feats) {
    const attrs = (f && typeof f === "object" && (f as any).attributes) || {};
    const geom = (f && typeof f === "object" && (f as any).geometry) || {};

    const name = attr(attrs, ["store_name", "storename", "name"]);
    const address1 = attr(attrs, ["street_address", "address", "addr", "site_address"]);
    const city = attr(attrs, ["city", "municipality"]);
    const state = attr(attrs, ["state", "st"]);
    const zip = attr(attrs, ["zip", "zip_code", "zipcode", "postalcode"]);
    const storeType = attr(attrs, ["store_type", "type", "category"]);
    const phone = attr(attrs, ["phone", "phone_number", "phonenumber"]);
    const hours = attr(attrs, ["hours", "opening_hours", "open_hours", "operation_hours"]);

    const x = (geom as any)?.x ?? attr(attrs, ["longitude", "lon", "x"]);
    const y = (geom as any)?.y ?? attr(attrs, ["latitude", "lat", "y"]);

    if (!name || !address1 || typeof x !== "number" || typeof y !== "number") {
      continue; // skip incomplete 
    }

    const addressParts = [address1, city, state, zip].filter(Boolean);
    const address = addressParts.join(", ");

    items.push({
      id: crypto.createHash("sha1").update(`${name}|${address}|${x},${y}`).digest("hex"),
      name: String(name),
      address: String(address),
      coords: [Number(x), Number(y)],
      storeType: storeType ? String(storeType) : undefined,
      phone: phone ? String(phone) : null,
      hours: hours ? String(hours) : null,
    });
  }

  return items;
}
