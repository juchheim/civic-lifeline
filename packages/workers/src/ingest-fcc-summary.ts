#!/usr/bin/env tsx
import { createReadStream } from "node:fs";
import { resolve } from "node:path";
import { parse } from "csv-parse";
import { getFccBroadbandCollection } from "@cl/db";
import { createLogger } from "@cl/utils";

const log = createLogger("worker:fcc-summary");

interface Args {
  file: string;
  asOf: string;
}

function parseArgs(): Args {
  const args = process.argv.slice(2);
  const out: Partial<Args> = {};
  for (const arg of args) {
    const match = arg.match(/^--([^=]+)=(.+)$/);
    if (!match) continue;
    const [, key, value] = match;
    if (key === "file") out.file = value;
    else if (key === "asOf") out.asOf = value;
  }

  if (!out.file) {
    const envFile = process.env.FCC_SUMMARY_CSV_PATH;
    if (envFile) out.file = envFile;
  }

  if (!out.file) throw new Error("Missing required --file=/path/to/csv argument (or set FCC_SUMMARY_CSV_PATH).");
  if (!out.asOf) throw new Error("Missing required --asOf=YYYY-MM-DD argument.");
  return out as Args;
}

function toPercent(value: string | number | undefined): number | null {
  if (value == null) return null;
  const num = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(num)) return null;
  return Number((num * 100).toFixed(1));
}

type BizKey = "residential" | "business";
function bizKey(bizRes: string): BizKey {
  return bizRes === "B" ? "business" : "residential";
}

interface CountyRecord {
  fips: string;
  stateFips: string;
  countyName?: string;
  stateName?: string;
  totalUnits: Partial<Record<BizKey, number>>;
  coverage: Partial<
    Record<
      BizKey,
      {
        "25_3": number | null;
        "100_20": number | null;
        "1000_100": number | null;
      }
    >
  >;
  coverageByTechnology: Partial<
    Record<
      BizKey,
      Map<
        string,
        {
          "25_3": number | null;
          "100_20": number | null;
          "1000_100": number | null;
        }
      >
    >
  >;
}

function ensureCounty(map: Map<string, CountyRecord>, fips: string): CountyRecord {
  let entry = map.get(fips);
  if (!entry) {
    entry = {
      fips,
      stateFips: fips.slice(0, 2),
      totalUnits: {},
      coverage: {},
      coverageByTechnology: {},
    };
    map.set(fips, entry);
  }
  return entry;
}

function recordCoverage(
  county: CountyRecord,
  biz: BizKey,
  techName: string,
  values: { "25_3": number | null; "100_20": number | null; "1000_100": number | null },
) {
  if (!county.coverageByTechnology[biz]) county.coverageByTechnology[biz] = new Map();
  county.coverageByTechnology[biz]!.set(techName, values);
}

const AGGREGATE_TECH = new Set(["Any Technology", "All Wired", "Any Terrestrial", "All Wired and Licensed Fixed Wireless"]);

