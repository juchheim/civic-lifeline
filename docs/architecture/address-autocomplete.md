# Address Autocomplete Plan (/food)

## Summary
Add address autocomplete to the manual location input on `/food` (and, now that the shared components exist, reuse it for housing/broadband experiences). Use the free public OpenStreetMap Nominatim search endpoint via our server as the data source, with strict rate limiting, caching, and attribution. No geographic biasing (no viewbox or bounding) will be used.

## Traffic capacity before needing a free-tier-with-key upgrade
- Public Nominatim policy effectively limits us to approximately 1 request per second from our server IP.
- Practical ceiling (assuming steady rate and our server-side limiter):
  - 60 requests per minute
  - 3,600 requests per hour
  - 86,400 requests per day
- Typical autocomplete interaction generates ~2–3 upstream requests per user search (with 300–400ms debounce and min 3 chars):
  - ≈20–30 search sessions per minute across the whole site before hitting the 60 rpm ceiling.
- Upgrade trigger: If peak demand regularly exceeds ~60 suggestion requests per minute (or ~30 searches/min) or we observe frequent throttling/backoff, switch the backend to a provider with a free API key (maintaining the same internal API contract) or host our own Nominatim.

## Goals
- Provide fast, accessible address suggestions to help users pick a location.
- Keep infrastructure simple and free.
- Ensure compliance with OSM/Nominatim usage policies (low volume, proper User-Agent, attribution, no heavy use).

## Non-goals
- No geographic biasing of results (no `viewbox`, `bounded`, or similar options).
- No provider lock-in; the server endpoint remains provider-agnostic.

## Architecture
- Client (Food page and any future location entry): Accessible combobox (`LocationInput` / `LocationInputWithGeocode`) wraps the manual input; queries our server suggest route.
- Server: Lightweight `/api/geocode/suggest` endpoint proxies to public Nominatim with debounce-friendly parameters and strict rate limiting + caching.
- Upstream: `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&countrycodes=us&limit=5&q=<query>`

## API contract (internal)
- Route: `GET /api/geocode/suggest`
- Query params:
  - `q` (string, required): Freeform user input; minimum length 3 (enforced server-side).
  - `limit` (number, optional): Max suggestions to return. Default 5; cap at 7.
- Response: `200 OK` with JSON array of suggestions
```json
[
  {
    "id": "string",        // Nominatim place_id as string
    "name": "string",      // display name
    "lat": 32.889,          // number
    "lon": -90.405,         // number
    "kind": "city"         // e.g., house | street | city | county | state | postcode
  }
]
```
- Errors:
  - `400` if `q` missing/too short.
  - `429` if rate-limited.
  - `502/504` for upstream failures/timeouts.
  - `404` if no matches.

## Client behavior (UI/UX)
- Transform the manual text input into a combobox (implemented today via `LocationInput` and `LocationInputWithGeocode` so other apps can drop it in without rebuilding the pattern):
  - Debounce: 300–400ms; only query when `q.length >= 3`.
  - Show up to 5 suggestions.
  - Keyboard: Up/Down to navigate, Enter to select, Esc to close.
  - Mouse: Click to select.
  - On selection: call existing `handleLocationSelected(lat, lon)` and close dropdown.
  - On Enter with no active suggestion: fall back to existing single-result `/api/geocode` submit.
- Loading/empty states:
  - Show a small spinner or subtle “Searching…” line while fetching.
  - On empty: “No matches. Try a full address, city & state, or ZIP.”
- Accessibility:
  - Implement ARIA combobox pattern; announce count of results and selection changes.

## Rate limiting and caching (server)
- Rate limit (global, to protect upstream):
  - Token bucket targeting ~1 rps aggregate, burst 2.
  - On limit breach, return `429` with retry-after hints; client shows a gentle “Please pause briefly” message.
- Caching:
  - In-memory LRU with TTL (e.g., 24h) keyed by normalized query (trim, lowercase, collapse spaces).
  - Cache upstream results (array of suggestions). Serve immediately on hit; do not re-query upstream.
- Request shaping:
  - Ensure `User-Agent: CivicLifeline/1.0 (contact@civiclifeline.org)` and `Accept: application/json`.
  - `limit` ≤ 7, default 5.
  - No geographic bias parameters.

## Error handling
- Upstream 5xx/timeout → return `502/504`; client shows non-blocking error and allows manual submit via `/api/geocode`.
- Empty results → `404`; client shows “No matches”.
- Rate limit → `429`; client shows “Too many searches, please pause briefly.”

## Attribution and compliance
- Display near the input or dropdown: “Search by Nominatim, © OpenStreetMap contributors.”
- Keep volumes low and respectful of public service policies.

## Observability
- Metrics:
  - `autocomplete_requests_total`
  - `autocomplete_cache_hits_total`
  - `autocomplete_upstream_errors_total`
  - `autocomplete_rate_limited_total`
- Logs:
  - Query (normalized), result count, cache hit/miss, upstream latency, error codes (sampled).

## Rollout
- Phase 1: Ship server route with limiter + caching and add the combobox. Add attribution.
- Phase 2: Monitor metrics (cache hit rate, upstream error/rate-limit rates) for a week.
- Upgrade criteria:
  - Sustained >60 suggestion requests/min site-wide, frequent 429s, or poor UX during traffic spikes.
  - Migrate backend of `/api/geocode/suggest` to a free-tier-with-key provider or self-host Nominatim; preserve the same API contract.

## Security & privacy
- Do not persist raw queries beyond logs/metrics; sanitize before logging.
- No PII stored; suggestions are ephemeral.

---

If traffic or UX indicates we are consistently approaching the public Nominatim limits, we can switch the backend implementation of `/api/geocode/suggest` to a free key-based provider without changing the frontend code.
