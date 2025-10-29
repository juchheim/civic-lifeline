# Caching & Retries

## Cache Layers
- **Edge (HTTP)**: `Cache-Control: public, max-age=600` for read endpoints.
- **Redis**:
  - USDA tile key: `snap:{z}:{x}:{y}` TTL 10–60m.
  - BLS county key: `bls:{fips}:{start}:{end}` TTL 24h.
  - HUD location key: `hudCounselor:{hash}` TTL 24h.

## Retry Policy (External Calls)
- Backoff: 250ms, 500ms, 1s, 2s (max 4 retries).
- Timeouts: 6s connect, 10s overall.
- Circuit breaker opens after 5 consecutive failures, 2m cooldown.
- On breaker open: respond with `UPSTREAM_UNAVAILABLE` + stale cache if present.

## ETags & Validation
- Respect upstream ETags/Last-Modified where provided.
- For CSVs, checksum files; don’t reprocess identical versions.

## Limits
- Apply per-IP and per-token rate limiting (sliding window).
- Clamp bbox/radius to reasonable bounds.
