# Housing Counselor Fallback (Shutdown Playbook)

HUD’s primary Housing Counseling search API (`data.hud.gov/housing_counseling`) goes dark whenever the department shuts down. To keep `/housing` functional, the backend now defaults to HUD’s ArcGIS mirror and only hits the live API when you explicitly flip the feature flag.

## 1. ArcGIS Mirror (default during shutdown)

The service we use is:`https://services.arcgis.com/VTyQ9soqVukalItT/ArcGIS/rest/services/Active_HCAs/FeatureServer/0/query`

Configure it via `apps/web/.env.local`:

```env
HUD_COUNSELORS_ARCGIS_URL=https://services.arcgis.com/VTyQ9soqVukalItT/ArcGIS/rest/services/Active_HCAs/FeatureServer/0/query
HUD_COUNSELORS_USE_LIVE_API=false
HUD_COUNSELORS_RADIUS_MAX=200 # optional override
```

*(The radius override is optional; by default the API clamps user input between 5 and 200 miles.)*

The `/api/housing/counselors` route will:

1. Resolve the user query to coordinates (via `/api/geocode`).
2. Query the ArcGIS layer with an intersection filter (`geometry`, `distance`, `units=esriSRUnit_StatuteMile`).
3. Map HUD service/language codes to friendly labels and compute distance in miles.
4. Cache results in Redis for 30 minutes.

If ArcGIS returns zero results, the API responds with an empty list. Once HUD restores the live service you can re-enable the legacy endpoint (see below) for comparison/testing.

## 2. Re-enabling the Live HUD API

When HUD’s developer portal reopens:

1. Retrieve or refresh your Housing Counseling API token.
2. Update `apps/web/.env.local`:
   ```env
   HUD_TOKEN=your_hud_token
   HUD_COUNSELORS_USE_LIVE_API=true
   HUD_COUNSELORS_URL=https://data.hud.gov/housing_counseling/search.json
   ```
3. Restart `pnpm --filter @web dev`.
4. The API route will still prefer cached ArcGIS results, but if none are returned it will fall back to the live endpoint (including caching of those responses).

## 3. Frontend Notes

- The housing page surfaces the data source via `SourceChip` (ArcGIS vs HUD) and shows approximate distance, address, and the decoded service/language labels.
- Delivery methods (face-to-face, phone, etc.) are appended to the services list for transparency.
- Error handling remains lightweight—empty results show “No counselors returned,” while network failures surface the existing error alert.

## 4. Quick Reference

Environment variables:

| Variable | Purpose |
| --- | --- |
| `HUD_COUNSELORS_ARCGIS_URL` | Override ArcGIS FeatureServer query endpoint |
| `HUD_COUNSELORS_USE_LIVE_API` | `true` to attempt the legacy HUD API after ArcGIS |
| `HUD_COUNSELORS_URL` | Legacy HUD API endpoint (only used when the flag is `true`) |
| `HUD_TOKEN` | Bearer token for the legacy HUD API |

Cache behavior:
- ArcGIS results: Redis TTL 30 minutes (`hud:hc:{hash}` key)
- HUD API results (when re-enabled): TTL 60 minutes

See also: `docs/hud-fmr-static.md` for the Fair Market Rent fallback.
