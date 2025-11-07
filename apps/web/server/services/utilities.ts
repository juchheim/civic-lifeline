import { getCountiesCollection, getStatesCollection } from "@cl/db";
import { createLogger } from "@/lib/logger";
import type { State } from "@cl/types";

export type Area = { state: string; county?: string; city?: string };

export type CostDistribution = {
  total: number;
  buckets: Array<{ label: string; var: string; count: number }>;
  estTypicalMonthly: number | null;
};

export type UtilitiesErrorCode =
  | "INVALID_INPUT"
  | "STATE_UNSUPPORTED"
  | "LOCATION_NOT_FOUND"
  | "LOCATION_AMBIGUOUS"
  | "UPSTREAM_ERROR"
  | "UPSTREAM_RATE_LIMIT";

export class UtilitiesDataError extends Error {
  code: UtilitiesErrorCode;
  details?: Record<string, unknown>;
  constructor(code: UtilitiesErrorCode, message: string, details?: Record<string, unknown>) {
    super(message);
    this.code = code;
    this.details = details;
    this.name = "UtilitiesDataError";
  }
}

type StateMeta = Pick<State, "code" | "name" | "fips">;
type CountyRecord = { name: string; normalized: string; countyCode: string; countyFips: string };
type PlaceRecord = { name: string; normalized: string; placeCode: string };
type CountyTarget = CountyRecord & { state: StateMeta; type: "county" };
type PlaceTarget = PlaceRecord & { state: StateMeta; type: "place" };
export type ResolvedArea = CountyTarget | PlaceTarget;

const ACCENT_REGEX = /[\u0300-\u036f]/g;
const CENSUS_BASE = "https://api.census.gov/data";
const CENSUS_DATASET = "2023/acs/acs5";
const GEOCODER_URL = "https://geocoding.geo.census.gov/geocoder/geographies/onelineaddress";
const ELECTRIC_BUCKETS = [
  { label: "<$50", var: "B25132_005E", midpoint: 25 },
  { label: "$50–$99", var: "B25132_006E", midpoint: 75 },
  { label: "$100–$149", var: "B25132_007E", midpoint: 125 },
  { label: "$150–$199", var: "B25132_008E", midpoint: 175 },
  { label: "$200+", var: "B25132_009E", midpoint: 225 },
] as const;
const GAS_BUCKETS = [
  { label: "<$50", var: "B25133_005E", midpoint: 25 },
  { label: "$50–$99", var: "B25133_006E", midpoint: 75 },
  { label: "$100–$149", var: "B25133_007E", midpoint: 125 },
  { label: "$150–$199", var: "B25133_008E", midpoint: 175 },
  { label: "$200+", var: "B25133_009E", midpoint: 225 },
] as const;
const WATER_BUCKETS = [
  { label: "<$200", var: "B25134_003E", midpoint: 100 },
  { label: "$200–$399", var: "B25134_004E", midpoint: 300 },
  { label: "$400–$599", var: "B25134_005E", midpoint: 500 },
  { label: "$600–$799", var: "B25134_006E", midpoint: 700 },
  { label: "$800+", var: "B25134_007E", midpoint: 900 },
] as const;
const REQUEST_TIMEOUT_MS = 15000;
const HOST_MIN_INTERVAL_MS = 200;
const HOST_JITTER_MS = 120;
const HOST_TIMEOUTS: Record<string, number> = {
  "data.epa.gov": 25000,
  "maps.nccs.nasa.gov": 25000,
  "services3.arcgis.com": 20000,
  "tigerweb.geo.census.gov": 20000,
};

const statesByCode = new Map<string, StateMeta>();
const statesByName = new Map<string, StateMeta>();
const statesByFips = new Map<string, StateMeta>();
let statesLoaded = false;
const countyCache = new Map<string, CountyRecord[]>();
const placeCache = new Map<string, PlaceRecord[]>();
const hostSchedule = new Map<string, number>();
const serviceLog = createLogger("services/utilities");

