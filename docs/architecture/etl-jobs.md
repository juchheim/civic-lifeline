# ETL Jobs

## Principles
- Idempotent: re-runs don’t duplicate rows.
- Versioned: keep `asOf`/`fetchedAt` and `sourceUrl`.
- Bounded memory: stream CSVs; batch writes.

## Jobs

### 1) USDA Nightly Snapshot
- **When**: 03:00 local
- **Steps**:
  1. Paginate FeatureServer (by state or tiles).
  2. Normalize fields; geocode only if missing coords (rare).
  3. Upsert into `snapRetailers` by unique store id/address hash.
  4. Record `fetchedAt` and source URL.

### 2) FCC CSV Ingest
- **When**: Weekly (Mon 04:00)
- **Steps**:
  1. Download latest state CSV → S3 `/raw/fcc/YYYYMM/STATE.csv`.
  2. Stream transform to county/tract aggregates.
  3. Upsert into `fccBroadband` keyed by `{fips, asOf}`.
  4. Store data vintage (month).

### 3) BLS Refresh
- **When**: Daily 05:00 (or monthly after release)
- **Steps**:
  1. For configured county FIPS list, call LAUS series.
  2. Merge points; ensure months are unique.
  3. Upsert `lausSeries` and set `fetchedAt`.

### 4) HUD Cache Sweeper
- **When**: Hourly
- **Steps**:
  1. Drop `hudCounselorsCache` where `fetchedAt` older than 24h.
  2. Keep hot geo-queries warm if high traffic.

## Failure Handling
- Exponential backoff; circuit breakers.
- On failure: retain last good dataset, set UI banner if stale > SLA.
