# Civic Lifeline

## About

**Civic Lifeline** is a non-profit website serving the entire United States. Our mission is to provide users with essential data and tools all in one place for simple, straightforward use.

### Why We Exist

Finding reliable, up-to-date information about food assistance, housing, jobs, utilities, and other essential services typically requires significant research across multiple government websites, databases, and resources. This fragmentation makes it difficult for people to access the help they need when they need it most.

Civic Lifeline solves this problem by bringing together verified public data and practical tools in a single, easy-to-use platform. While users may be able to find similar data and tools elsewhere, doing so requires work and research that many people don't have time for. We eliminate that barrier.

### What We Provide

Civic Lifeline offers a suite of free tools and data resources:

- **Food Access**: Interactive map to find stores that accept SNAP (Supplemental Nutrition Assistance Program) benefits near any location
- **Resume Builder**: Guided tool to create professional resumes quickly with easy-to-follow guidance
- **Housing & Utilities**: 
  - Fair Market Rent (FMR) data to understand local housing costs
  - HUD-approved housing counselors directory
  - Utility cost information and provider directories for electric, gas, and water services
- **Unemployment & Local Statistics**: County-level unemployment trends and supporting metrics including poverty rates, SNAP participation, housing burden, median income, education levels, and uninsured rates
- **Broadband Information**: Internet service availability and coverage data

### Our Approach

- **Simple by Design**: Every tool is straightforward and focused on one clear purpose
- **Trustworthy Data**: All information comes from verified public sources (USDA, HUD, BLS, EPA, FCC, and others)
- **No Barriers**: Completely free, no registration required, accessible to everyone
- **Privacy-Focused**: We don't save personal information or track users unnecessarily

### Who We Serve

Civic Lifeline is designed for anyone in the United States who needs quick access to reliable information about essential services. Whether you're looking for food assistance, housing help, job resources, or utility information, our tools are here to help you take the next step.

---

## Technical Documentation

### Minor update

Minor: update deployment notes.

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

---

## Comprehensive Technical Documentation

### System Architecture

**Tech Stack**
- **Frontend**: Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes (serverless functions on Vercel)
- **Database**: MongoDB Atlas (primary data store), Redis (caching)
- **Map Libraries**: Leaflet + React Leaflet for interactive maps
- **Charts**: Recharts for time-series visualization
- **Data Validation**: Zod schemas across all API boundaries
- **State Management**: TanStack Query (React Query) for server state
- **PDF Generation**: Puppeteer Core + @sparticuz/chromium (serverless-optimized)
- **Template Engine**: Handlebars for resume templates
- **Workers**: Node.js scripts for ETL jobs (scheduled via Koyeb cron)
- **Deployment**: Vercel (web/API), Koyeb (workers), MongoDB Atlas, Redis Cloud

**Monorepo Structure**
```
/apps/web             # Main Next.js application
/packages/db          # MongoDB connection utilities
/packages/types       # Shared TypeScript types & Zod schemas
/packages/utils       # Shared utilities (logging, bbox parsing, etc.)
/packages/workers     # ETL workers (FCC, SDWIS, BLS)
/docs                 # Architecture & feature documentation
```

---

### Feature Areas

#### 1. Home Page (`/`)
- **Location**: `apps/web/app/page.tsx`
- **Description**: Landing page with hero section and navigation cards
- **Features**:
  - Responsive grid layout with priority routes (Food, Resume, Housing/Utilities)
  - Exploratory sections (Stats, Coming Soon)
  - Custom color schemes per feature (civic-green, civic-blue, amber)
  - Semantic HTML with ARIA labels

