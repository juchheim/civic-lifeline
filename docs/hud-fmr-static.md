# HUD FMR Fallback (Shutdown Playbook)

When HUD closes the developer portal (e.g., during a federal shutdown), fresh API tokens cannot be issued and live Fair Market Rent (FMR) requests begin to return `404`. Until the portal reopens, keep the integration code in place but serve FMR data from a static download.

Need housing counselors too? See `docs/hud-counselor-static.md` for the matching fallback.

## 1. Static Dataset Workflow (current default)

1. **Query the HUD ArcGIS FeatureServer (recommended during shutdown)**  
   HUD mirrors the latest FMR release on ArcGIS Online. We target layer `Fair_Market_Rents/FeatureServer/0`, which contains FY2024 values and is publicly accessible (override via `HUD_FMR_ARCGIS_URL` if the service moves):  
   `https://services.arcgis.com/VTyQ9soqVukalItT/ArcGIS/rest/services/Fair_Market_Rents/FeatureServer/0/query`  
   The backend will call this service directly (see `fetchArcgisFmrByFips`), but you can manually export a CSV with:  
   `https://services.arcgis.com/VTyQ9soqVukalItT/ArcGIS/rest/services/Fair_Market_Rents/FeatureServer/0/query?where=1%3D1&outFields=*&f=csv`

2. **(Optional) Keep a static backup**  
   If ArcGIS becomes unavailable, fall back to the archived CSV/ZIP mirrors:
   - Internet Archive copy (FY2024 CSV): `https://web.archive.org/web/20230920013526/https://www.huduser.gov/portal/datasets/fmr/FY2024/FY2024_FMRs.csv`
   - Data.gov resource page (ZIP + documentation): `https://catalog.data.gov/dataset/fair-market-rents`
   *(When HUD restores service, the canonical landing page is https://www.huduser.gov/portal/datasets/fmr.html.)*

3. **Place the file locally**  
   Copy the CSV into the monorepo (example: `apps/web/data/fmr/FY2024_FMRs.csv`). The file is not committed; it lives in your environment.

4. **Convert to JSON**  
   The API route expects a JSON array with records shaped like:
   ```json
   {
     "fips": "28163",
     "year": 2024,
     "areaName": "Yazoo County, MS HUD Metro FMR Area",
     "br0": 718,
     "br1": 745,
     "br2": 944,
     "br3": 1198,
     "br4": 1289
   }
   ```
   Use any tooling you prefer (Excel ➝ CSV ➝ JSON, Python/pandas, etc.). Save the output as `apps/web/data/fmr/fy2024.json`.

5. **Point the app at the JSON file**  
   In `apps/web/.env.local`:
   ```env
   HUD_FMR_ARCGIS_URL=https://services.arcgis.com/VTyQ9soqVukalItT/ArcGIS/rest/services/Fair_Market_Rents/FeatureServer/0/query
   HUD_FMR_ARCGIS_YEAR=2024
   HUD_FMR_STATIC_PATH=apps/web/data/fmr/fy2024.json
   HUD_FMR_USE_LIVE_API=false
   ```
   Restart `pnpm --filter @web dev`. The `/api/housing/fmr` route now serves from the static blob and never calls HUD during the shutdown. A small sample dataset (`apps/web/data/fmr/fy2024-sample.json`) is included for smoke tests—replace it with the full file for real usage.
6. **Keep the UI default year in sync**  
   The housing page currently uses `2024` as the default FMR year (`DEFAULT_FMR_YEAR` constant). Update that value whenever you refresh the static dataset.

## 2. Restoring the Live HUD API

Once HUD reopens the developer portal:

1. Visit https://www.huduser.gov/portal/dataset/api.html and request/refresh your API key for both **Housing Counseling** and **Fair Market Rents** datasets. Copy the issued bearer token.
2. Update `apps/web/.env.local`:
   ```env
   HUD_TOKEN=your_hud_token
   HUD_FMR_STATIC_PATH=apps/web/data/fmr/fy2024.json   # optional fallback
   HUD_FMR_USE_LIVE_API=true
   HUD_COUNSELORS_URL=https://data.hud.gov/housing_counseling/search.json
   HUD_FMR_URL=https://www.huduser.gov/hudapi/public/fmr/data
   ```
3. Restart the dev server. The FMR route now attempts the live HUD API first (token required), falling back to the static JSON only if HUD does not have that county/year combination cached locally.
4. Once live data is flowing reliably, you can clear `HUD_FMR_STATIC_PATH` or keep it for offline resilience.

## 3. Code Pointers

- `apps/web/app/api/housing/fmr/static-data.ts`: lazy-loads the JSON file and resolves FMR values by `{fips, year}`. See inline comments for the expected schema.
- `apps/web/app/api/housing/fmr/route.ts`: prefers the static dataset unless `HUD_FMR_USE_LIVE_API` is set to `"true"`. The live HUD fetch path is unchanged—re-enable it by setting the env flag and adding `HUD_TOKEN`.
- `apps/web/app/housing/page.tsx`: surfaces API error messages directly. During the shutdown you’ll see the friendly “static file missing” or “HUD data not published” strings wired in the route.

## 4. Housekeeping

- Do **not** commit the real HUD dataset; it exceeds repository size limits and may have licensing constraints. Keep it in local dev/staging environments.
- Update this document whenever HUD revises download URLs or schema.
- Monitor HUD announcements so we know when to switch `HUD_FMR_USE_LIVE_API` back to `true`.
