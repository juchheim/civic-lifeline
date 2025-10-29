# Data Model (MongoDB + Geo)

> Canonical, code-first definitions for all persisted collections.  
> Conventions: ISO 8601 timestamps in UTC; coords as `[lon, lat]` (EPSG:4326); 5-digit county FIPS (left-padded).

## Common Fields & Conventions

- `createdAt` / `updatedAt`: set by server (never client); updated via pre-save hooks.
- `source`, `sourceUrl`, `fetchedAt`, `dataVintage` (YYYY or YYYY-MM): carried on records derived from external datasets.
- `loc`: GeoJSON `Point` with `[lon, lat]`.
- **FIPS rules**: always 5 chars (e.g., Yazoo County `28163`).
- **IDs**: Mongo `_id` (ObjectId) except where noted.

### Shared Zod Helpers (for API validation)
```ts
import { z } from "zod";

export const zFips = z.string().regex(/^\d{5}$/);
export const zISODate = z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/);
export const zYear = z.number().int().gte(1990).lte(2100);
export const zLon = z.number().gte(-180).lte(180);
export const zLat = z.number().gte(-90).lte(90);

export const zPoint = z.object({
  type: z.literal("Point"),
  coordinates: z.tuple([zLon, zLat]),
});

## 1) snapRetailers — USDA SNAP-Accepting Stores

**Purpose**: Snapshot + fast query layer for SNAP retailers powering the Food Access map.

### Document Shape (TypeScript)

```typescript
export interface SnapRetailer {
  _id: string;                 // deterministic hash of provider store id or name+addr
  name: string;
  address: string;             // single line
  city?: string;
  state?: string;              // "MS" etc.
  postalCode?: string;
  storeType?: string;          // e.g., "Supermarket", "Convenience"
  phone?: string | null;
  hours?: string | null;
  loc: { type: "Point"; coordinates: [number, number] };
  // provenance
  source: "USDA ArcGIS";
  sourceUrl: string;
  fetchedAt: string;           // ISO
  dataVintage?: string;        // e.g., "2025-06"
  createdAt: string;
  updatedAt: string;
}

### Mongo JSON Schema (validator)

```json
{
  "bsonType": "object",
  "required": ["name","address","loc","source","sourceUrl","fetchedAt"],
  "properties": {
    "name": { "bsonType": "string", "maxLength": 256 },
    "address": { "bsonType": "string", "maxLength": 256 },
    "storeType": { "bsonType": ["string","null"] },
    "phone": { "bsonType": ["string","null"] },
    "hours": { "bsonType": ["string","null"] },
    "loc": {
      "bsonType": "object",
      "required": ["type","coordinates"],
      "properties": {
        "type": { "enum": ["Point"] },
        "coordinates": {
          "bsonType": "array",
          "items": [{ "bsonType": "double" }, { "bsonType": "double" }],
          "minItems": 2,
          "maxItems": 2
        }
      }
    },
    "source": { "enum": ["USDA ArcGIS"] },
    "sourceUrl": { "bsonType": "string" },
    "fetchedAt": { "bsonType": "string" },
    "dataVintage": { "bsonType": "string" }
  }
}

### Indexes

- `loc` 2dsphere
- `{ name: 1, address: 1 }`
- `{ fetchedAt: -1 }`
- Optional unique on `{ name: 1, address: 1 }` if provider id absent.

### Sample

```json
{
  "name": "SaveMore Grocery",
  "address": "123 Main St, Yazoo City, MS 39194",
  "storeType": "Supermarket",
  "phone": "662-555-0123",
  "hours": "Mon–Sat 8–8; Sun 10–6",
  "loc": { "type": "Point", "coordinates": [-90.405, 32.889] },
  "source": "USDA ArcGIS",
  "sourceUrl": "https://services2.arcgis.com/.../FeatureServer/0/query?....",
  "fetchedAt": "2025-10-28T15:30:00Z",
  "dataVintage": "2025-06",
  "createdAt": "2025-10-28T15:31:00Z",
  "updatedAt": "2025-10-28T15:31:00Z"
}
```

### Notes / Gotchas

- Hours and phone often null; render defensively.
- Normalize addresses; avoid reverse-geocoding (we consume provider coords).

## 2) lausSeries — BLS County Unemployment (LAUS)

**Purpose**: Time series backing Jobs/Skills chart.

### Document Shape

```typescript
export interface LausSeries {
  _id: string;                 // BLS seriesId (e.g., LAUCN281630000000003)
  countyFips: string;          // 5 chars
  adjusted: boolean;           // seasonally adjusted? (usually false for LAUS)
  unit: "percent";
  points: Array<{ date: string; value: number }>;  // YYYY-MM, numeric
  source: "BLS LAUS";
  sourceUrl?: string;          // docs or series info URL
  fetchedAt: string;
  createdAt: string;
  updatedAt: string;
}