#### 2. Food Access (`/food`)
- **Location**: `apps/web/app/food/page.tsx`
- **API Endpoint**: `GET /api/food/snap`
- **Data Source**: USDA SNAP Retailers (ArcGIS FeatureServer)
- **Features**:
  - Location-based search via geolocation or manual address input
  - Interactive Leaflet map showing SNAP-accepting retailers
  - Geocoding via Nominatim (OpenStreetMap)
  - Store type filtering (Supermarket, Convenience Store, etc.)
  - Scrollable retailer list with distance/address details
  - Real-time bbox-based queries (debounced 400ms)
  - Redis caching (10-30 min TTL with jitter)
  - Retry logic with exponential backoff (up to 4 retries, 45s timeout)
- **Components**:
  - `MapView`: Dynamic import (client-side only) with Leaflet
  - `StoreCard`: Individual retailer display with focus handling
  - `LocationInputWithGeocode`: Shared location input with autocomplete
  - `EmptyState`: Contextual empty states per feature

#### 3. Resume Builder (`/resume`)
- **Location**: `apps/web/app/resume/page.tsx`
- **API Endpoints**:
  - `POST /api/resume/pdf/[id]` - Generate PDF from resume data
  - `POST /api/resume/summary` - AI-powered summary generation
- **Data Format**: JSON schema defined in `docs/resume-builder/02-data-contract.md`
- **Features**:
  - Multi-step wizard interface with form validation
  - Three professional templates: Classic, Modern, Minimal
  - Server-side PDF rendering via Puppeteer + Chromium
  - Handlebars templates with shared partials
  - Design tokens for consistent typography/spacing
  - Real-time preview (optional)
  - Download ready-to-use PDF
  - Privacy-safe logging (no PII in logs)
- **Templates**: `apps/web/resume/templates/*.hbs`
- **Documentation**: Full specs in `docs/resume-builder/`
- **Serverless Optimization**: Uses `@sparticuz/chromium` for AWS Lambda compatibility

#### 4. Housing & Utilities (`/housing-utilities`)
- **Location**: `apps/web/app/housing-utilities/`
- **Components**: `HousingUtilitiesClient.tsx` (tabs), `HousingExperience.tsx`, `UtilitiesExperience.tsx`
- **API Endpoints**:
  - `GET /api/housing/counselors` - HUD-approved housing counselors
  - `GET /api/housing/fmr` - Fair Market Rent data
  - `GET /api/utilities/costs` - ACS utility cost estimates
  - `GET /api/utilities/providers/electric` - Electric service providers
  - `GET /api/utilities/providers/gas` - Gas service providers
  - `GET /api/utilities/providers/water` - Public water systems

**Housing Data**:
- **HUD Counselors**:
  - Source: HUD Housing Counselor API (proxied via ArcGIS)
  - Radius search (5-100 miles)
  - Returns: name, address, phone, website, services, languages
  - Caching: 24h Redis TTL
  - Fallback: Graceful error messages on upstream timeout
- **Fair Market Rent (FMR)**:
  - Source: HUD FY2024 ArcGIS layer (static during HUD API shutdown)
  - Query by county FIPS or lat/lon
  - Returns: Efficiency, 1-4 bedroom rates
  - Documentation: `docs/hud-fmr-static.md`
  - Future: Will switch back to live HUD API when available

**Utilities Data**:
- **Cost Estimates**:
  - Source: Census ACS 2023 5-year tables (B25132, B25133, B25134)
  - Electric/Gas: Monthly medians via bucket midpoints (top bucket = $225)
  - Water/Sewer: Annual costs divided by 12 for monthly estimate
  - Query by county or city name
  - Caching: 24h Redis TTL
- **Electric Providers**:
  - Source: HIFLD service territories (ArcGIS layer 0)
  - County-level matching via TIGERweb geometry
  - Max 1,000 results per query
- **Gas Providers**:
  - Source: HIFLD energy layer 29
  - Dual FIPS matching (5 and 6 digit for leading zero counties)
  - Max 1,000 results
- **Water Providers**:
  - Source: EPA SDWIS `SDW_COUNTY_SERVED` table
  - Ingested to MongoDB via `packages/workers/src/ingest-sdwis.ts`
  - ≈390k rows, normalized with state/county FIPS
  - Query by county FIPS (state-level fallback if county missing)
  - Max 1,000 results, sorted by population served
  - Collection: `publicWaterSystems` with indexes on `countyFips`, `stateCode`, `pwsId`

