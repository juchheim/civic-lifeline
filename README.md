# Minor update
\nMinor: update deployment notes.

## Utilities data sources

- **ACS 2023 5-year tables** B25132 (electric), B25133 (gas), and B25134 (water/sewer) drive `/api/utilities/costs`. Monthly medians use bucket midpoints (top bucket fixed at $225 for electric/gas and $900 annually for water before dividing by 12).
- **EPA SDWIS county service download** powers `/api/utilities/providers/water`. We ingest the full [`SDW_COUNTY_SERVED` table](https://data.epa.gov/efservice/SDW_COUNTY_SERVED/rows/0:1/JSON) into Mongo via `pnpm tsx packages/workers/src/ingest-sdwis.ts`, normalize every record with state/county FIPS, and query from Mongo at request time (with a state-level fallback when a county is missing data). Responses stay capped at 1,000 results.
- **HIFLD service territories** feed `/api/utilities/providers/electric` (ArcGIS layer 0 + TIGERweb county geometry) and `/api/utilities/providers/gas` (hifld_open energy layer 29). Gas queries send both 5- and 6-digit FIPS variants to match counties that store `countyfips` with a leading zero.
- **Census Tigerweb + geocoder** resolve county/place FIPS for both county and city inputs; city requests fall back to the county returned by the geocoder.
- Every utilities endpoint caches successful responses in Redis for 24h so we can stay under the public API rate limits and stay edge-safe. On 429s/timeouts we return a friendly message instead of surfacing raw upstream errors.

## Water system ingestion workflow

1. Ensure the root `.env` exposes `MONGO_URI` and `MONGO_DB` (already present for local + remote deployments).
2. Run `pnpm tsx packages/workers/src/ingest-sdwis.ts`. The worker pages through the entire SDWIS `SDW_COUNTY_SERVED` feed (≈390k rows), resolves each row against our `states`/`counties` collections to derive USPS + FIPS codes, and upserts into the `publicWaterSystems` collection (keyed by `pwsId:countyFips`).
3. Each ingest pass tags rows with a run id and prunes anything that failed to refresh, keeping the job idempotent. Indexes on `countyFips`, `stateCode`, and `pwsId` are created automatically.

We keep this dataset in Mongo so `/api/utilities/providers/water` can return deterministic county-level results without depending on unreliable SDWIS filters, while still reflecting the latest EPA data whenever the ingestion script is rerun.