### Indexes

- `{ countyFips: 1 }`
- `points.date` (sparse) if querying by ranges
- Unique `_id = seriesId`

### Sample

```json
{
  "_id": "LAUCN281630000000003",
  "countyFips": "28163",
  "adjusted": false,
  "unit": "percent",
  "points": [
    { "date": "2024-12", "value": 8.7 },
    { "date": "2025-01", "value": 8.9 }
  ],
  "source": "BLS LAUS",
  "fetchedAt": "2025-10-28T15:40:00Z",
  "createdAt": "2025-10-28T15:40:10Z",
  "updatedAt": "2025-10-28T15:40:10Z"
}
```

### Notes

- Ensure month uniqueness when merging refreshes.
- Keep last 5–10 years (trim older points if storage matters).

## 3) fccBroadband — FCC National Broadband Map Summaries

**Purpose**: County/tract availability summaries derived from FCC CSV snapshots.

### Document Shape

```typescript
export interface FccBroadband {
  _id: string;                 // fips + ":" + asOf
  geoType: "county" | "tract";
  fips: string;                // 5 for county, 11 for tract
  asOf: string;                // YYYY-MM-DD (snapshot vintage date)
  providerCount: number;
  speed: { "25_3": boolean; "100_20": boolean; "1000_100": boolean };
  tech: string[];              // e.g., ["Fiber","Cable","Fixed Wireless"]
  source: "FCC NBM CSV";
  sourceUrl: string;           // download page or catalog item
  fetchedAt: string;
  createdAt: string;
  updatedAt: string;
}

### Indexes

- Unique `{ fips: 1, asOf: 1 }`
- `{ geoType: 1, fips: 1 }`

### Sample

```json
{
  "_id": "28163:2025-06-30",
  "geoType": "county",
  "fips": "28163",
  "asOf": "2025-06-30",
  "providerCount": 3,
  "speed": { "25_3": true, "100_20": true, "1000_100": false },
  "tech": ["Fiber", "Cable"],
  "source": "FCC NBM CSV",
  "sourceUrl": "https://broadbandmap.fcc.gov/data-download",
  "fetchedAt": "2025-10-26T04:05:00Z",
  "createdAt": "2025-10-26T04:06:00Z",
  "updatedAt": "2025-10-26T04:06:00Z"
}
```

### Notes

- Keep multiple vintages to show change over time.
- CSV schema/version can change; store transform metadata in ETL logs.

## 4) hudCounselorsCache — HUD Housing Counselors (Query Cache)

**Purpose**: Cache for "near me" counselor searches to reduce upstream calls.

### Document Shape

```typescript
export interface HudCounselorsCache {
  _id: string;                 // sha256 of "lat:lon:radius"
  lat: number;
  lon: number;
  radius: number;              // miles
  items: Array<{
    id: string;                // HUD agency code or derived id
    name: string;
    phone?: string | null;
    website?: string | null;
    services?: string[];       // Rental, Credit, Pre-purchase...
    languages?: string[];
    loc?: { type: "Point"; coordinates: [number, number] };
  }>;
  source: "HUD Housing Counselor API";
  sourceUrl: string;
  fetchedAt: string;
  createdAt: string;
  updatedAt: string;
}

### Indexes

- TTL on `fetchedAt` (24h) or hourly sweeper job
- `{ radius: 1 }` (optional, analytics)

### Notes

- This is a cache only—do not manually edit items.
- Handle partial records gracefully.

## 5) hudFmr — HUD Fair Market Rents

**Purpose**: Yearly FMRs for affordability panels.

### Document Shape

```typescript
export interface HudFmr {
  _id: string;                 // fips + "-" + year
  fips: string;                // county or FMR area mapped to county FIPS
  year: number;
  areaName: string;
  br0: number;                 // efficiency
  br1: number;
  br2: number;
  br3: number;
  br4: number;
  source: "HUD FMR API";
  sourceUrl: string;
  fetchedAt: string;
  createdAt: string;
  updatedAt: string;
}

### Indexes

- Unique `{ fips: 1, year: 1 }`

### Notes

- FMR areas may span multiple counties; document your mapping in ETL notes.

## 6) resources — Community Submissions (Verified Before Public)

**Purpose**: Curated local resources (e.g., public Wi-Fi, food pantries) contributed by users and verified by moderators.

### Document Shape

```typescript
export type ResourceType = "wifi" | "food_pantry" | "meal_site" | "clinic" | "other";

