#!/usr/bin/env tsx
import { getDb } from "@cl/db";
import { createLogger } from "@cl/utils";

const log = createLogger("worker:check-dbs");

async function main() {
  const clDb = await getDb("cl");
  const civicLifelineDb = await getDb("civic_lifeline");
  
  const clCollection = clDb.collection("fccBroadband");
  const civicLifelineCollection = civicLifelineDb.collection("fccBroadband");
  
  const clCount = await clCollection.countDocuments();
  const civicLifelineCount = await civicLifelineCollection.countDocuments();
  
  log.info("database counts", {
    "cl.fccBroadband": clCount,
    "civic_lifeline.fccBroadband": civicLifelineCount,
  });
  
  if (clCount > 0) {
    log.warn("warning: cl.fccBroadband still has documents", { count: clCount });
  }
  
  if (civicLifelineCount === 3232) {
    log.info("✓ civic_lifeline.fccBroadband has correct count");
  } else {
    log.warn("warning: civic_lifeline.fccBroadband count mismatch", {
      expected: 3232,
      actual: civicLifelineCount,
    });
  }
}

main().catch((err) => {
  console.error("check-both-dbs failed", err);
  process.exit(1);
});