function normalizeName(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(ACCENT_REGEX, "")
    .replace(/&/g, " and ")
    .replace(/\bste[.]?\b/g, "sainte")
    .replace(/\bst[.]?\b/g, "saint")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(
      /\b(county|parish|borough|city and borough|city|census area|municipality|township|town|plantation|municipio|district)\b/g,
      " ",
    )
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeDigits(value: string | undefined): string {
  return value ? value.replace(/\D/g, "") : "";
}

async function loadStates(): Promise<void> {
  if (statesLoaded) return;
  const collection = await getStatesCollection();
  const docs = await collection
    .find({}, { projection: { code: 1, name: 1, fips: 1 } })
    .toArray();
  docs.forEach((doc) => {
    const meta: StateMeta = { code: doc.code.toUpperCase(), name: doc.name, fips: doc.fips };
    statesByCode.set(meta.code, meta);
    statesByFips.set(meta.fips, meta);
    statesByName.set(meta.name.toLowerCase(), meta);
  });
  statesLoaded = true;
}

async function ensureStateMeta(stateInput: string): Promise<StateMeta> {
  const trimmed = stateInput?.trim();
  if (!trimmed) throw new UtilitiesDataError("INVALID_INPUT", "State is required.");
  await loadStates();
  const upper = trimmed.toUpperCase();
  if (statesByCode.has(upper)) return statesByCode.get(upper)!;
  const digits = normalizeDigits(trimmed);
  if (digits.length === 2 && statesByFips.has(digits)) return statesByFips.get(digits)!;
  const lower = trimmed.toLowerCase();
  if (statesByName.has(lower)) return statesByName.get(lower)!;
  throw new UtilitiesDataError("STATE_UNSUPPORTED", `State "${stateInput}" is not supported yet.`);
}

async function loadCountyRecords(state: StateMeta): Promise<CountyRecord[]> {
  const cacheKey = state.code;
  const cached = countyCache.get(cacheKey);
  if (cached) return cached;
  const collection = await getCountiesCollection();
  const docs = await collection
    .find({ stateCode: state.code }, { projection: { name: 1, fips: 1 } })
    .toArray();
  if (docs.length === 0) {
    throw new UtilitiesDataError("LOCATION_NOT_FOUND", `We could not find counties for ${state.name}.`);
  }
  const records = docs.map((doc) => ({
    name: doc.name,
    normalized: normalizeName(doc.name),
    countyCode: doc.fips.slice(2),
    countyFips: doc.fips,
  }));
  countyCache.set(cacheKey, records);
  return records;
}

async function pickCountyByCode(state: StateMeta, codeOrFips: string): Promise<CountyRecord | null> {
  const digits = normalizeDigits(codeOrFips);
  if (digits.length === 0) return null;
  const counties = await loadCountyRecords(state);
  if (digits.length === 5) return counties.find((county) => county.countyFips === digits) ?? null;
  if (digits.length === 3) return counties.find((county) => county.countyCode === digits) ?? null;
  return null;
}

function pickSingleMatch<T extends { name: string; normalized: string }>(
  items: T[],
  normalizedInput: string,
  rawInput: string,
  state: StateMeta,
): T {
  if (!normalizedInput) {
    throw new UtilitiesDataError("INVALID_INPUT", "Provide a valid location name.");
  }
  const exact = items.filter((item) => item.normalized === normalizedInput);
  if (exact.length === 1) return exact[0];
  if (exact.length > 1) {
    throw new UtilitiesDataError("LOCATION_AMBIGUOUS", `Multiple matches for "${rawInput}" in ${state.code}.`, {
      candidates: exact.map((item) => item.name),
    });
  }
  const partial = items.filter((item) => item.normalized.includes(normalizedInput));
  if (partial.length === 1) return partial[0];
  if (partial.length > 1) {
    throw new UtilitiesDataError("LOCATION_AMBIGUOUS", `Multiple matches for "${rawInput}" in ${state.code}.`, {
      candidates: partial.map((item) => item.name),
    });
  }
  throw new UtilitiesDataError("LOCATION_NOT_FOUND", `We could not find "${rawInput}" in ${state.code}.`, {
    candidates: items.slice(0, 10).map((item) => item.name),
    listUrl: `/api/counties?stateCode=${state.code}`,
  });
}

async function resolveCounty(state: StateMeta, input: string): Promise<CountyTarget> {
  const digitsMatch = await pickCountyByCode(state, input);
  if (digitsMatch) return { ...digitsMatch, state, type: "county" };
  const counties = await loadCountyRecords(state);
  const record = pickSingleMatch(counties, normalizeName(input), input, state);
  return { ...record, state, type: "county" };
}

async function resolveCountyOnly(area: Area): Promise<CountyTarget> {
  const state = await ensureStateMeta(area.state);
  if (area.county) {
    return resolveCounty(state, area.county);
  }
  if (!area.city) {
    throw new UtilitiesDataError("INVALID_INPUT", "Provide a county or city.");
  }
  return resolveCityToCounty(state, area.city);
}

async function resolvePlace(state: StateMeta, input: string): Promise<PlaceTarget> {
  const cacheKey = state.code;
  let records = placeCache.get(cacheKey);
  if (!records) {
    const params = new URLSearchParams({
      get: "NAME",
      for: "place:*",
      in: `state:${state.fips}`,
    });
    const data = await fetchJson<string[][]>(`${CENSUS_BASE}/${CENSUS_DATASET}?${params.toString()}`);
    if (data.length < 2) throw new UtilitiesDataError("UPSTREAM_ERROR", "City list not available.", { state: state.code });
    records = data.slice(1).map((row) => {
      const nameWithState = row[0] ?? "";
      const commaIndex = nameWithState.indexOf(",");
      const name = commaIndex >= 0 ? nameWithState.slice(0, commaIndex) : nameWithState;
      return { name: name.trim(), normalized: normalizeName(name), placeCode: row[2] };
    });
    placeCache.set(cacheKey, records);
  }
  const record = pickSingleMatch(records, normalizeName(input), input, state);
  return { ...record, state, type: "place" };
}

interface GeocoderResponse {
  result?: {
    addressMatches?: Array<{
      geographies?: {
        Counties?: Array<{
          NAME?: string;
          COUNTY?: string;
          STATE?: string;
        }>;
      };
    }>;
  };
}

async function resolveCityToCounty(state: StateMeta, cityInput: string): Promise<CountyTarget> {
  const url = new URL(GEOCODER_URL);
  url.searchParams.set("address", `${cityInput}, ${state.code}`);
  url.searchParams.set("benchmark", "Public_AR_Current");
  url.searchParams.set("vintage", "Current_Current");
  url.searchParams.set("format", "json");
  const data = await fetchJson<GeocoderResponse>(url.toString());
  const matches = data.result?.addressMatches ?? [];
  if (matches.length === 0) {
    throw new UtilitiesDataError("LOCATION_NOT_FOUND", `We could not find "${cityInput}" in ${state.code}.`, { city: cityInput, state: state.code });
  }
  const counties = matches
    .map((match) => match.geographies?.Counties?.[0])
    .filter((county): county is NonNullable<typeof county> => Boolean(county && county.COUNTY && county.STATE === state.fips));
  const uniqueCodes = Array.from(new Set(counties.map((county) => county.COUNTY as string)));
  if (uniqueCodes.length === 0) {
    throw new UtilitiesDataError("LOCATION_NOT_FOUND", `We could not map "${cityInput}" to a county.`, { city: cityInput, state: state.code });
  }
  if (uniqueCodes.length > 1) {
    throw new UtilitiesDataError("LOCATION_AMBIGUOUS", `Multiple counties cover "${cityInput}". Pick a county for best results.`, {
      candidates: uniqueCodes,
    });
  }
  const county = await pickCountyByCode(state, `${state.fips}${uniqueCodes[0]}`);
  if (!county) {
    throw new UtilitiesDataError("LOCATION_NOT_FOUND", `County data missing for "${cityInput}".`, { city: cityInput, state: state.code });
  }
  return { ...county, state, type: "county" };
}

async function resolveAreaTarget(area: Area): Promise<ResolvedArea> {
  const state = await ensureStateMeta(area.state);
  if (area.county) {
    return resolveCounty(state, area.county);
  }
  if (area.city) {
    return resolvePlace(state, area.city);
  }
  throw new UtilitiesDataError("INVALID_INPUT", "Provide a county or city.");
}

async function applyHostThrottle(host: string) {
  const now = Date.now();
  const availableAt = hostSchedule.get(host) ?? now;
  const wait = Math.max(0, availableAt - now);
  if (wait > 0) {
    await new Promise((resolve) => setTimeout(resolve, wait));
  }
  const jitter = Math.floor(Math.random() * HOST_JITTER_MS);
  hostSchedule.set(host, Date.now() + HOST_MIN_INTERVAL_MS + jitter);
}

async function fetchJson<T>(url: string, init?: RequestInit & { timeoutMs?: number }): Promise<T> {
  const host = new URL(url).host;
  await applyHostThrottle(host);
  const controller = new AbortController();
  const timeoutMs = init?.timeoutMs ?? HOST_TIMEOUTS[host] ?? REQUEST_TIMEOUT_MS;
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      ...init,
      signal: controller.signal,
      cache: "no-store",
      headers: {
        accept: "application/json",
        ...init?.headers,
      },
    });
    if (res.status === 429) {
      throw new UtilitiesDataError("UPSTREAM_RATE_LIMIT", "Source temporarily rate limited.", { url });
    }
    if (!res.ok) {
      throw new UtilitiesDataError("UPSTREAM_ERROR", `Source responded with ${res.status}`, { url, status: res.status });
    }
    return (await res.json()) as T;
  } catch (error) {
    if (error instanceof UtilitiesDataError) throw error;
    if (error instanceof Error && error.name === "AbortError") {
      throw new UtilitiesDataError("UPSTREAM_ERROR", "Source took too long to respond.", { url });
    }
    throw new UtilitiesDataError("UPSTREAM_ERROR", "Source request failed.", { url, error: error instanceof Error ? error.message : String(error) });
  } finally {
    clearTimeout(timeout);
  }
}