async function main() {
  const args = parseArgs();
  const absolutePath = resolve(args.file);
  const startTime = Date.now();
  log.info("loading csv", { file: absolutePath, asOf: args.asOf });

  const counties = new Map<string, CountyRecord>();
  let rows = 0;
  let processed = 0;

  // Set up periodic status logging every 30 seconds
  const statusInterval = setInterval(() => {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    const rowsPerSec = rows > 0 ? (rows / ((Date.now() - startTime) / 1000)).toFixed(0) : "0";
    log.info("progress", {
      rows,
      processed,
      counties: counties.size,
      elapsedSeconds: elapsed,
      rowsPerSecond: rowsPerSec,
    });
  }, 30000);

  const stream = createReadStream(absolutePath).pipe(
    parse({
      columns: true,
      skip_empty_lines: true,
      bom: true,
      trim: true,
    }),
  );

  for await (const record of stream as AsyncIterable<Record<string, string>>) {
    rows += 1;
    const geographyType = record.geography_type;
    if (geographyType !== "County") continue;

    const fips = record.geography_id?.padStart(5, "0");
    if (!fips || !/^\d{5}$/.test(fips)) continue;

    const biz = bizKey(record.biz_res);
    const techName = record.technology;
    const countyName = record.geography_desc ?? undefined;
    const countyFull = record.geography_desc_full ?? undefined;

    const county = ensureCounty(counties, fips);
    if (countyName && !county.countyName) county.countyName = countyName;
    if (countyFull && !county.stateName) {
      const parts = countyFull.split(",").map((s) => s.trim());
      if (parts.length > 1) county.stateName = parts[parts.length - 1];
    }

    const coverageEntry = {
      "25_3": toPercent(record.speed_25_3),
      "100_20": toPercent(record.speed_100_20),
      "1000_100": toPercent(record.speed_1000_100),
    };

    if (techName === "Any Technology") {
      const totalUnits = Number(record.total_units ?? 0);
      if (Number.isFinite(totalUnits)) county.totalUnits[biz] = totalUnits;
      county.coverage[biz] = coverageEntry;
      recordCoverage(county, biz, techName, coverageEntry);
      processed += 1;
      continue;
    }

    if (techName && techName.includes("Satellite")) continue;

    recordCoverage(county, biz, techName, coverageEntry);
  }

  clearInterval(statusInterval);
  const parseElapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  log.info("parsed csv", { rows, counties: counties.size, elapsedSeconds: parseElapsed });

  const collection = await getFccBroadbandCollection();
  const now = new Date().toISOString();
  let upserts = 0;
  const dbStartTime = Date.now();

  // Set up periodic status logging for database phase
  const dbStatusInterval = setInterval(() => {
    const elapsed = ((Date.now() - dbStartTime) / 1000).toFixed(1);
    const remaining = counties.size - upserts;
    log.info("db progress", {
      upserts,
      total: counties.size,
      remaining,
      elapsedSeconds: elapsed,
    });
  }, 30000);

  for (const county of counties.values()) {
    const docId = `${county.fips}:${args.asOf}`;

    const pickCoverage = (biz: BizKey) => {
      const map = county.coverageByTechnology[biz];
      if (!map || map.size === 0) return county.coverage[biz] ?? undefined;
      const priority = ["All Wired and Licensed Fixed Wireless", "All Wired", "Any Terrestrial", "Any Technology"];
      for (const key of priority) {
        const entry = map.get(key);
        if (entry) return entry;
      }
      const result = map.values().next().value ?? county.coverage[biz];
      return result ?? undefined;
    };

    const residentialCoverage = pickCoverage("residential");

    const formatTechEntries = (biz: BizKey) => {
      const map = county.coverageByTechnology[biz];
      if (!map) return undefined;
      const entries = Array.from(map.entries())
        .filter(([name, entry]) => !AGGREGATE_TECH.has(name) && entry["25_3"] !== null && entry["25_3"]! > 0)
        .sort((a, b) => {
          const aVal = (a[1]["25_3"] ?? 0);
          const bVal = (b[1]["25_3"] ?? 0);
          return bVal - aVal;
        })
        .slice(0, 6)
        .map(([name, entry]) => ({
          name,
          coverage: entry["25_3"] ?? 0,
        }));
      return entries.length > 0 ? entries : undefined;
    };

    const residentialTech = formatTechEntries("residential");
    const businessTech = formatTechEntries("business");
    const technologies =
      residentialTech || businessTech
        ? {
            residential: residentialTech,
            business: businessTech,
          }
        : undefined;

    const doc = {
      _id: docId,
      geoType: "county" as const,
      fips: county.fips,
      stateFips: county.fips.slice(0, 2),
      asOf: args.asOf,
      countyName: county.countyName,
      stateName: county.stateName,
      totalUnits: county.totalUnits,
      coverage: {
        residential: residentialCoverage,
        business: pickCoverage("business"),
      },
      technologies,
      source: "FCC NBM Summary CSV" as const,
      sourceUrl: "https://broadbandmap.fcc.gov/data-download",
      fetchedAt: now,
      createdAt: now,
      updatedAt: now,
    };

    await collection.updateOne({ _id: doc._id }, { $set: doc }, { upsert: true });
    upserts += 1;
  }

  clearInterval(dbStatusInterval);
  const totalElapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  const dbElapsed = ((Date.now() - dbStartTime) / 1000).toFixed(1);
  log.info("ingest complete", {
    counties: counties.size,
    upserts,
    totalElapsedSeconds: totalElapsed,
    dbElapsedSeconds: dbElapsed,
  });
}

main().catch((err) => {
  console.error("ingest-fcc-summary failed", err);
  process.exit(1);
});
