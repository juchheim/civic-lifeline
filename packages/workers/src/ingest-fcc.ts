#!/usr/bin/env node
import { pipeline } from "node:stream";
import { createWriteStream, createReadStream } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parse } from "csv-parse";
import { request } from "undici";
import { getFccBroadbandCollection } from "@cl/db";
import { createLogger } from "@cl/utils";

const log = createLogger("worker:fcc");

interface Args { state: string; asOf: string; url?: string }

function parseArgs(): Args {
  const args = process.argv.slice(2);
  const out: Partial<Args> = {};
  for (const a of args) {
    const m = a.match(/^--([^=]+)=(.+)$/);
    if (m) {
      const key = m[1];
      const val = m[2];
      if (key === "state") out.state = val;
      else if (key === "asOf") out.asOf = val;
      else if (key === "url") out.url = val;
    }
  }
  if (!out.state) throw new Error("--state=MS required");
  if (!out.asOf) throw new Error("--asOf=YYYY-MM-DD required");
  return out as Args;
}

function yyyymm(asOf: string): string {
  return asOf.replaceAll("-", "").slice(0, 6);
}

function buildUrl(args: Args): string {
  if (args.url) return args.url;
  const tpl = process.env.FCC_CSV_URL_TEMPLATE; // e.g., https://.../{YYYYMM}/{STATE}.csv
  if (!tpl) throw new Error("FCC_CSV_URL_TEMPLATE env required or pass --url");
  const ym = yyyymm(args.asOf);
  return tpl.replaceAll("{YYYYMM}", ym).replaceAll("{STATE}", args.state);
}

async function main() {
  const startAt = Date.now();
  const args = parseArgs();
  const url = buildUrl(args);
  log.info("start", { url, state: args.state, asOf: args.asOf });

  // Download to temp file via stream
  const ym = yyyymm(args.asOf);
  const tmpPath = join(tmpdir(), `fcc_${args.state}_${ym}.csv`);
  const res = await request(url);
  if (res.statusCode !== 200) throw new Error(`download failed: ${res.statusCode}`);
  const size = Number(res.headers["content-length"] || 0);
  await new Promise<void>((resolve, reject) =>
    pipeline(res.body as unknown as NodeJS.ReadableStream, createWriteStream(tmpPath), (err) => (err ? reject(err) : resolve())),
  );
  log.info("downloaded", { bytes: size, tmpPath });

  // Stream parse and aggregate by county fips
  const providerByCounty = new Map<string, Set<string>>();
  const speedByCounty = new Map<string, { s25_3: boolean; s100_20: boolean; s1000_100: boolean }>();
  const techByCounty = new Map<string, Set<string>>();

  let rows = 0;
  const parser = createReadStream(tmpPath).pipe(
    parse({ columns: true, relax_column_count: true, bom: true, skip_empty_lines: true })
  ) as unknown as AsyncIterable<Record<string, string>>;

  for await (const rec of parser) {
    rows++;
    // Defensive column access
    const fips = (rec["county_fips"] || rec["county"] || rec["FIPS"] || rec["fips"] || "").toString().padStart(5, "0");
    if (!/^\d{5}$/.test(fips)) continue;
    const provId = (rec["provider_id"] || rec["provider"] || rec["FRN"] || rec["frn"] || rec["provider_name"])?.toString() || String(rows);

    const down = Number(rec["max_advertised_down"] || rec["down"] || rec["max_down"] || NaN);
    const up = Number(rec["max_advertised_up"] || rec["up"] || rec["max_up"] || NaN);
    const s25_3 = Number.isFinite(down) && Number.isFinite(up) ? down >= 25 && up >= 3 : Boolean(rec["25_3"] || rec["tier_25_3"]);
    const s100_20 = Number.isFinite(down) && Number.isFinite(up) ? down >= 100 && up >= 20 : Boolean(rec["100_20"] || rec["tier_100_20"]);
    const s1000_100 = Number.isFinite(down) && Number.isFinite(up) ? down >= 1000 && up >= 100 : Boolean(rec["1000_100"] || rec["gigabit"]);

    const techRaw = (rec["technology"] || rec["tech"] || rec["technology_code"] || "").toString();
    const techName = mapTech(techRaw);

    if (!providerByCounty.has(fips)) providerByCounty.set(fips, new Set());
    providerByCounty.get(fips)!.add(provId);

    if (!speedByCounty.has(fips)) speedByCounty.set(fips, { s25_3: false, s100_20: false, s1000_100: false });
    const agg = speedByCounty.get(fips)!;
    agg.s25_3 = agg.s25_3 || s25_3;
    agg.s100_20 = agg.s100_20 || s100_20;
    agg.s1000_100 = agg.s1000_100 || s1000_100;

    if (!techByCounty.has(fips)) techByCounty.set(fips, new Set());
    if (techName) techByCounty.get(fips)!.add(techName);
  }

  // Upsert into Mongo
  const col = await getFccBroadbandCollection();
  const asOf = args.asOf;
  let upserts = 0;
  for (const [fips, providers] of providerByCounty.entries()) {
    const speeds = speedByCounty.get(fips) ?? { s25_3: false, s100_20: false, s1000_100: false };
    const tech = Array.from(techByCounty.get(fips) ?? new Set<string>());
    const doc = {
      _id: `${fips}:${asOf}`,
      geoType: "county" as const,
      fips,
      asOf,
      providerCount: providers.size,
      speed: { "25_3": speeds.s25_3, "100_20": speeds.s100_20, "1000_100": speeds.s1000_100 },
      tech,
      source: "FCC NBM CSV" as const,
      sourceUrl: process.env.FCC_CSV_URL_TEMPLATE || "",
      fetchedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await col.updateOne({ _id: doc._id }, { $set: doc }, { upsert: true });
    upserts++;
  }

  const durMs = Date.now() - startAt;
  log.info("done", { rows, upserts, bytes: size || null, ms: durMs });
}

function mapTech(s: string): string | undefined {
  const t = s.toLowerCase();
  if (!t) return undefined;
  if (/(fiber|ftth|pon)/.test(t)) return "Fiber";
  if (/(cable|coax)/.test(t)) return "Cable";
  if (/(dsl)/.test(t)) return "DSL";
  if (/(fixed|wireless)/.test(t)) return "Fixed Wireless";
  if (/(satellite)/.test(t)) return "Satellite";
  return s || undefined;
}

main().catch((err) => {
  console.error("ingest-fcc failed", err);
  process.exit(1);
});