function toNumber(value: string | undefined): number {
  if (!value) return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function computeWeightedMedian(total: number, buckets: Array<{ count: number; midpoint: number }>): number | null {
  if (!Number.isFinite(total) || total <= 0) return null;
  const midpoint = total / 2;
  let cumulative = 0;
  for (const bucket of buckets) {
    cumulative += bucket.count;
    if (cumulative >= midpoint) return bucket.midpoint;
  }
  const last = buckets[buckets.length - 1];
  return last ? last.midpoint : null;
}

function buildDistribution(
  row: Record<string, string>,
  totalVar: string,
  bucketDefs: ReadonlyArray<{ label: string; var: string; midpoint: number }>,
  divisor = 1,
): CostDistribution {
  const total = toNumber(row[totalVar]);
  const buckets = bucketDefs.map((bucket) => ({
    label: bucket.label,
    var: bucket.var,
    count: toNumber(row[bucket.var]),
  }));
  const median = computeWeightedMedian(
    total,
    bucketDefs.map((bucket) => ({ count: toNumber(row[bucket.var]), midpoint: bucket.midpoint / divisor })),
  );
  return {
    total,
    buckets,
    estTypicalMonthly: median,
  };
}

type CensusCostResponse = string[][];

function parseCensusRow(rows: CensusCostResponse): Record<string, string> {
  if (!Array.isArray(rows) || rows.length < 2) {
    throw new UtilitiesDataError("UPSTREAM_ERROR", "Census response missing rows.");
  }
  const header = rows[0];
  const first = rows[1];
  const record: Record<string, string> = {};
  header.forEach((key, index) => {
    record[key] = first[index];
  });
  return record;
}

async function fetchCostRow(resolved: ResolvedArea, vars: string[]): Promise<Record<string, string>> {
  const params = new URLSearchParams();
  params.set("get", ["NAME", ...vars].join(","));
  if (resolved.type === "county") {
    params.set("for", `county:${resolved.countyCode}`);
    params.set("in", `state:${resolved.state.fips}`);
  } else {
    params.set("for", `place:${resolved.placeCode}`);
    params.set("in", `state:${resolved.state.fips}`);
  }
  const url = `${CENSUS_BASE}/${CENSUS_DATASET}?${params.toString()}`;
  return parseCensusRow(await fetchJson<CensusCostResponse>(url));
}

export async function fetchCountyFIPS(area: Area): Promise<{ stateFips: string; countyFips: string }> {
  const county = await resolveCountyOnly(area);
  return { stateFips: county.state.fips, countyFips: county.countyFips };
}

export async function fetchPlaceCode(area: Area): Promise<{ stateFips: string; place: string } | null> {
  if (!area.city) return null;
  const state = await ensureStateMeta(area.state);
  const place = await resolvePlace(state, area.city);
  return { stateFips: place.state.fips, place: place.placeCode };
}

export async function getElectricityCosts(area: Area, resolved?: ResolvedArea): Promise<CostDistribution> {
  const target = resolved ?? (await resolveAreaTarget(area));
  const row = await fetchCostRow(target, ["B25132_001E", "B25132_005E", "B25132_006E", "B25132_007E", "B25132_008E", "B25132_009E"]);
  return buildDistribution(row, "B25132_001E", ELECTRIC_BUCKETS);
}

export async function getGasCosts(area: Area, resolved?: ResolvedArea): Promise<CostDistribution> {
  const target = resolved ?? (await resolveAreaTarget(area));
  const row = await fetchCostRow(target, ["B25133_001E", "B25133_005E", "B25133_006E", "B25133_007E", "B25133_008E", "B25133_009E"]);
  return buildDistribution(row, "B25133_001E", GAS_BUCKETS);
}

export async function getWaterSewerAnnualCosts(area: Area, resolved?: ResolvedArea): Promise<CostDistribution> {
  const target = resolved ?? (await resolveAreaTarget(area));
  const row = await fetchCostRow(target, ["B25134_001E", "B25134_003E", "B25134_004E", "B25134_005E", "B25134_006E", "B25134_007E"]);
  // Divide by 12 to convert representative values to monthly for the median only.
  return buildDistribution(row, "B25134_001E", WATER_BUCKETS, 12);
}

interface SdwCountyRecord {
  PWSID?: string;
  PWS_NAME?: string;
  POP_SERVED_COUNTY?: string;
  STATE?: string;
}

function expandCountyFipsVariants(countyFips5: string): { stateFips: string; countyCode3: string; countyFips5: string; countyFips6: string } {
  const stateFips = countyFips5.slice(0, 2);
  const countyCode3 = countyFips5.slice(2);
  const countyFips6 = `${stateFips}${countyCode3.padStart(4, "0")}`;
  return { stateFips, countyCode3, countyFips5, countyFips6 };
}

async function fetchWaterSystemsByCode(fips: string): Promise<SdwCountyRecord[]> {
  const url = `https://data.epa.gov/efservice/SDW_COUNTY_SERVED/FIPS_COUNTY_CODE/${fips}/JSON`;
  serviceLog.debug("sdwis request start", { fips, url });
  try {
    const rows = await fetchJson<SdwCountyRecord[]>(url);
    serviceLog.info("sdwis response received", { fips, rowCount: rows.length });
    return rows;
  } catch (error) {
    serviceLog.error("sdwis request failed", { fips, error: error instanceof Error ? error.message : String(error) });
    throw error;
  }
}

export async function getPublicWaterSystemsByCounty(
  countyFips5: string,
  stateFips: string,
): Promise<Array<{ systemName: string; populationServed?: number; pwsId?: string }>> {
  if (!/^\d{5}$/.test(countyFips5)) {
    throw new UtilitiesDataError("INVALID_INPUT", "County FIPS must include 5 digits.");
  }
  const { countyFips6 } = expandCountyFipsVariants(countyFips5);
  const variants = countyFips6 !== countyFips5 ? [countyFips5, countyFips6] : [countyFips5];

  serviceLog.info("sdwis lookup start", { countyFips5, variants });
  for (const fips of variants) {
    const rows = await fetchWaterSystemsByCode(fips);
    let filtered = rows;
    if (stateFips) {
      filtered = rows.filter((row) => {
        const stateField = (row.STATE ?? (row as any).state ?? "").trim();
        const pwsId = (row.PWSID ?? (row as any).pwsid ?? "").trim();
        const matchesState = stateField === stateFips;
        const matchesPrefix = pwsId.startsWith(stateFips);
        return matchesState || matchesPrefix;
      });
      if (filtered.length !== rows.length) {
        serviceLog.warn("sdwis state filter applied", {
          requestedCounty: countyFips5,
          stateFips,
          before: rows.length,
          after: filtered.length,
        });
      }
    }
    if (filtered.length > 0) {
      if (fips !== countyFips5) {
        serviceLog.info("sdwis fallback fips used", { requested: countyFips5, fallback: fips, rows: filtered.length });
      }
      return filtered.map((row) => ({
        systemName:
          (row.PWS_NAME ?? (row as any).pwsname ?? (row as any).PWSNAME ?? "").trim() || "Unnamed system",
        populationServed: (() => {
          const value = row.POP_SERVED_COUNTY ?? (row as any).populationserved ?? (row as any).POPULATIONSERVED ?? null;
          if (value === null || value === undefined) return undefined;
          const num = Number(value);
          return Number.isFinite(num) ? num : undefined;
        })(),
        pwsId: (row.PWSID ?? (row as any).pwsid ?? (row as any).PwsId ?? "").trim() || undefined,
      }));
    }
  }

  serviceLog.warn("sdwis returned no systems", { countyFips5, stateFips });
  return [];
}

interface ArcgisResponse {
  features?: Array<{ attributes?: Record<string, unknown> }>;
  exceededTransferLimit?: boolean;
}

async function fetchArcgisFeatures(url: string, params: Record<string, string>): Promise<Array<Record<string, unknown>>> {
  const results: Array<Record<string, unknown>> = [];
  let offset = 0;
  let more = true;
  while (more) {
    const body = new URLSearchParams({ ...params, resultOffset: String(offset) });
    const response = await fetchJson<ArcgisResponse>(url, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body,
    });
    const batch = response.features ?? [];
    batch.forEach((feature) => {
      if (feature.attributes) results.push(feature.attributes);
    });
    if (response.exceededTransferLimit) {
      offset += batch.length;
    } else {
      more = false;
    }
  }
  return results;
}

