import { z } from "zod";
import { zFips, zYear } from "@cl/types";

export const zQuery = z.object({
  fips: zFips,
  year: zYear,
});

export function buildHudFmrUrl(fips: string, year: number, base?: string): string {
  const endpoint = base?.trim() || process.env.HUD_FMR_URL ||
    "https://www.huduser.gov/hudapi/public/fmr/data"; // expects ?fips=NNNNN&year=YYYY
  const u = new URL(endpoint);
  u.searchParams.set("fips", fips);
  u.searchParams.set("year", String(year));
  return u.toString();
}

export function transformHudFmr(json: any): { areaName: string; br0: number; br1: number; br2: number; br3: number; br4: number } {
  // Accept a variety of shapes; prefer explicit keys; fallback to first record
  const record = (json && (json.fmr || json.data || json.result || json[0])) || json;
  const areaName = String(record.area_name || record.area || record.name || "");
  const br0 = Number(record.br0 || record.efficiency || record.bedroom0 || record.fmr0);
  const br1 = Number(record.br1 || record.one_bedroom || record.bedroom1 || record.fmr1);
  const br2 = Number(record.br2 || record.two_bedroom || record.bedroom2 || record.fmr2);
  const br3 = Number(record.br3 || record.three_bedroom || record.bedroom3 || record.fmr3);
  const br4 = Number(record.br4 || record.four_bedroom || record.bedroom4 || record.fmr4);
  return { areaName, br0, br1, br2, br3, br4 };
}
