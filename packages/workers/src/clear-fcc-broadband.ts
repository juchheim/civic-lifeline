#!/usr/bin/env tsx
import { getDb } from "@cl/db";
import { createLogger } from "@cl/utils";

const log = createLogger("worker:clear-fcc");

async function main() {
  const dbName = process.env.CLEAR_DB_NAME ?? "cl";
  log.info("connecting to database", { dbName });
  const db = await getDb(dbName);
  const collection = db.collection("fccBroadband");
  
  log.info("counting documents before deletion");
  const countBefore = await collection.countDocuments();
  log.info("found documents", { count: countBefore });
  
  if (countBefore === 0) {
    log.info("collection is already empty");
    process.exit(0);
  }
  
  log.info("deleting all documents");
  const result = await collection.deleteMany({});
  
  log.info("deletion complete", {
    deletedCount: result.deletedCount,
    acknowledged: result.acknowledged,
  });
  
  const countAfter = await collection.countDocuments();
  log.info("verification", { countAfter });
  
  if (countAfter !== 0) {
    log.warn("warning: collection still has documents", { countAfter });
  } else {
    log.info("collection cleared successfully");
  }
}

main().catch((err) => {
  console.error("clear-fcc-broadband failed", err);
  process.exit(1);
});