interface TigerCountyResponse {
  features?: Array<{
    attributes?: { GEOID?: string; NAME?: string };
    geometry?: unknown;
  }>;
}

async function fetchCountyGeometry(stateFips: string, countyCode: string) {
  const params = new URLSearchParams({
    where: `STATE='${stateFips}' AND COUNTY='${countyCode}'`,
    outFields: "GEOID,NAME",
    returnGeometry: "true",
    f: "json",
  });
  const json = await fetchJson<TigerCountyResponse>(
    `https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/State_County/MapServer/55/query?${params.toString()}`,
  );
  const feature = json.features?.[0];
  if (!feature || !feature.geometry) {
    throw new UtilitiesDataError("UPSTREAM_ERROR", "County geometry not available for electric lookup.");
  }
  return feature.geometry;
}

export async function getElectricUtilitiesByCounty(
  countyFips5: string,
  state2: string,
): Promise<Array<{ name: string; state: string; phone?: string; website?: string }>> {
  if (!/^\d{5}$/.test(countyFips5)) {
    throw new UtilitiesDataError("INVALID_INPUT", "County FIPS must include 5 digits.");
  }
  const state = await ensureStateMeta(state2);
  const countyCode = countyFips5.slice(2);
  const geometry = await fetchCountyGeometry(state.fips, countyCode);
  const params = {
    f: "json",
    where: `STATE='${state.code}'`,
    geometry: JSON.stringify(geometry),
    geometryType: "esriGeometryPolygon",
    spatialRel: "esriSpatialRelIntersects",
    outFields: "NAME,STATE,TELEPHONE,WEBSITE",
    returnGeometry: "false",
  };
  const attrs = await fetchArcgisFeatures(
    "https://services3.arcgis.com/OYP7N6mAJJCyH6hd/arcgis/rest/services/Electric_Retail_Service_Territories_HIFLD/FeatureServer/0/query",
    params,
  );
  return attrs.map((entry) => ({
    name: typeof entry.NAME === "string" ? entry.NAME : "Unknown utility",
    state: typeof entry.STATE === "string" ? entry.STATE : state.code,
    phone: typeof entry.TELEPHONE === "string" ? entry.TELEPHONE : undefined,
    website: typeof entry.WEBSITE === "string" ? entry.WEBSITE : undefined,
  }));
}

