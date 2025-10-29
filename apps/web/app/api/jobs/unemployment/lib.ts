import { z } from "zod";
import { zFips, zYear } from "@cl/types";

export const zQuery = z.object({
  countyFips: zFips,
  start: zYear,
  end: zYear,
}).refine((q) => q.start <= q.end, { message: "start must be <= end" });

export function toSeriesId(countyFips: string): string {
  // LAUCN{STATE2}{COUNTY3}0000000003 (county unemployment rate, NSA)
  const state = countyFips.slice(0, 2);
  const county = countyFips.slice(2, 5);
  return `LAUCN${state}${county}0000000003`;
}

export interface LausPoint { date: string; value: number }

export function normalizeBlsTimeseries(json: any, wantSeriesId: string): { seriesId: string; adjusted: false; points: LausPoint[] } {
  if (!json || typeof json !== "object") throw new Error("Invalid BLS response");
  if (json.status && json.status !== "REQUEST_SUCCEEDED") throw new Error("BLS error status");
  const results = json.Results || json.results || {};
  const series = Array.isArray(results.series) ? results.series : [];
  const found = series.find((s: any) => s.seriesID === wantSeriesId || s.seriesId === wantSeriesId) || series[0];
  if (!found) return { seriesId: wantSeriesId, adjusted: false, points: [] };
  const data = Array.isArray(found.data) ? found.data : [];

  const points: LausPoint[] = [];
  for (const d of data) {
    const period: string = d.period;
    if (!period || !period.startsWith("M")) continue; // skip annual averages (M13) and invalid
    const m = period.slice(1);
    if (m === "13") continue; // explicit skip annual avg
    const y = String(d.year);
    const v = Number(d.value);
    if (!y || Number.isNaN(v)) continue;
    const mm = m.padStart(2, "0");
    points.push({ date: `${y}-${mm}`, value: v });
  }
  // BLS returns newest first; sort ascending by date
  points.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  return { seriesId: wantSeriesId, adjusted: false as const, points };
}