export interface Resource {
  _id: string;
  type: ResourceType;
  name: string;
  description?: string;
  loc: { type: "Point"; coordinates: [number, number] };
  address?: string;
  contact?: { phone?: string; email?: string; site?: string };
  hours?: string;
  submittedBy?: string | null; // userId or null
  verified?: { by: string; at: string; method: "phone" | "site" | "email" };
  createdAt: string;
  updatedAt: string;
}

### Indexes

- `loc` 2dsphere
- `{ type: 1 }`
- `{ "verified.at": -1 }`

### Rules

- Unverified records never appear on public endpoints.
- Moderation actions are audited (see moderation-playbook.md).

### Sample

```json
{
  "type": "wifi",
  "name": "Yazoo Library Public Wi-Fi",
  "loc": { "type": "Point", "coordinates": [-90.403, 32.887] },
  "address": "321 Library Rd, Yazoo City, MS 39194",
  "contact": { "phone": "662-555-0162", "site": "https://example.org" },
  "verified": { "by": "moderator@site", "at": "2025-10-28T16:10:00Z", "method": "phone" },
  "createdAt": "2025-10-28T16:05:00Z",
  "updatedAt": "2025-10-28T16:10:00Z"
}
```

## 7) users — Accounts & Roles

**Purpose**: Authentication and RBAC.

### Document Shape

```typescript
export type UserRole = "user" | "moderator" | "admin";

export interface User {
  _id: string;
  email: string;
  passwordHash?: string;       // if password auth enabled
  role: UserRole;
  profile?: { name?: string; zip?: string };
  createdAt: string;
  updatedAt: string;
}

### Indexes

- Unique `{ email: 1 }`
- `{ role: 1 }`

### Notes

- Store only bcrypt hashes; never plaintext.
- Support email-link auth to avoid password handling if preferred.

## 8) letters — Generated Letters (AI-Assisted)

**Purpose**: Store metadata for generated PDFs (content can be re-rendered if needed).

### Document Shape

```typescript
export type LetterType = "repair_request" | "benefits_inquiry" | "other";

export interface Letter {
  _id: string;
  userId: string;              // owner
  type: LetterType;
  inputs: Record<string, unknown>;
  text?: string;               // optional cached plain text
  pdfKey: string;              // S3 key
  createdAt: string;
  updatedAt: string;
}

### Indexes

- `{ userId: 1, createdAt: -1 }`

### Retention

- Default 30 days for PDFs; metadata may persist longer (configurable).

## Relationships (Logical)

- `users` (1) — (N) `letters` via `letters.userId`.
- `resources` are independent; moderation uses `users.role=moderator`.
- `snapRetailers` / `fccBroadband` / `lausSeries` / `hud*` are source datasets (read-only to app users).

## Mongoose Model Hints (optional snippets)

```typescript
import mongoose from "mongoose";

const Point = {
  type: { type: String, enum: ["Point"], required: true },
  coordinates: { type: [Number], required: true }, // [lon, lat]
};

const SnapRetailerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  address: { type: String, required: true },
  storeType: String,
  phone: String,
  hours: String,
  loc: { type: Point, required: true },
  source: { type: String, enum: ["USDA ArcGIS"], required: true },
  sourceUrl: { type: String, required: true },
  fetchedAt: { type: Date, required: true },
  dataVintage: String
}, { timestamps: true });

SnapRetailerSchema.index({ loc: "2dsphere" });
SnapRetailerSchema.index({ name: 1, address: 1 }, { unique: false });
```

## Validation & Invariants

- `loc.coordinates[0]` in [-180, 180], `loc.coordinates[1]` in [-90, 90].
- `points.date` matches `/^\d{4}-\d{2}$/`.
- `hudFmr.year` in configured supported range.
- `resources.verified` present only after moderator action.
- No PII beyond what is essential (avoid storing full letters unless user opts in).

## Migration & Versioning

- Schema changes require a migration note in RELEASE_NOTES.md.
- Add fields as optional first; backfill; then tighten validators.
- Keep historical fccBroadband vintages; pruning policy documented in ETL.

## Data Volume Expectations (MVP, MS focus)

- `snapRetailers`: O(3–6k) for MS.
- `lausSeries`: O(82 counties) * ~120 points.
- `fccBroadband`: O(82 counties) per vintage; a few vintages retained.
- `hudCounselorsCache`: ephemeral; TTL managed.
- `resources`: starts small; grows with community.

## Backup & Restore

- Mongo Atlas daily snapshots; quarterly restore test.
- S3 versioning for raw FCC CSVs and generated PDFs.
- ETL re-runnable idempotently to rebuild derived tables.