interface GasFeaturesResponse {
  features?: Array<{ attributes?: { name?: string; state?: string; telephone?: string; website?: string } }>;
}

export async function getGasLDCByCounty(
  countyFips5: string,
): Promise<Array<{ name: string; state: string; phone?: string; website?: string }>> {
  if (!/^\d{5}$/.test(countyFips5)) {
    throw new UtilitiesDataError("INVALID_INPUT", "County FIPS must include 5 digits.");
  }
  const { countyFips6 } = expandCountyFipsVariants(countyFips5);
  const params = new URLSearchParams({
    where: `countyfips IN ('${countyFips5}','${countyFips6}')`,
    outFields: "name,state,telephone,website",
    returnGeometry: "false",
    f: "json",
  });
  const queryUrl = `https://maps.nccs.nasa.gov/mapping/rest/services/hifld_open/energy/FeatureServer/29/query?${params.toString()}`;
  serviceLog.info("gas ldc query start", { countyFips5, countyFips6, url: queryUrl });
  const json = await fetchJson<GasFeaturesResponse>(
    queryUrl,
  );
  const rows = (json.features ?? []).map((feature) => ({
    name: feature.attributes?.name ?? "Unknown provider",
    state: feature.attributes?.state ?? "",
    phone: feature.attributes?.telephone ?? undefined,
    website: feature.attributes?.website ?? undefined,
  }));
  serviceLog.info("gas ldc query complete", { countyFips5, featureCount: rows.length });
  return rows;
}

