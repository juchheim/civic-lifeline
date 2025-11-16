#!/bin/bash
# Simple monitor for SDWIS ingestion - shows percent complete

LOG_FILE="${LOG_FILE:-/tmp/sdwis-ingest.log}"

echo "Monitoring SDWIS ingestion progress..."
echo "Log file: $LOG_FILE"
echo "Press Ctrl+C to stop monitoring (ingestion will continue)"
echo ""

tail -f "$LOG_FILE" 2>/dev/null | while IFS= read -r line; do
  # Look for progress update lines
  if [[ "$line" =~ "progress update" ]]; then
    # Read the next 6 lines to get the JSON object
    percent=""
    processed=""
    total=""
    elapsed=""
    failed=""
    touched=""
    
    for i in {1..6}; do
      read -r next_line || break
      if [[ "$next_line" =~ percent:\s*[\'\"]([0-9.]+%?) ]]; then
        percent="${BASH_REMATCH[1]}"
      fi
      if [[ "$next_line" =~ processed:\s*([0-9]+) ]]; then
        processed="${BASH_REMATCH[1]}"
      fi
      if [[ "$next_line" =~ totalRows:\s*([0-9]+) ]]; then
        total="${BASH_REMATCH[1]}"
      fi
      if [[ "$next_line" =~ elapsedSeconds:\s*[\'\"]([0-9]+) ]]; then
        elapsed="${BASH_REMATCH[1]}"
      fi
      if [[ "$next_line" =~ failedBatches:\s*([0-9]+) ]]; then
        failed="${BASH_REMATCH[1]}"
      fi
      if [[ "$next_line" =~ touchedDocs:\s*([0-9]+) ]]; then
        touched="${BASH_REMATCH[1]}"
      fi
      if [[ "$next_line" =~ ^}$ ]]; then
        break
      fi
    done
    
    if [[ -n "$percent" ]]; then
      time_str=$(date +%H:%M:%S)
      printf "[%s] %s complete | Processed: %'"'"'s/%'"'"'s | Docs: %'"'"'s | Failed: %s | Elapsed: %ss\n" \
        "$time_str" "$percent" "$processed" "$total" "$touched" "$failed" "$elapsed"
    fi
  fi
done

