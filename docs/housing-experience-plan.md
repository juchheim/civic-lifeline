# Housing Experience Revamp Plan

## Objectives
- Remove the latitude/longitude requirement on `/housing` and let residents search with a familiar input (ZIP code or street/city/state).
- Keep the existing HUD counselor and Fair Market Rent (FMR) integrations but make them reachable via friendlier inputs.
- Preserve reliability via caching, validation, and clear user feedback when geocoding or upstream APIs fail.

## Current State
- Housing counselors route and UI only accept `lat`, `lon`, optional `radius`; inputs must be manually provided (`apps/web/app/housing/page.tsx` form).
- FMR route and UI require a 5-digit county FIPS code; there is no helper to derive FIPS from a location query.
- A Nominatim-based geocode proxy (`/api/geocode`, `/api/geocode/suggest`) already exists for the Food finder, and we now have shared `LocationInput` / `LocationInputWithGeocode` components that wrap these endpoints for both food and housing UIs.

## Proposed Experience
- A single “Search by address or ZIP” field with autocomplete (reusing `/api/geocode/suggest`) drives both counselor and FMR lookups.
- After selection, show the resolved place name/ZIP, allow optional advanced toggles for raw coordinates and FIPS overrides, and remember the last successful search.
- Display counselor results just as today; display FMR table with the resolved area name. Provide user-friendly error states for each subsystem.

## Backend Changes
- Extract a reusable `resolveLocation(query: string)` helper under `app/api/housing/_shared` that calls `/api/geocode` and returns `{lat, lon, placeName, postalCode?, countyFips?}`. Cache short-lived responses in Redis (15–30 min) keyed by normalized query.
- **Counselors API**
  - Accept either `(lat, lon)` or `q` (string). When `q` is present, call `resolveLocation`, then continue with existing HUD counselor fetch.
  - Prefer the ArcGIS “Active_HCAs” feature layer during shutdowns (see `docs/hud-counselor-static.md`) and fall back to the legacy HUD API only when the `HUD_COUNSELORS_USE_LIVE_API` flag is set.
  - Keep radius handling unchanged; surface descriptive errors if both coordinate resolution and HUD calls fail.
- **FMR API**
  - Accept `(fips, year)` (existing) or `q`. When `q` is provided:
    - Use `resolveLocation` to obtain coordinates.
    - Call the FCC Block API (`https://geo.fcc.gov/api/census/block/find?latitude=…&longitude=…&format=json`) to derive county FIPS.
    - Cache FCC responses (Redis TTL ~24h) and validate results; return friendly errors when county mapping fails.
  - Continue to accept explicit FIPS overrides for power users.
  - Prefer the HUD ArcGIS mirror (FY dataset) when the official API is unavailable, then fall back to the optional static JSON (see `docs/hud-fmr-static.md`). Keep the HUD API code-path behind the `HUD_FMR_USE_LIVE_API` flag for when tokens return.
- Add unit coverage around the new helpers (query parsing, FCC response handling, caching fall-through).

## Frontend Updates
- Replace the coordinate/FIPS forms with the shared `LocationInputWithGeocode` component:
  - Leverage the common debounce/suggestion UX and the built-in `/api/geocode` submit handler.
  - On submit or selection, persist `{lat, lon, displayName, postalCode}` in state.
  - Automatically trigger counselor + FMR queries using the resolved data (converting to the new APIs).
  - Provide an expandable “Advanced options” section exposing manual coordinate/FIPS inputs in case of lookup issues.
- Update loading and error states to account for geocode/lookup failures distinctly from HUD API responses.
- Maintain responsive layout and accessibility (aria live regions, keyboard navigation) consistent with existing patterns.

## Data Flow Summary
1. User types address/ZIP → suggestions from `/api/geocode/suggest`.
2. On selection or submit → `/api/geocode` returns coordinates/metadata.
3. Counselors fetch → `/api/housing/counselors?q=…` (server may resolve to lat/lon).
4. FMR fetch → `/api/housing/fmr?q=…` → server resolves FIPS via FCC, then calls HUD.
5. UI renders counselor list + FMR table with source metadata.

## Testing & Validation
- Unit tests for `resolveLocation` and FCC helper (mock fetch).
- Route-level tests stubbing fetch to HUD/FCC for success, invalid query, and upstream failure cases.
- Component tests for the new housing form (React Testing Library) covering autocomplete interactions and advanced overrides.
- Manual QA: address lookup success, ZIP-only lookup, invalid query (<3 chars), geocode failure, FCC lookup failure, HUD 503.

## Operational Notes
- Monitor Nominatim usage; if traffic increases, evaluate moving to a key-based provider (documented in architecture notes).
- Ensure FCC API usage adheres to rate limits; add basic retry with backoff similar to existing HUD fetch.
- Document new environment flags (if any) and mention Redis caching expectations.

## Open Questions / Follow-ups
- Should we pre-seed common Mississippi ZIP → FIPS mappings to avoid realtime FCC calls if rate limits become an issue?
- Do we need to surface multiple FMR areas when a location maps to more than one county-equivalent (edge case)?
- Consider logging geocode/FCC errors to monitor lookup health.