export type ResolvedUtilitiesArea = {
  kind: "county" | "place";
  stateCode: string;
  stateName: string;
  stateFips: string;
  countyFips?: string;
  countyName?: string;
  placeCode?: string;
  placeName?: string;
};

function summarizeResolvedArea(resolved: ResolvedArea): ResolvedUtilitiesArea {
  if (resolved.type === "county") {
    return {
      kind: "county",
      stateCode: resolved.state.code,
      stateName: resolved.state.name,
      stateFips: resolved.state.fips,
      countyFips: resolved.countyFips,
      countyName: resolved.name,
    };
  }
  return {
    kind: "place",
    stateCode: resolved.state.code,
    stateName: resolved.state.name,
    stateFips: resolved.state.fips,
    placeCode: resolved.placeCode,
    placeName: resolved.name,
  };
}

export type UtilitiesAreaContext = { summary: ResolvedUtilitiesArea; resolved: ResolvedArea };

export async function resolveUtilitiesArea(area: Area): Promise<UtilitiesAreaContext> {
  const resolved = await resolveAreaTarget(area);
  return { resolved, summary: summarizeResolvedArea(resolved) };
}

export const __utilitiesTestHooks = {
  clearCaches: () => {
    countyCache.clear();
    placeCache.clear();
    hostSchedule.clear();
    statesByCode.clear();
    statesByName.clear();
    statesByFips.clear();
    statesLoaded = false;
  },
};
