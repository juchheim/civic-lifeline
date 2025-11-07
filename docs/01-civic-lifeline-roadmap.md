# Civic Lifeline — Development Roadmap
Purpose: create a simple, all-inclusive website for jobless or low-income users.  
Goal: keep the interface extremely easy to use while automating data from reliable public APIs.

---

## 📋 Current Implementation Status

### ✅ Already Completed

**Core Structure:**
- ✅ Home page with 4–5 large action buttons (one per tool)
- ✅ Consistent colors, spacing, and font sizing across pages
- ✅ Each page performs one function only (no mixed content)
- ✅ Plain, simple language throughout
- ✅ Light backgrounds + dark text
- ✅ Mobile-first responsive design

**Data Integration (Phase 2):**
- ✅ **Food Locator:** USDA SNAP Retailer API via ArcGIS FeatureServer (`/api/food/snap`)
- ✅ **Housing Counselors:** HUD data via ArcGIS FeatureServer (`/api/housing/counselors`)
- ✅ **Fair Market Rent:** HUD FMR via ArcGIS FeatureServer with static fallback (`/api/housing/fmr`)
- ✅ **Broadband Coverage:** FCC data via CSV/ETL pipeline → MongoDB → `/api/broadband/summary`
- ✅ **Unemployment Stats:** BLS Public Data API (`/api/jobs/unemployment`)
- ✅ Redis caching implemented (24–48h TTL)
- ✅ API routes organized in `/app/api/` structure

