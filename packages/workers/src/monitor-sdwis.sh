#!/bin/bash
# Monitor SDWIS ingestion progress - parses multi-line JSON logs

LOG_FILE="${LOG_FILE:-/tmp/sdwis-ingest.log}"

echo "Monitoring SDWIS ingestion..."
echo "Log file: $LOG_FILE"
echo "Press Ctrl+C to stop monitoring (ingestion will continue)"
echo ""

tail -f "$LOG_FILE" 2>/dev/null | awk '
BEGIN {
    in_progress = 0
    in_batch = 0
    buffer = ""
}

/[worker:sdwis] progress update/ {
    in_progress = 1
    buffer = $0
    next
}

/[worker:sdwis] batch processed/ {
    in_batch = 1
    buffer = $0
    next
}

/[worker:sdwis] ingestion (start|complete|failed)/ {
    print "[INGESTION] " $0
    next
}

in_progress || in_batch {
    buffer = buffer "\n" $0
    if ($0 ~ /^}$/) {
        # Extract key values from the JSON-like buffer
        processed = ""
        total = ""
        percent = ""
        elapsed = ""
        failed = ""
        touched = ""
        offset = ""
        
        if (match(buffer, /processed:\s*([0-9]+)/, arr)) processed = arr[1]
        if (match(buffer, /totalRows:\s*([0-9]+)/, arr)) total = arr[1]
        if (match(buffer, /percent:\s*['"'"'"]?([0-9.]+%?)/, arr)) percent = arr[1]
        if (match(buffer, /elapsedSeconds:\s*['"'"'"]?([0-9]+)/, arr)) elapsed = arr[1]
        if (match(buffer, /failedBatches:\s*([0-9]+)/, arr)) failed = arr[1]
        if (match(buffer, /touchedDocs:\s*([0-9]+)/, arr)) touched = arr[1]
        if (match(buffer, /offset:\s*([0-9]+)/, arr)) offset = arr[1]
        
        if (in_progress) {
            time_str = strftime("%H:%M:%S")
            printf "[%s] %s complete | Processed: %'"'"'s/%'"'"'s | Docs: %'"'"'s | Failed: %s | Elapsed: %ss\n", 
                time_str, percent, processed, total, touched, failed, elapsed
            in_progress = 0
        } else if (in_batch && offset != "" && (offset % 10000 == 0)) {
            time_str = strftime("%H:%M:%S")
            printf "  [%s] Batch %'"'"'s\n", time_str, offset
            in_batch = 0
        }
        buffer = ""
    }
}
'
