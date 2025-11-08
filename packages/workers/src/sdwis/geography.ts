import type { County, State } from "@cl/types";

export type StateMeta = Pick<State, "code" | "name" | "fips">;
export type CountyMeta = {
  name: string;
  normalized: string;
  countyFips: string;
  countyCode: string;
};

export interface StateIndex {
  byCode: Map<string, StateMeta>;
  byFips: Map<string, StateMeta>;
  byName: Map<string, StateMeta>;
}

export type CountyIndex = Map<string, CountyMeta[]>;

const ACCENT_REGEX = /[\u0300-\u036f]/g;
const COUNTY_SUFFIX_REGEX =
  /\b(county|parish|borough|city and borough|city|census area|municipality|township|town|plantation|municipio|district|reservation|nation)\b/g;

export function normalizeCountyLabel(value?: string | null): string {
  if (!value) return "";
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(ACCENT_REGEX, "")
    .replace(/&/g, " and ")
    .replace(/\bste[.]?\b/g, "sainte")
    .replace(/\bst[.]?\b/g, "saint")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(COUNTY_SUFFIX_REGEX, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function buildStateIndex(states: Array<State & { _id: string }>): StateIndex {
  const byCode = new Map<string, StateMeta>();
  const byFips = new Map<string, StateMeta>();
  const byName = new Map<string, StateMeta>();
  states.forEach((state) => {
    const meta: StateMeta = { code: state.code.toUpperCase(), name: state.name, fips: state.fips };
    byCode.set(meta.code, meta);
    byFips.set(meta.fips, meta);
    byName.set(state.name.toLowerCase(), meta);
  });
  return { byCode, byFips, byName };
}

export function buildCountyIndex(counties: Array<County & { _id: string }>): CountyIndex {
  const map: CountyIndex = new Map();
  counties.forEach((county) => {
    const normalized = normalizeCountyLabel(county.name);
    const entry: CountyMeta = {
      name: county.name,
      normalized,
      countyFips: county.fips,
      countyCode: county.fips.slice(2),
    };
    const key = county.stateCode.toUpperCase();
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(entry);
  });
  return map;
}

export function resolveStateMeta(input: string | undefined | null, index: StateIndex): StateMeta | null {
  const trimmed = input?.trim();
  if (!trimmed) return null;
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length === 2 && index.byFips.has(digits)) return index.byFips.get(digits)!;
  const upper = trimmed.toUpperCase();
  if (index.byCode.has(upper)) return index.byCode.get(upper)!;
  const lower = trimmed.toLowerCase();
  if (index.byName.has(lower)) return index.byName.get(lower)!;
  return null;
}

export function resolveCountyMeta(state: StateMeta, input: string | undefined | null, index: CountyIndex): CountyMeta | null {
  const normalized = normalizeCountyLabel(input);
  if (!normalized) return null;
  const options = index.get(state.code) ?? [];
  const exact = options.find((county) => county.normalized === normalized);
  if (exact) return exact;
  const contains = options.find((county) => county.normalized.includes(normalized) || normalized.includes(county.normalized));
  return contains ?? null;
}
