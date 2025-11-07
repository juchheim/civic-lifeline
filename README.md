# Minor update
\nMinor: update deployment notes.

## Utilities data sources

- **ACS 2023 5-year tables** B25132 (electric), B25133 (gas), and B25134 (water/sewer) drive `/api/utilities/costs`. Monthly medians use bucket midpoints (top bucket fixed at $225 for electric/gas and $900 annually for water before dividing by 12).
- **EPA SDWIS / Envirofacts** county summary (`SDW_COUNTY_SERVED`) powers `/api/utilities/providers/water`. Requests use standard 5-digit county FIPS and retry with a 6-digit variant (`stateFips` + zero-padded county code) if the county is stored with a leading zero.
- **HIFLD service territories** feed `/api/utilities/providers/electric` (ArcGIS layer 0 + TIGERweb county geometry) and `/api/utilities/providers/gas` (hifld_open energy layer 29). Gas queries send both 5- and 6-digit FIPS variants to match counties that store `countyfips` with a leading zero.
- **Census Tigerweb + geocoder** resolve county/place FIPS for both county and city inputs; city requests fall back to the county returned by the geocoder.
- Every utilities endpoint caches successful responses in Redis for 24h so we can stay under the public API rate limits and stay edge-safe. On 429s/timeouts we return a friendly message instead of surfacing raw upstream errors.
