# Observability

## Metrics (Prometheus/OTEL)
- API: req_count, req_latency_p95, upstream_errors, cache_hit_ratio.
- ETL: job_duration, rows_processed, csv_bytes, failures.
- Business: searches_by_route, letters_generated, verifications_completed.

## Logging
- Structured JSON; correlation IDs per request.
- Redact PII (emails, addresses, tokens).
- Log levels: INFO (normal), WARN (retries), ERROR (failures).

## Tracing
- OTEL spans across API → external provider calls → Mongo/Redis.
- Trace IDs surfaced in error pages for support.

## Dashboards & Alerts
- Uptime checks: /healthz, external provider probes.
- Alerts: error rate spikes, cache miss surges, ETL failures, stale datasets.
