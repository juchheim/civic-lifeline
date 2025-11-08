import type { County, PublicWaterSystem, State } from "@cl/types";
import { buildCountyIndex, buildStateIndex, CountyIndex, resolveCountyMeta, resolveStateMeta, StateIndex } from "./geography";

export const SDWIS_SOURCE = "EPA SDWIS SDW_COUNTY_SERVED";
export const SDWIS_SOURCE_URL = "https://data.epa.gov/efservice/SDW_COUNTY_SERVED";

export interface RawSdwisRecord {
  pwsid?: string | null;
  pwsname?: string | null;
  regulatingagencyname?: string | null;
  state?: string | null;
  populationserved?: string | null;
  contact?: string | null;
  contactphone?: string | null;
  countyserved?: string | null;
}

export interface TransformContext {
  stateIndex: StateIndex;
  countyIndex: CountyIndex;
}

export interface TransformOutcome {
  document?: Omit<PublicWaterSystem, "createdAt" | "updatedAt" | "fetchedAt" | "ingestRunId">;
  reason?: "missing-pwsid" | "state-unmapped" | "county-unmapped";
}

export function buildTransformContext(states: Array<State & { _id: string }>, counties: Array<County & { _id: string }>): TransformContext {
  return {
    stateIndex: buildStateIndex(states),
    countyIndex: buildCountyIndex(counties),
  };
}

export function mapSdwisRecord(raw: RawSdwisRecord, ctx: TransformContext): TransformOutcome {
  const rawPwsId = raw.pwsid?.trim();
  if (!rawPwsId) return { reason: "missing-pwsid" };

  const state = resolveStateMeta(raw.state, ctx.stateIndex);
  if (!state) return { reason: "state-unmapped" };

  const county = resolveCountyMeta(state, raw.countyserved, ctx.countyIndex);
  if (!county) return { reason: "county-unmapped" };

  const populationServed = parsePopulation(raw.populationserved);
  const contactName = sanitizeText(raw.contact);
  const contactPhone = sanitizePhone(raw.contactphone);
  const contact =
    contactName || contactPhone
      ? {
          name: contactName || undefined,
          phone: contactPhone || undefined,
        }
      : undefined;

  const document: Omit<PublicWaterSystem, "createdAt" | "updatedAt" | "fetchedAt" | "ingestRunId"> = {
    _id: `${rawPwsId}:${county.countyFips}`,
    pwsId: rawPwsId,
    systemName: sanitizeSystemName(raw.pwsname),
    countyFips: county.countyFips,
    countyName: county.name,
    stateCode: state.code,
    stateFips: state.fips,
    populationServed,
    contact,
    source: SDWIS_SOURCE,
    sourceUrl: SDWIS_SOURCE_URL,
  };

  return { document };
}

function parsePopulation(value?: string | null): number | null {
  if (!value) return null;
  const digits = Number(value.replace(/,/g, ""));
  return Number.isFinite(digits) ? digits : null;
}

function sanitizeText(value?: string | null): string {
  if (!value) return "";
  return value.toString().trim();
}

function sanitizeSystemName(value?: string | null): string {
  const trimmed = sanitizeText(value);
  if (trimmed) return trimmed;
  return "Unnamed system";
}

function sanitizePhone(value?: string | null): string {
  if (!value) return "";
  const digits = value.replace(/\D/g, "");
  if (digits.length === 10) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return value.trim();
}