#### 5. Stats / Unemployment (`/stats`)
- **Location**: `apps/web/app/stats/page.tsx`
- **API Endpoints**:
  - `GET /api/jobs/unemployment` - BLS LAUS unemployment data
  - `GET /api/states` - List of US states
  - `GET /api/counties?stateCode={code}` - Counties by state
  - `GET /api/stats/poverty` - Poverty statistics
  - `GET /api/stats/median-income` - Median household income
  - `GET /api/stats/snap-participation` - SNAP participation rates
  - `GET /api/stats/education-attainment` - Education levels
  - `GET /api/stats/uninsured` - Uninsured rates
  - `GET /api/stats/housing-burden` - Housing cost burden

**Features**:
- State + County selector with dynamic county loading
- Time-series chart for unemployment trends (2018-2025)
- 6 metric cards showing supporting indicators:
  - Poverty rate & count
  - Median household income
  - SNAP participation
  - Education attainment (Bachelor's+ %)
  - Uninsured rate
  - Housing cost burden (>30% income)
- Data sources: BLS LAUS, Census ACS 5-year estimates
- Caching: 5 min stale time for unemployment, longer for census data
- Responsive grid layout (1-6 columns based on viewport)

#### 6. Broadband (`/housing-utilities` - Broadband tab)
- **Location**: `apps/web/app/broadband/BroadbandExperience.tsx`
- **API Endpoint**: `GET /api/broadband/summary?geo=county&q={location}`
- **Data Source**: FCC National Broadband Map (CSV downloads, ingested to MongoDB)
- **Features**:
  - Query by address, city, or ZIP code
  - County-level broadband coverage statistics
  - Speed tiers: 25/3, 100/20, 1000/100 Mbps
  - Technology breakdown (Fiber, Cable, DSL, etc.)
  - Total housing units counted
  - Location input with autocomplete suggestions
- **ETL Worker**: `packages/workers/src/ingest-fcc-summary.ts`
  - Processes FCC CSV downloads
  - Aggregates to county/tract level
  - Stores in `fccBroadband` collection
  - Weekly/monthly refresh cycle

---

### API Architecture

**Common Patterns**:
- All responses include `{ source, lastUpdated, dataVintage? }` metadata
- Error format: `{ error: { code: string, message: string, upstream?: string } }`
- HTTP status codes: 200 (success), 400 (bad request), 404 (not found), 429 (rate limit), 502/503/504 (upstream errors)
- Request/response validation via Zod schemas (`@cl/types`)
- Structured logging with correlation IDs (`@cl/utils` logger)
- PII redaction in logs (emails, addresses, coordinates)

**Caching Strategy**:
- **Redis** (primary):
  - SNAP retailers: 10-30 min (jittered)
  - BLS unemployment: 24h
  - HUD counselors: 24h
  - Housing/utility APIs: 24h
  - Cache keys hashed from normalized query params
- **HTTP Cache-Control**: `public, max-age=600` for read endpoints
- Cache hit/miss tracking via `x-cache` response header

**Retry & Timeout Policy**:
- External API calls: 4 retries with exponential backoff (200ms, 500ms, 1s, 2s)
- Timeouts: 45s for USDA, 10s for others
- Circuit breaker: Opens after 5 consecutive failures, 2min cooldown
- On failure: Return `UPSTREAM_UNAVAILABLE` + stale cache if available

**Rate Limiting**:
- Geocoding API: Token bucket (2 capacity, 1/sec refill rate)
- In-memory rate limiter for `/api/geocode/suggest`
- 429 response with `Retry-After: 1` header

**Geocoding & Location Resolution**:
- **Nominatim** (OpenStreetMap):
  - Used for address autocomplete and forward geocoding
  - Rate limited to ~1 req/sec per OSM usage policy
  - User-Agent: `CivicLifeline/1.0 (contact@civiclifeline.org)`
  - 24h in-memory cache (LRU, 200 entries max)
  - Endpoint: `GET /api/geocode/suggest?q={query}&limit={5}`
- **Census TIGERweb**:
  - Reverse geocoding (lat/lon → county FIPS)
  - Used by housing/utilities endpoints
  - Batch lookup support for performance

---

### Data Sources & ETL

**USDA SNAP Retailers** (Food Access)
- **API**: ArcGIS FeatureServer REST API
- **Query Mode**: Spatial bbox query (Web Mercator projection)
- **Fields**: Store name, address, type, lat/lon, incentive programs
- **Refresh**: On-demand with caching (no scheduled ETL)
- **Storage**: Transient (cache only, no persistent DB)

**BLS LAUS** (Unemployment Statistics)
- **API**: BLS Public Data API v2 (POST JSON)
- **Series Format**: `LAUCN{STATE2}{COUNTY3}000000003` (unemployment rate)
- **Frequency**: Monthly releases
- **Refresh**: On-demand (24h cache) + optional nightly worker
- **Storage**: MongoDB `lausSeries` collection

**FCC National Broadband Map** (Internet Coverage)
- **Source**: Bulk CSV downloads per state/version
- **ETL**: `packages/workers/src/ingest-fcc-summary.ts`
- **Processing**: Stream → parse → aggregate to county → MongoDB
- **Schema Versioning**: Track `asOf` date per dataset
- **Storage**: MongoDB `fccBroadband` collection
- **Frequency**: Weekly/monthly (manual trigger or cron)

**HUD Housing Data**
- **Counselors**: JSON API (ArcGIS proxy)
- **FMR**: Currently using FY2024 ArcGIS static layer (see `docs/hud-fmr-static.md`)
- **Refresh**: On-demand with 24h cache
- **Storage**: Redis cache only (no persistent DB)

**EPA SDWIS** (Water Systems)
- **Source**: `https://data.epa.gov/efservice/SDW_COUNTY_SERVED/rows/{start}:{end}/JSON`
- **Total Rows**: ≈390,000 water systems
- **ETL**: `packages/workers/src/ingest-sdwis.ts`
  - Pages through full dataset (1000 rows per batch)
  - Resolves state/county FIPS via lookup tables
  - Upserts to `publicWaterSystems` (keyed by `pwsId:countyFips`)
  - Tags each run with `ingestRunId`, prunes stale records
  - Creates indexes: `(pwsId, countyFips)`, `countyFips`, `stateCode`
- **Frequency**: Monthly (manual trigger)
- **Storage**: MongoDB `publicWaterSystems` collection

**Census ACS** (Demographics & Utilities)
- **Tables**:
  - B25132 (electricity costs)
  - B25133 (gas costs)
  - B25134 (water/sewer costs)
  - Various poverty, income, education, insurance tables
- **Access**: Census API via shared utility functions
- **Processing**: Bucket midpoint estimation for median costs
- **Vintage**: 2023 5-year estimates
- **Storage**: API responses cached in Redis (24h), no persistent DB

---

### Monorepo Packages

#### `@cl/types`
- **Purpose**: Shared TypeScript types and Zod schemas
- **Exports**:
  - API response types: `SnapResponse`, `UnemploymentResponse`, `BroadbandSummaryResponse`, etc.
  - Zod validators: `zSnapItem`, `zUnemploymentResponse`, `zFmrResponse`, etc.
  - Model types: `State`, `County`, `PublicWaterSystem`, `ResumeData`
- **Location**: `packages/types/src/`
- **Tests**: `packages/types/tests/api.test.ts`

#### `@cl/utils`
- **Purpose**: Shared utility functions
- **Exports**:
  - `createLogger(namespace)` - Structured logging with Pino
  - `parseBbox(str)`, `clampToWorld(bbox)` - Bounding box utilities
  - `bboxToQueryParam(bbox)` - Format bbox for API queries
  - HTTP utilities
- **Location**: `packages/utils/src/`
- **Tests**: `packages/utils/src/bbox.test.ts`

#### `@cl/db`
- **Purpose**: MongoDB connection and collection getters
- **Exports**:
  - `getStatesCollection()` - US states reference data
  - `getCountiesCollection()` - US counties reference data
  - `getPublicWaterSystemsCollection()` - EPA SDWIS data
  - Connection pooling and error handling
- **Location**: `packages/db/src/index.ts`

#### `@cl/workers`
- **Purpose**: ETL scripts for data ingestion
- **Scripts**:
  - `ingest-fcc-summary.ts` - FCC broadband data
  - `ingest-sdwis.ts` - EPA water systems
  - `seed-states-counties.ts` - Reference geography data
  - `check-fcc-count.ts`, `clear-fcc-broadband.ts` - Maintenance tools
- **Location**: `packages/workers/src/`
- **Run**: `pnpm workers:ingest:sdwis` or `tsx packages/workers/src/{script}.ts`

---

### Environment Variables

**Required for Production**:
```bash
# Database
MONGO_URI=mongodb+srv://...
MONGO_DB=civic-lifeline-prod
REDIS_URL=redis://...

# External APIs
BLS_API_KEY=...                          # Bureau of Labor Statistics
USDA_SNAP_ARCGIS_URL=https://...         # USDA SNAP retailers
HUD_TOKEN=...                            # HUD APIs (when live)

# Geocoding
# No key needed for Nominatim (rate limited)

# Resume PDF Generation
# Uses locally-installed Chromium in dev
# Uses @sparticuz/chromium in production (no config needed)

# Optional: Timeouts & Tuning
USDA_SNAP_TIMEOUT_MS=45000
SDWIS_PAGE_SIZE=1000
SDWIS_MAX_ROWS=500000
```

**Local Development**:
- Copy `.env.example` to `.env`
- Local MongoDB/Redis recommended (or use cloud free tier)
- Most features work without API keys (use mock data or skip)

---

### Testing

**Unit Tests**:
- Framework: Vitest
- Location: `*.test.ts` files throughout codebase
- Run: `pnpm test`
- Examples:
  - API route logic: `app/api/*/lib.test.ts`
  - Utilities: `packages/utils/src/bbox.test.ts`
  - Type validation: `packages/types/tests/api.test.ts`
  - Resume formatting: `lib/resume/utils/*.test.ts`

**Integration Tests**:
- Contract tests with fixtures: `resume/fixtures/resume-sample.json`
- Shared test utilities in `app/api/housing/_shared/*.test.ts`

**E2E Tests** (Future):
- Framework: Playwright (configured via `playwright.config.ts`)
- Location: Not yet implemented (placeholder config exists)
- Plan: Test critical user flows (food search, resume generation, stats lookup)

**Test Coverage**:
- API route logic: ~70%+ (focused on data transformation)
- Utilities: ~90%+ (bbox, logger, etc.)
- Components: Minimal (opportunity for improvement)

---

### Deployment

**Production Stack**:
- **Web/API**: Vercel (serverless Next.js)
  - Region: US East (configurable)
  - Build: `pnpm build` → static pages + API routes
  - Environment: All secrets in Vercel env vars
  - Rollback: Instant via Vercel UI
- **Workers**: Koyeb (containerized Node.js)
  - Cron triggers: `koyeb/cron-fcc.yaml`
  - Git deploy: Auto-deploy on push to main
  - Logs: Structured JSON to stdout
- **Database**: MongoDB Atlas
  - Free tier sufficient for MVP
  - Indexes: Auto-created by ingestion scripts
  - Backup: Daily snapshots
- **Cache**: Redis Cloud (or Upstash)
  - Persistence: Optional (cache can rebuild)
  - Eviction: LRU with max memory limit

**CI/CD Pipeline**:
1. **Lint**: `pnpm lint` (ESLint + Prettier)
2. **Type Check**: `pnpm typecheck` (TypeScript)
3. **Unit Tests**: `pnpm test` (Vitest)
4. **Build**: `pnpm build` (Next.js production build)
5. **Deploy**: Vercel auto-deploy on merge to main
6. **Preview**: Vercel preview URLs for PRs

**Monitoring & Observability**:
- **Logs**: Structured JSON via Pino, shipped to Vercel logs
- **Metrics**: Vercel Analytics (Web Vitals, traffic)
- **Errors**: Vercel error logs (consider Sentry for advanced tracking)
- **Uptime**: `/healthz` endpoint (checks cache, DB, external APIs)
- **Alerts**: Vercel notifications for build failures

**Rollback Strategy**:
- **Web/API**: Vercel instant rollback to previous deployment
- **Workers**: Koyeb rollback to previous release
- **Data**: Retain previous FCC/SDWIS snapshots for blue/green ETL

---

### Security & Privacy

**User Privacy**:
- No registration required for core features
- Location data not persisted (transient for queries only)
- No cookies except essential Next.js session
- No third-party analytics trackers (Vercel Analytics is first-party)

**Data Security**:
- All API requests server-side (no direct external API calls from browser)
- Secrets in environment variables (never committed)
- PII redaction in logs (coordinates, addresses, names)
- HTTPS everywhere (enforced by Vercel/Koyeb)

**Rate Limiting**:
- Geocoding: 1 req/sec per IP (token bucket)
- API routes: Rely on Vercel's DDoS protection
- Consider Vercel Edge Middleware for stricter limits if needed

**Content Security**:
- Next.js default CSP headers
- CORS: Allow same-origin only (no public API access)

---

### Development Workflow

**Setup**:
```bash
# Clone repo
git clone https://github.com/your-org/civic-lifeline.git
cd civic-lifeline

# Install dependencies
pnpm install

# Set up environment
cp .env.example .env
# Edit .env with your local MongoDB/Redis

# Seed reference data (optional)
pnpm workers:seed:states-counties

# Start dev server
pnpm dev
# Open http://localhost:3000
```

**Common Tasks**:
```bash
# Run specific app
pnpm --filter @web dev

# Build all packages
pnpm build

# Run workers
pnpm workers:ingest:sdwis
pnpm workers:ingest:fcc

# Format code
pnpm format

# Type check
pnpm typecheck

# Run tests
pnpm test
```

**Code Organization**:
- **API Routes**: `apps/web/app/api/{feature}/route.ts`
- **Pages**: `apps/web/app/{feature}/page.tsx`
- **Components**: `apps/web/components/{ComponentName}.tsx`
- **Hooks**: `apps/web/hooks/use{HookName}.ts`
- **Utilities**: `apps/web/lib/{feature}/*.ts`
- **Types**: `packages/types/src/*.ts`

**Documentation**:
- **Architecture**: `docs/architecture/`
- **Features**: `docs/{feature}/`
- **Resume Builder**: `docs/resume-builder/` (comprehensive)
- **Planning**: `docs/*.md` (roadmap, personas, etc.)

---

### Performance Optimization

**Frontend**:
- Dynamic imports for heavy components (MapView, TimeSeriesChart)
- React Query placeholderData to prevent layout shift
- Debounced search inputs (400ms)
- Responsive images (none currently, opportunity for improvement)

**Backend**:
- Redis caching with TTLs (10min-24h depending on data freshness)
- Parallel API calls via `Promise.all` (housing/utilities)
- Pagination/limits on large datasets (max 500 SNAP retailers, 1000 water systems)
- Connection pooling (MongoDB global singleton)

**Database**:
- Indexes on frequently queried fields (county FIPS, state code)
- Projection to limit returned fields
- Aggregation pipelines for complex queries (future)

**Edge Cases Handled**:
- Upstream API timeouts → friendly error messages
- Missing data → empty states with explanatory text
- Rate limits → 429 with retry-after header
- Invalid coordinates → clamp to world bounds
- Partial SDWIS records → skip with logged reason

---

### Contributing Guidelines

**Code Style**:
- TypeScript strict mode enabled
- ESLint + Prettier configured
- Run `pnpm format` before committing
- Component naming: PascalCase
- File naming: camelCase for utils, PascalCase for components

**Commit Messages**:
- Conventional Commits format (recommended)
- Examples: `feat: add water provider search`, `fix: handle missing county FIPS`

**Pull Requests**:
- Keep PRs focused on single feature/fix
- Include tests for new API routes
- Update documentation in `/docs` if needed
- Wait for CI to pass before merging

**Branch Strategy**:
- `main` branch for production
- Feature branches: `feature/{name}`
- Bug fixes: `fix/{name}`

---

### Roadmap & Future Enhancements

See `docs/01-civic-lifeline-roadmap.md` and `docs/product/roadmap.md` for detailed plans.

**Near-term**:
- Complete E2E test suite (Playwright)
- Add Sentry error tracking
- Implement AI coach feature (`/api/ai/coach`)
- Add letter generation tool (`/api/ai/letters`)
- Restore live HUD FMR API when shutdown ends

**Medium-term**:
- User accounts (optional, for saved searches)
- Community resource submission + moderation
- Mobile app (React Native or PWA)
- Offline mode for critical features
- Spanish language support

**Long-term**:
- Expand to additional states/territories
- Partner integrations (food banks, job boards)
- Advanced filtering/sorting
- Personalized recommendations
- Accessibility audit + improvements (WCAG 2.1 AA)

---

### Troubleshooting

**Common Issues**:

1. **MongoDB connection fails**:
   - Check `MONGO_URI` in `.env`
   - Verify IP whitelist in MongoDB Atlas
   - Ensure network connectivity

2. **Redis cache errors** (non-fatal):
   - Check `REDIS_URL` in `.env`
   - Verify Redis instance is running
   - API will work without cache (slower)

3. **USDA SNAP map not loading**:
   - Check browser console for CORS errors
   - Verify `USDA_SNAP_ARCGIS_URL` env var
   - Upstream may be down (temporary)

4. **Resume PDF generation fails**:
   - Local: Ensure Chromium is installed (`npx puppeteer browsers install chrome`)
   - Vercel: Check function timeout limits (default 10s, may need 60s for PDFs)

5. **Geocoding rate limited**:
   - Nominatim enforces 1 req/sec
   - Wait 1 second between requests
   - Increase local cache if needed

**Debugging**:
- Enable debug logs: Set `LOG_LEVEL=debug` in `.env`
- Check Vercel function logs for API errors
- Use `?debug=true` query param on API routes (where supported)
- Monitor Redis with `redis-cli MONITOR` (local dev)

---

### Support & Contact

**Documentation**:
- Architecture: `docs/architecture/`
- API Contracts: `docs/architecture/api-contracts.md`
- Data Sources: `docs/architecture/data-sources.md`

**Community**:
- GitHub Issues: Bug reports, feature requests
- Discussions: General questions, ideas

**Team**:
- Maintainer: Civic Lifeline Team
- Email: contact@civiclifeline.org (if applicable)

---

### License

(To be determined - likely MIT or similar open source license)

---

### Acknowledgments

**Data Sources**:
- USDA Food and Nutrition Service (SNAP retailers)
- Bureau of Labor Statistics (unemployment data)
- U.S. Census Bureau (demographics, utilities)
- Department of Housing and Urban Development (FMR, counselors)
- Federal Communications Commission (broadband coverage)
- Environmental Protection Agency (water systems)
- OpenStreetMap / Nominatim (geocoding)

**Open Source**:
- Next.js, React, TypeScript
- Leaflet, Recharts, TanStack Query
- Zod, Puppeteer, Handlebars
- And many more (see `package.json` for full list)

---
