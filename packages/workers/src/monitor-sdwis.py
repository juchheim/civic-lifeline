#!/usr/bin/env python3
"""Monitor SDWIS ingestion progress - parses multi-line JSON logs"""
import sys
import re
import json
from datetime import datetime

LOG_FILE = sys.argv[1] if len(sys.argv) > 1 else "/tmp/sdwis-ingest.log"

print("Monitoring SDWIS ingestion...")
print(f"Log file: {LOG_FILE}")
print("Press Ctrl+C to stop monitoring (ingestion will continue)\n")

# Pattern to match log lines
log_pattern = re.compile(r'\[worker:sdwis\]\s+(\w+)\s+(.+)')

def parse_json_object(lines):
    """Parse a multi-line JSON object from log lines"""
    buffer = []
    brace_count = 0
    for line in lines:
        buffer.append(line)
        brace_count += line.count('{') - line.count('}')
        if brace_count == 0:
            break
    
    # Extract JSON part (everything after the message)
    full_text = '\n'.join(buffer)
    match = re.search(r'\{.*\}', full_text, re.DOTALL)
    if not match:
        return None
    
    json_str = match.group(0)
    # Convert single quotes to double quotes for valid JSON
    json_str = json_str.replace("'", '"')
    # Remove trailing commas
    json_str = re.sub(r',\s*}', '}', json_str)
    json_str = re.sub(r',\s*]', ']', json_str)
    
    try:
        return json.loads(json_str)
    except:
        # Fallback: extract values manually
        data = {}
        for key in ['processed', 'totalRows', 'percent', 'elapsedSeconds', 'failedBatches', 'touchedDocs', 'offset']:
            match = re.search(rf'{key}:\s*([0-9]+|[\'"][^\'"]+[\'"])', full_text)
            if match:
                val = match.group(1).strip("'\"")
                data[key] = val
        return data

try:
    with open(LOG_FILE, 'r') as f:
        # Go to end of file
        f.seek(0, 2)
        
        while True:
            line = f.readline()
            if not line:
                import time
                time.sleep(0.1)
                continue
            
            line = line.strip()
            if not line:
                continue
            
            match = log_pattern.match(line)
            if not match:
                continue
            
            message = match.group(1)
            
            if message == "progress":
                # Read next few lines to get full JSON
                lines = [line]
                for _ in range(10):
                    next_line = f.readline()
                    if not next_line:
                        break
                    lines.append(next_line.strip())
                    if next_line.strip() == '}':
                        break
                
                data = parse_json_object(lines)
                if data:
                    percent = data.get('percent', '0.00%')
                    processed = int(data.get('processed', 0))
                    total = int(data.get('totalRows', 0))
                    elapsed = data.get('elapsedSeconds', '0')
                    failed = int(data.get('failedBatches', 0))
                    touched = int(data.get('touchedDocs', 0))
                    time_str = datetime.now().strftime("%H:%M:%S")
                    print(f"[{time_str}] {percent} complete | Processed: {processed:,}/{total:,} | Docs: {touched:,} | Failed: {failed} | Elapsed: {elapsed}s")
            
            elif message == "batch" and "processed" in line:
                # Read next few lines
                lines = [line]
                for _ in range(10):
                    next_line = f.readline()
                    if not next_line:
                        break
                    lines.append(next_line.strip())
                    if next_line.strip() == '}':
                        break
                
                data = parse_json_object(lines)
                if data:
                    offset = int(data.get('offset', 0))
                    if offset % 10000 == 0:
                        progress = data.get('progress', '0')
                        time_str = datetime.now().strftime("%H:%M:%S")
                        print(f"  [{time_str}] Batch {offset:,} - {progress}%")
            
            elif "ingestion" in message:
                if "start" in line:
                    print(f"\n🚀 Ingestion started")
                elif "complete" in line:
                    lines = [line]
                    for _ in range(15):
                        next_line = f.readline()
                        if not next_line:
                            break
                        lines.append(next_line.strip())
                        if next_line.strip() == '}':
                            break
                    data = parse_json_object(lines)
                    if data:
                        percent = data.get('percentComplete', '0.00%')
                        processed = int(data.get('processed', 0))
                        touched = int(data.get('touchedDocs', 0))
                        failed = int(data.get('failedBatches', 0))
                        ms = int(data.get('ms', 0))
                        minutes = ms // 60000
                        seconds = (ms % 60000) // 1000
                        print(f"\n✅ Ingestion complete!")
                        print(f"   Progress: {percent} ({processed:,} rows)")
                        print(f"   Documents: {touched:,}")
                        print(f"   Failed batches: {failed}")
                        print(f"   Duration: {minutes}m {seconds}s")
                    sys.exit(0)
                elif "failed" in line:
                    print(f"\n❌ Ingestion failed")
                    sys.exit(1)

except KeyboardInterrupt:
    print("\n\nMonitoring stopped. Ingestion continues in background.")
    sys.exit(0)

