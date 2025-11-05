import fs from "node:fs/promises";
import path from "node:path";
import { createLogger } from "@/lib/logger";

/**
 * Static FMR loader used while HUD's API is offline and the ArcGIS mirror is unavailable.
 * See docs/hud-fmr-static.md for setup details and the expected JSON schema.
 */

const log = createLogger("api/housing/fmr/static");

export interface StaticFmrRecord {
  fips: string;
  year: number;
  areaName: string;
  br0: number;
  br1: number;
  br2: number;
  br3: number;
  br4: number;
}

type StaticCache = {
  path: string;
  records: Map<string, Map<number, StaticFmrRecord>>;
  mtimeMs: number;
};

const DEFAULT_STATIC_PATH = path.join(process.cwd(), "apps/web/data/fmr/fy2024-sample.json");
let cache: StaticCache | null = null;

async function buildCache(filePath: string): Promise<StaticCache> {
  const stat = await fs.stat(filePath);
  const raw = await fs.readFile(filePath, "utf8");
  const parsed = JSON.parse(raw) as StaticFmrRecord[];
  const records = new Map<string, Map<number, StaticFmrRecord>>();
  for (const record of parsed) {
    if (!record?.fips || !record?.year) continue;
    const fips = record.fips.padStart(5, "0");
    if (!records.has(fips)) records.set(fips, new Map());
    records.get(fips)!.set(record.year, {
      ...record,
      fips,
      year: Number(record.year),
      br0: Number(record.br0),
      br1: Number(record.br1),
      br2: Number(record.br2),
      br3: Number(record.br3),
      br4: Number(record.br4),
    });
  }
  log.info("static fmr dataset loaded", { filePath, entries: parsed.length });
  return { path: filePath, records, mtimeMs: stat.mtimeMs };
}

async function getCache(): Promise<StaticCache | null> {
  const filePath = process.env.HUD_FMR_STATIC_PATH?.trim() || DEFAULT_STATIC_PATH;
  try {
    if (cache && cache.path === filePath) {
      const stat = await fs.stat(filePath);
      if (stat.mtimeMs === cache.mtimeMs) return cache;
    }
  } catch (error) {
    log.warn("static fmr cache stat failed", { filePath, error: error instanceof Error ? error.message : String(error) });
    cache = null;
  }

  try {
    cache = await buildCache(filePath);
    return cache;
  } catch (error) {
    log.warn("static fmr dataset unavailable", { filePath, error: error instanceof Error ? error.message : String(error) });
    cache = null;
    return null;
  }
}

export async function lookupStaticFmr(fips: string, year: number): Promise<StaticFmrRecord | null> {
  const normalizedFips = fips.padStart(5, "0");
  const dataset = await getCache();
  if (!dataset) return null;
  const byFips = dataset.records.get(normalizedFips);
  if (!byFips) return null;
  return byFips.get(year) ?? null;
}
