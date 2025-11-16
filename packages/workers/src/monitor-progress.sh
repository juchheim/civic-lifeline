#!/bin/bash
# Simple progress monitor for SDWIS ingestion
# Shows percent complete every 30 seconds

tail -f /tmp/sdwis-ingest.log 2>/dev/null | while IFS= read -r line; do
  if echo "$line" | grep -q "progress update"; then
    # Read the next 6 lines to capture the JSON object
    percent=""
    processed=""
    total=""
    elapsed=""
    failed=""
    touched=""
    
    for i in {1..6}; do
      read -r next_line || break
      case "$next_line" in
        *percent:*)
          percent=$(echo "$next_line" | sed -E "s/.*percent:[[:space:]]*['\"]?([0-9.]+%?)['\"]?.*/\1/")
          ;;
        *processed:*)
          processed=$(echo "$next_line" | sed -E "s/.*processed:[[:space:]]*([0-9]+).*/\1/")
          ;;
        *totalRows:*)
          total=$(echo "$next_line" | sed -E "s/.*totalRows:[[:space:]]*([0-9]+).*/\1/")
          ;;
        *elapsedSeconds:*)
          elapsed=$(echo "$next_line" | sed -E "s/.*elapsedSeconds:[[:space:]]*['\"]?([0-9]+)['\"]?.*/\1/")
          ;;
        *failedBatches:*)
          failed=$(echo "$next_line" | sed -E "s/.*failedBatches:[[:space:]]*([0-9]+).*/\1/")
          ;;
        *touchedDocs:*)
          touched=$(echo "$next_line" | sed -E "s/.*touchedDocs:[[:space:]]*([0-9]+).*/\1/")
          ;;
        *^}*)
          break
          ;;
      esac
    done
    
    if [[ -n "$percent" ]]; then
      time_str=$(date +%H:%M:%S)
      printf "[%s] %s complete | Processed: %'"'"'s/%'"'"'s | Docs: %'"'"'s | Failed: %s | Elapsed: %ss\n" \
        "$time_str" "$percent" "${processed:-0}" "${total:-0}" "${touched:-0}" "${failed:-0}" "${elapsed:-0}"
    fi
  fi
done

