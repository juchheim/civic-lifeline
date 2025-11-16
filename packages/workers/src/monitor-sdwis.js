#!/usr/bin/env node
// Monitor SDWIS ingestion progress with JSON parsing
import { spawn } from "child_process";

const LOG_FILE = process.env.LOG_FILE || "/tmp/sdwis-ingest.log";

console.log("Monitoring SDWIS ingestion...");
console.log(`Log file: ${LOG_FILE}`);
console.log("Press Ctrl+C to stop monitoring (ingestion will continue)\n");

let buffer = "";

const tail = spawn("tail", ["-f", LOG_FILE]);

tail.stdout.on("data", (data) => {
  buffer += data.toString();
  const lines = buffer.split("\n");
  buffer = lines.pop() || ""; // Keep incomplete line in buffer

  for (const line of lines) {
    if (!line.trim()) continue;

    try {
      // Try to parse as JSON log line
      // Format: [worker:sdwis] message { json }
      const match = line.match(/^\[worker:sdwis\]\s+(\w+)\s+(.+)$/);
      if (!match) continue;

      const [, level, rest] = match;
      const jsonMatch = rest.match(/^(.+?)\s+(\{.+\})$/);
      if (!jsonMatch) continue;

      const [, message, jsonStr] = jsonMatch;
      const data = JSON.parse(jsonStr);

      if (message === "progress update") {
        const percent = data.percent || "0.00%";
        const processed = data.processed || 0;
        const total = data.totalRows || 0;
        const elapsed = data.elapsedSeconds || "0";
        const failed = data.failedBatches || 0;
        const touched = data.touchedDocs || 0;
        const time = new Date().toLocaleTimeString();
        console.log(
          `[${time}] ${percent} complete | Processed: ${processed.toLocaleString()}/${total.toLocaleString()} | Docs: ${touched.toLocaleString()} | Failed batches: ${failed} | Elapsed: ${elapsed}s`
        );
      } else if (message === "batch processed") {
        const progress = data.progress ? `${data.progress}%` : "N/A";
        const offset = data.offset || 0;
        const batch = data.batch || 0;
        // Only show every 10th batch to reduce noise
        if (offset % 10000 === 0) {
          console.log(`  Batch ${offset.toLocaleString()} (${batch} rows) - ${progress}`);
        }
      } else if (message.includes("ingestion")) {
        if (message.includes("start")) {
          console.log(`\n🚀 Ingestion started: ${data.ingestRunId}`);
          console.log(`   Total rows: ${data.totalRows?.toLocaleString() || "unknown"}`);
        } else if (message.includes("complete")) {
          const percent = data.percentComplete || "0.00%";
          const processed = data.processed || 0;
          const touched = data.touchedDocs || 0;
          const failed = data.failedBatches || 0;
          const ms = data.ms || 0;
          const minutes = Math.floor(ms / 60000);
          const seconds = Math.floor((ms % 60000) / 1000);
          console.log(`\n✅ Ingestion complete!`);
          console.log(`   Progress: ${percent} (${processed.toLocaleString()} rows)`);
          console.log(`   Documents: ${touched.toLocaleString()}`);
          console.log(`   Failed batches: ${failed}`);
          console.log(`   Duration: ${minutes}m ${seconds}s`);
          process.exit(0);
        } else if (message.includes("failed")) {
          console.log(`\n❌ Ingestion failed: ${data.error || "unknown error"}`);
          process.exit(1);
        }
      }
    } catch (err) {
      // Not a JSON log line, skip
    }
  }
});

tail.stderr.on("data", (data) => {
  process.stderr.write(data);
});

tail.on("close", (code) => {
  console.log(`\nTail process exited with code ${code}`);
  process.exit(code || 0);
});

process.on("SIGINT", () => {
  console.log("\n\nMonitoring stopped. Ingestion continues in background.");
  tail.kill();
  process.exit(0);
});

