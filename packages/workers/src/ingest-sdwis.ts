#!/usr/bin/env node
import { config } from "dotenv";
import { resolve } from "path";
import { randomUUID } from "node:crypto";
import type { Collection, AnyBulkWriteOperation } from "mongodb";
import { getCountiesCollection, getPublicWaterSystemsCollection, getStatesCollection } from "@cl/db";
import type { PublicWaterSystem, County, State } from "@cl/types";
import { createLogger } from "@cl/utils";
import { buildTransformContext, mapSdwisRecord, RawSdwisRecord, SDWIS_SOURCE_URL } from "./sdwis/transform";

config({ path: resolve(process.cwd(), ".env") });

const log = createLogger("worker:sdwis");
const BASE_URL = process.env.SDWIS_BASE_URL ?? SDWIS_SOURCE_URL;
const PAGE_SIZE = Number(process.env.SDWIS_PAGE_SIZE ?? "1000");
const MAX_ROWS = Number(process.env.SDWIS_MAX_ROWS ?? "500000");
const FETCH_RETRIES = 3;

async function fetchJson<T>(url: string, attempt = 1): Promise<T> {
  const res = await fetch(url, { headers: { accept: "application/json" } }).catch((error) => {
    log.warn("fetch failed", { url, attempt, error: error instanceof Error ? error.message : String(error) });
    return null;
  });
  if (!res) {
    if (attempt >= FETCH_RETRIES) throw new Error(`fetch failed after ${attempt} attempts: ${url}`);
    await new Promise((resolveRetry) => setTimeout(resolveRetry, 500 * attempt));
    return fetchJson<T>(url, attempt + 1);
  }
  if (!res.ok) {
    const body = await res.text();
    log.warn("fetch non-200", { url, status: res.status, body });
    if (attempt >= FETCH_RETRIES) throw new Error(`fetch returned ${res.status}: ${url}`);
    await new Promise((resolveRetry) => setTimeout(resolveRetry, 500 * attempt));
    return fetchJson<T>(url, attempt + 1);
  }
  return (await res.json()) as T;
}

async function fetchTotalRows(): Promise<number> {
  const url = `${BASE_URL}/count/JSON`;
  const payload = await fetchJson<Array<{ TOTALQUERYRESULTS: number }>>(url);
  const total = payload?.[0]?.TOTALQUERYRESULTS ?? 0;
  return Number.isFinite(total) ? total : 0;
}

async function fetchBatch(start: number, limit: number): Promise<RawSdwisRecord[]> {
  const end = Math.min(start + limit - 1, MAX_ROWS);
  const url = `${BASE_URL}/rows/${start}:${end}/JSON`;
  return fetchJson<RawSdwisRecord[]>(url);
}

async function ensureIndexes(collection: Collection<PublicWaterSystem>) {
  await collection.createIndex({ pwsId: 1, countyFips: 1 }, { name: "pws_county", unique: true });
  await collection.createIndex({ countyFips: 1, populationServed: -1 }, { name: "county_population" });
  await collection.createIndex({ stateCode: 1, populationServed: -1 }, { name: "state_population" });
}

type SkipCounters = {
  "missing-pwsid": number;
  "state-unmapped": number;
  "county-unmapped": number;
};

function buildBulkOperations(
  records: RawSdwisRecord[],
  timestamp: string,
  ingestRunId: string,
  context: ReturnType<typeof buildTransformContext>,
): { operations: Array<AnyBulkWriteOperation<PublicWaterSystem>>; skipped: SkipCounters } {
  const operations: Array<AnyBulkWriteOperation<PublicWaterSystem>> = [];
  const skipped: SkipCounters = {
    "missing-pwsid": 0,
    "state-unmapped": 0,
    "county-unmapped": 0,
  };
  for (const record of records) {
    const outcome = mapSdwisRecord(record, context);
    if (!outcome.document) {
      if (outcome.reason) skipped[outcome.reason]++;
      continue;
    }
    const doc = {
      ...outcome.document,
      fetchedAt: timestamp,
      updatedAt: timestamp,
      ingestRunId,
    };
    operations.push({
      updateOne: {
        filter: { _id: doc._id },
        update: {
          $set: doc,
          $setOnInsert: { createdAt: timestamp },
        },
        upsert: true,
      },
    });
  }
  return { operations, skipped };
}

async function loadReferenceData() {
  const [statesCollection, countiesCollection] = await Promise.all([getStatesCollection(), getCountiesCollection()]);
  const [states, counties] = await Promise.all([
    statesCollection.find().toArray(),
    countiesCollection.find().toArray(),
  ]);
  return { states, counties };
}

async function main() {
  const startMs = Date.now();
  const ingestRunId = randomUUID();
  log.info("sdwis ingestion start", { ingestRunId, pageSize: PAGE_SIZE });

  const [reference, collection] = await Promise.all([loadReferenceData(), getPublicWaterSystemsCollection()]);
  await ensureIndexes(collection);
  const context = buildTransformContext(reference.states as Array<State & { _id: string }>, reference.counties as Array<County & { _id: string }>);
  const totalRows = await fetchTotalRows();
  log.info("sdwis total rows reported", { totalRows });

  let processed = 0;
  let touchedDocs = 0;
  const skippedTotals: SkipCounters = {
    "missing-pwsid": 0,
    "state-unmapped": 0,
    "county-unmapped": 0,
  };

  for (let offset = 0; offset < totalRows && offset < MAX_ROWS; offset += PAGE_SIZE) {
    const rows = await fetchBatch(offset, PAGE_SIZE);
    if (!rows || rows.length === 0) {
      log.info("no additional rows returned", { offset });
      break;
    }
    const timestamp = new Date().toISOString();
    const { operations, skipped } = buildBulkOperations(rows, timestamp, ingestRunId, context);
    skippedTotals["missing-pwsid"] += skipped["missing-pwsid"];
    skippedTotals["state-unmapped"] += skipped["state-unmapped"];
    skippedTotals["county-unmapped"] += skipped["county-unmapped"];
    if (operations.length > 0) {
      const result = await collection.bulkWrite(operations, { ordered: false });
      const updated = (result.upsertedCount ?? 0) + (result.modifiedCount ?? 0);
      touchedDocs += updated;
    }
    processed += rows.length;
    log.info("batch processed", {
      offset,
      batch: rows.length,
      processed,
      touchedDocs,
      skipped: skippedTotals,
      progress: totalRows ? Number((processed / totalRows) * 100).toFixed(2) : undefined,
    });
  }

  if (touchedDocs > 0) {
    const prune = await collection.deleteMany({ ingestRunId: { $ne: ingestRunId } });
    log.info("pruned stale documents", { deleted: prune.deletedCount });
  } else {
    log.warn("no documents ingested; skipping cleanup to preserve prior data");
  }

  log.info("sdwis ingestion complete", { processed, touchedDocs, skipped: skippedTotals, ms: Date.now() - startMs });
}

main().catch((error) => {
  log.error("sdwis ingestion failed", { error: error instanceof Error ? error.message : String(error) });
  process.exit(1);
});