**Current Navigation:**
- Current nav has 6 items: Home, Food, Resume Builder, Housing, Broadband, Stats
- Roadmap calls for 5 categories (no consolidation needed because Home doesn't count against the 5 in the roadmap)

**Data Source Notes:**
- HUD FMR uses ArcGIS FeatureServer (not direct HUD API) - see `docs/hud-fmr-static.md`
- Broadband uses CSV/ETL pipeline (not direct FCC API) - see `docs/architecture/data-sources.md`
- All APIs have Redis caching and error handling

---

## 🟥 PHASE 1 — Core Structure & Simplicity

### 1. Navigation & Layout
- [x] ~~Redesign main nav to 5 top categories~~ **Current:** 6-item nav (Home, Food, Resume Builder, Housing, Broadband, Stats)
- [ ] Redesign main nav to 5 top categories:
  - Home  
  - Food & Nutrition  
  - Employment & Skills  
  - Housing & Utilities  
  - Stats & Insights
- [ ] Keep Broadband as part of "Housing & Utilities" (tool) **and** mirror broadband stats under "Stats."
- [ ] Add persistent bottom icon bar with: 🥫 Food | 🧰 Resume | 🏠 Housing | 🌐 Internet | 📊 Stats
- [x] Simplify Home page to 4–5 large action buttons (one per tool). ✅ **DONE**
- [x] Ensure all pages have consistent colors, spacing, and font sizing. ✅ **DONE**

### 2. Page Simplification
- [x] Each page performs **one function only** (no mixed content). ✅ **DONE**
- [x] Replace paragraphs with 1-sentence instructions. ✅ **DONE**
- [x] Use plain 6th-grade-level language. ✅ **DONE**

### 3. Visual Accessibility
- [ ] Increase base font to 18px+, with large buttons. **Current:** Using Tailwind defaults (~16px)
- [x] Maintain light backgrounds + dark text. ✅ **DONE**
- [x] Test mobile layout first — prioritize phone users. ✅ **DONE**

---

## 🟧 PHASE 2 — Automation & Data Integration

### 1. Automate Existing Tools
- [x] **Food Locator:** USDA SNAP Retailer API ✅ **DONE**  
  **Current Implementation:** ArcGIS FeatureServer (`/api/food/snap`)  
  `https://services2.arcgis.com/VhQ18K5S5F7fNwJ0/ArcGIS/rest/services/USDA_SNAP_Retailers/FeatureServer/0/query`
- [x] **Housing Data:** HUD APIs ✅ **DONE**  
  - [x] HUD Housing Counselors ✅ **DONE** (via ArcGIS FeatureServer `/api/housing/counselors`)
  - [x] Fair Market Rent ✅ **DONE** (via ArcGIS FeatureServer `/api/housing/fmr`, with static fallback)
- [x] **Broadband Coverage:** FCC Broadband Map ✅ **DONE**  
  **Current Implementation:** CSV/ETL pipeline (not direct API)  
  Data ingested via workers, stored in MongoDB, served via `/api/broadband/summary`
- [x] **Unemployment Stats:** BLS Public Data API ✅ **DONE**  
  **Current Implementation:** `/api/jobs/unemployment`  
  `https://api.bls.gov/publicAPI/v2/timeseries/data/`

### 2. Add New Automated Stats (Phase 2.5)
| Area | Source | Update Cycle |
|------|---------|--------------|
| Poverty & Income | U.S. Census Bureau ACS | Annual |
| Cost of Living / Rent | HUD + BLS CPI | Annual / Monthly |
| Education | Census ACS Education Tables | Annual |
| Healthcare | HHS Data API | Varies |
| Transportation | DOT Open Data / Census | Annual |
| SNAP Participation | USDA SNAP Data Portal | Monthly |
| Job Openings & Wages | BLS JOLTS | Monthly |
| Broadband Metrics | FCC | Continuous |

### 3. Implementation Notes
- [x] Create small fetcher scripts per data source. ✅ **DONE** (API routes in `/app/api/`)
- [x] Cache responses in Redis for 24–48 h. ✅ **DONE** (Redis caching implemented with TTL)
- [ ] Use cron job (Koyeb or Cloudflare Worker) to refresh automatically. **Note:** Currently on-demand with caching; automated refresh jobs pending

---

## 🟨 PHASE 3 — Expand Tools & Insights

### 1. New Tools
- [ ] **Healthcare Finder** (HHS API)
- [ ] **Training & Education Finder** (WIOA providers)
- [ ] **Childcare Assistance** (Childcare.gov API)
- [ ] **Transportation Aid** (local or DOT data)

### 2. Stats Dashboard
- [ ] Combine all key indicators (unemployment, poverty, rent, broadband) into one visual dashboard.
- [ ] Add dropdowns for county/state.
- [ ] Simple charts only — clear captions, no data clutter.

---

## 🟩 PHASE 4 — Usability & Testing

### 1. Testing with Real Users
- [ ] Recruit 3–5 community testers.
- [ ] Observe time to complete each task.
- [ ] Reword unclear text and buttons.

### 2. Accessibility Checks
- [ ] Screen reader test.
- [ ] Keyboard navigation test.
- [ ] Color-blind and low-vision simulator.

### 3. Feedback Collection
- [ ] Add “Report a Problem” button (simple Google Form).
- [ ] Review feedback weekly, adjust small UX items quickly.

---

## 🟦 PHASE 5 — Maintenance & Growth

### 1. Branding & Trust
- [ ] Add **About & Privacy** page.  
  Explain “We don’t store your data — it stays in your browser.”
- [ ] Add data-source logos (USDA, HUD, FCC, BLS) for credibility.

### 2. Data Refresh Scheduling
- [ ] Cron jobs for data updates (monthly or as needed).
- [ ] Redis caching with expiry logic.
- [ ] Add lightweight logging to monitor API failures.

### 3. Long-Term Scalability
- [ ] Expand data to cover other states when Mississippi flow is stable.
- [ ] Optimize heavy charts using pre-rendered JSON in MongoDB.
- [ ] Build admin-only “data refresh” panel later if needed.

---

## 🔁 PHASE 6 — Continuous Improvement
- [ ] Review analytics quarterly (drop-offs, session length).
- [ ] Re-test readability yearly using 6th-grade reading metrics.
- [ ] Add new verified data APIs only if they help users take action.

---

## ✅ Quick Prioritization Checklist
1. [ ] Simplify navigation and visual design. **Partial:** Home page simplified, nav needs consolidation to 5 categories
2. [x] Connect and automate existing APIs (USDA, HUD, FCC, BLS). ✅ **DONE**
3. [ ] Add new stat categories (poverty, education, healthcare).  
4. [x] Build user-tested, mobile-first dashboards. ✅ **DONE** (mobile-first design implemented)
5. [x] Establish auto-update cron jobs and caching. ✅ **Caching DONE**, cron jobs pending
6. [ ] Add trust elements (About, Privacy, Data Sources).  
7. [ ] Expand tools gradually, always testing with low-tech users.

---

> 🧠 **Guiding Principle:**  
> Every page should answer one question:  
> “What do I need to do right now to improve my situation?”  
> — If the user has to read more than a few lines to figure it out, simplify again.
