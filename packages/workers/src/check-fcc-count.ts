#!/usr/bin/env tsx
import { getFccBroadbandCollection } from "@cl/db";
import { createLogger } from "@cl/utils";

const log = createLogger("worker:check-fcc");

async function main() {
  const collection = await getFccBroadbandCollection();
  const count = await collection.countDocuments();
  log.info("fccBroadband collection count", { count });
  process.exit(0);
}

main().catch((err) => {
  console.error("check-fcc-count failed", err);
  process.exit(1);
});

