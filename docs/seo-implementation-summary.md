# SEO & AI Indexing Implementation Summary

**Date:** 2025-01-15  
**Status:** ✅ Complete

---

## Overview

Comprehensive SEO metadata and AI indexing implementation for Civic Lifeline, including:
- Traditional SEO (metadata, OG/Twitter cards, sitemaps)
- AI crawler support (robots.txt rules, llms.txt)
- Structured data (JSON-LD schemas)
- PWA manifest

---

## Files Created

### New Files

1. **`apps/web/app/food/layout.tsx`**
   - Metadata for Food Access page (client component wrapper)
   - WebApplication structured data
   - FAQ structured data (4 questions)

2. **`apps/web/app/stats/layout.tsx`**
   - Metadata for Stats page (client component wrapper)
   - WebApplication structured data
   - Dataset structured data

3. **`apps/web/app/sitemap.ts`**
   - Dynamic sitemap generation
   - 5 main routes with priorities and change frequencies

4. **`apps/web/app/robots.ts`**
   - Robots.txt with AI crawler rules
   - 13 specific user agents (including GPTBot, ClaudeBot, Google-Extended, etc.)
   - Sitemap reference

5. **`apps/web/public/llms.txt`**
   - Comprehensive AI guidance document
   - Feature descriptions, data sources, usage guidelines
   - 100+ lines of structured information for AI systems

6. **`apps/web/app/manifest.ts`**
   - PWA manifest for installable web app
   - Icons configuration (192x192, 512x512)

### Modified Files

1. **`apps/web/app/layout.tsx`**
   - Enhanced metadata with all fields (title template, description, keywords, OG, Twitter, robots)
   - 18 keywords covering all features
   - metadataBase configuration

2. **`apps/web/app/page.tsx`**
   - Page-specific metadata
   - WebSite structured data with SearchAction
   - ItemList structured data (4 main services)

3. **`apps/web/app/resume/page.tsx`**
   - Enhanced metadata with keywords
   - WebApplication structured data
   - HowTo structured data (7-step resume creation guide)

4. **`apps/web/app/housing-utilities/page.tsx`**
   - Enhanced metadata with keywords
   - WebApplication structured data
   - FAQ structured data (4 questions)

---

## Metadata by Page

### Root Layout (Global Defaults)

**Title Template:** `%s | Civic Lifeline`  
**Default Title:** Civic Lifeline — Essential Resources & Tools  
**Description:** Free tools and verified public data for food assistance, housing help, job resources, and essential services. No registration required. SNAP retailers, HUD counselors, unemployment stats, and more.

**Keywords (18):**
- SNAP retailers, food assistance, EBT stores
- resume builder
- housing counselors, fair market rent
- unemployment statistics, broadband coverage, utility costs
- HUD counselors, BLS LAUS
- community resources, essential services
- USDA SNAP, Census data
- free tools, no registration, verified data

**Open Graph:**
- Type: website
- Locale: en_US
- Image: `/opengraph-image.png` (1200x630)
- Sitename: Civic Lifeline

**Twitter Card:**
- Card type: summary_large_image
- Image: `/twitter-image.png`

---

### Homepage (/)

**Title:** Home  
**Description:** Find the help you need with free tools and verified data. Locate SNAP retailers, build resumes, find housing counselors, check utility costs, and view unemployment statistics.

**Structured Data:**
- **WebSite schema** with SearchAction (geocode suggest API)
- **ItemList schema** with 4 main services (position 1-4)

---

### Food Access (/food)

**Title:** Food Access — Find SNAP Retailers  
**Description:** Find stores that accept SNAP benefits near you using an interactive map. Filter by store type and locate EBT-accepting retailers. Data from USDA SNAP Retailer Database.

**Keywords (12):**
- SNAP retailers, EBT stores, food assistance
- SNAP benefits, food stamps, SNAP map
- grocery stores accepting EBT, USDA SNAP
- find SNAP stores, where to use EBT
- food access, SNAP locations

**Structured Data:**
- **WebApplication schema** with 6 features
- **FAQPage schema** with 4 questions:
  - What is SNAP and who can use it?
  - How do I find stores that accept SNAP near me?
  - What data source is used for SNAP retailers?
  - Do you save my location data?

---

### Resume Builder (/resume)

**Title:** Resume Builder — Create Professional Resumes  
**Description:** Free resume builder with guided steps and AI-powered summary support. Create professional resumes quickly and download ready-to-use PDFs instantly. No registration required.

**Keywords (12):**
- resume builder, free resume maker, create resume
- resume template, professional resume
- resume PDF download, AI resume builder
- job application, resume wizard
- guided resume builder, no signup resume, resume help

**Structured Data:**
- **WebApplication schema** with 8 features
- **HowTo schema** with 7 steps:
  1. Choose a Template
  2. Enter Contact Information
  3. Write Professional Summary
  4. Add Skills
  5. Add Work Experience
  6. Add Education
  7. Preview and Download

---

### Housing & Utilities (/housing-utilities)

**Title:** Housing & Utilities — Counselors, Rent Data & Broadband  
**Description:** Find HUD housing counselors, check fair market rent, locate utility providers, and view broadband coverage. Comprehensive housing and utility resources with verified data from HUD, EPA, FCC.

**Keywords (14):**
- housing counselors, HUD counselors
- fair market rent, FMR data
- utility costs, broadband coverage
- water providers, electric providers, gas providers
- internet coverage, housing assistance, utility assistance
- EPA SDWIS, FCC broadband

**Structured Data:**
- **WebApplication schema** with 8 features
- **FAQPage schema** with 4 questions:
  - What is Fair Market Rent (FMR)?
  - How do I find a HUD-approved housing counselor?
  - What utility data sources do you use?
  - How accurate is the broadband coverage data?

---

### Unemployment Statistics (/stats)

**Title:** Unemployment & Local Statistics  
**Description:** View county-level unemployment trends and supporting economic indicators including poverty rates, median income, SNAP participation, education levels, uninsured rates, and housing burden. Data from BLS LAUS and Census ACS.

**Keywords (14):**
- unemployment rate, county statistics, BLS LAUS
- unemployment trends, poverty rate, median income
- SNAP participation, education attainment
- uninsured rate, housing burden
- economic indicators, county metrics
- Census ACS, local statistics

**Structured Data:**
- **WebApplication schema** with 9 features
- **Dataset schema** for county unemployment data (temporal coverage 2018/2025)

---

## Sitemap Configuration

**File:** `apps/web/app/sitemap.ts`

| Route | Priority | Change Frequency | Notes |
|-------|----------|------------------|-------|
| `/` | 1.0 | weekly | Homepage |
| `/food` | 0.9 | daily | Live SNAP data |
| `/resume` | 0.9 | weekly | Tool page |
| `/housing-utilities` | 0.9 | daily | Live HUD/FCC data |
| `/stats` | 0.8 | daily | Live BLS data |

**Environment Variable:** Uses `NEXT_PUBLIC_APP_BASE_URL` with fallback to `https://civiclifeline.org`

---

## Robots.txt Configuration

**File:** `apps/web/app/robots.ts`

### Allowed for All Crawlers
- All public pages (`/`)

### Disallowed for All Crawlers
- `/api/` — API routes
- `/_next/` — Next.js internals

### AI Crawlers Explicitly Allowed (13 user agents)

1. **GPTBot** — OpenAI ChatGPT
2. **ChatGPT-User** — OpenAI ChatGPT browsing
3. **OAI-SearchBot** — OpenAI search indexing
4. **Google-Extended** — Google Bard/Gemini
5. **CCBot** — Common Crawl (used by many AI systems)
6. **ClaudeBot** — Anthropic Claude
7. **anthropic-ai** — Anthropic alternative
8. **PerplexityBot** — Perplexity AI
9. **Applebot-Extended** — Apple Intelligence
10. **FacebookBot** — Meta AI
11. **Diffbot** — Diffbot AI knowledge graph
12. **Googlebot** — Traditional Google search
13. ***** — General crawlers

**Sitemap Reference:** `https://civiclifeline.org/sitemap.xml`

---

## AI Indexing (llms.txt)

**File:** `apps/web/public/llms.txt`

**Purpose:** Provide structured information to AI language models about the site.

**Content Sections:**
1. **Overview** — Site mission and no-fake-data policy
2. **Main Features** — Detailed descriptions of all 4 tools
3. **Target Audience** — Who the site serves
4. **Key Principles** — No fake data, provenance, dignity, privacy, mobile-first
5. **Data Sources** — List of all government sources (USDA, HUD, BLS, FCC, EPA, Census)
6. **Usage Guidelines** — How AI should reference the site
7. **Technical Details** — Platform, database, update frequencies
8. **Data Reliability & Verification** — Transparency practices

**Key Messages for AI:**
- FREE, verified resources from government sources
- No registration or personal data required
- Covers entire United States (not just Mississippi Delta)
- Clear data provenance on every page
- Mobile-first, accessible design

---

## PWA Manifest

**File:** `apps/web/app/manifest.ts`

**Configuration:**
- **Name:** Civic Lifeline — Essential Resources & Tools
- **Short Name:** Civic Lifeline
- **Display:** standalone
- **Background Color:** #f1f5f9 (slate-100)
- **Theme Color:** #0f766e (civic-green/teal-700)
- **Icons:**
  - 192x192 PNG
  - 512x512 PNG

---

## Structured Data Summary

### Schema Types Implemented

1. **WebSite** (Homepage)
   - SearchAction with geocode suggest API
   - MainEntity: ItemList of 4 services

2. **WebApplication** (All tool pages)
   - Food Access, Resume Builder, Housing & Utilities, Stats
   - Free offer (price: 0)
   - Feature lists (6-9 features each)
   - Provider: Civic Lifeline

3. **FAQPage** (Food, Housing & Utilities)
   - 4 questions per page
   - Clear answers with data source attribution

4. **HowTo** (Resume Builder)
   - 7-step guide to creating resumes

5. **Dataset** (Stats page)
   - County unemployment data
   - Creator: BLS + Census Bureau
   - Temporal coverage: 2018/2025

---

## Environment Variables

### Required

```bash
NEXT_PUBLIC_APP_BASE_URL=https://civiclifeline.org
```

**Usage:**
- metadataBase in layout.tsx
- Canonical URLs
- Sitemap generation
- Robots.txt sitemap reference
- Structured data URLs

**Fallback:** If not set, defaults to `https://civiclifeline.org`

---

## Assets to Create Before Launch

### Critical (Referenced in Code)

- [ ] `/opengraph-image.png` — 1200x630px OG image
- [ ] `/twitter-image.png` — 1200x630px Twitter card image
- [ ] `/icon-192x192.png` — PWA icon
- [ ] `/icon-512x512.png` — PWA icon
- [ ] `/favicon.ico` — Browser favicon

### Recommended (Standard)

- [ ] `/apple-icon.png` — 180x180px Apple touch icon
- [ ] Additional favicon sizes (16x16, 32x32)

### Design Notes

**Open Graph / Twitter Images:**
- Include site name "Civic Lifeline"
- Visual showing 4 main tools or key benefit
- High contrast, readable at small sizes
- Text should be large and clear

**PWA Icons:**
- Simple, recognizable logo mark
- Works at small sizes (192px)
- Consider transparent background or solid color

---

## Validation Checklist

### Pre-Launch

- [x] All metadata files created
- [x] No linting errors
- [x] Environment variable documented
- [ ] Set `NEXT_PUBLIC_APP_BASE_URL` in production environment
- [ ] Create all required image assets
- [ ] Test sitemap.xml accessibility (`/sitemap.xml`)
- [ ] Test robots.txt accessibility (`/robots.txt`)
- [ ] Test llms.txt accessibility (`/llms.txt`)
- [ ] Test manifest.json accessibility (`/manifest.json`)

### Post-Launch (Week 1)

- [ ] Validate structured data with [Google Rich Results Test](https://search.google.com/test/rich-results)
- [ ] Validate Open Graph with [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/)
- [ ] Validate Twitter Cards with [Twitter Card Validator](https://cards-dev.twitter.com/validator)
- [ ] Submit sitemap to [Google Search Console](https://search.google.com/search-console)
- [ ] Submit sitemap to [Bing Webmaster Tools](https://www.bing.com/webmasters)

### Post-Launch (Week 2-4)

- [ ] Monitor server logs for AI crawler visits (GPTBot, ClaudeBot, etc.)
- [ ] Test content queries in ChatGPT: "What is Civic Lifeline?"
- [ ] Test content queries in Claude: "Where can I find SNAP retailers?"
- [ ] Test content queries in Perplexity: "How do I find housing counselors?"
- [ ] Verify Google indexing: `site:civiclifeline.org`

---

## Testing Commands

### Local Development

```bash
# Start dev server
pnpm dev

# Test routes
open http://localhost:3000/sitemap.xml
open http://localhost:3000/robots.txt
open http://localhost:3000/llms.txt
open http://localhost:3000/manifest.json

# Lint check
pnpm lint

# Type check
pnpm typecheck

# Build production
pnpm build
```

### Production Testing

```bash
# Test AI crawler access
curl -A "GPTBot" https://civiclifeline.org/
curl -A "ClaudeBot" https://civiclifeline.org/
curl -A "Google-Extended" https://civiclifeline.org/

# Verify sitemap
curl https://civiclifeline.org/sitemap.xml

# Verify robots.txt
curl https://civiclifeline.org/robots.txt

# Verify llms.txt
curl https://civiclifeline.org/llms.txt
```

---

## Success Metrics

### Traditional SEO (30-60 days)

- [ ] All pages indexed by Google (`site:civiclifeline.org` shows 5 results)
- [ ] Rich results appear in Google search (FAQ snippets, etc.)
- [ ] Twitter/Facebook previews show correct images and text
- [ ] Average position for target keywords improves

### AI Indexing (2-8 weeks)

- [ ] AI crawlers accessing site regularly (check server logs)
- [ ] ChatGPT can answer: "What is Civic Lifeline?"
- [ ] Claude can answer: "Where can I find SNAP retailers near me?"
- [ ] Perplexity cites civiclifeline.org when relevant
- [ ] AI responses mention data sources (USDA, HUD, BLS)

---

## Maintenance

### Monthly

- [ ] Review Google Search Console for errors
- [ ] Update llms.txt if major features added
- [ ] Check for new AI crawlers to add to robots.txt

### Quarterly

- [ ] Validate structured data still passes tests
- [ ] Review AI indexing performance
- [ ] Update documentation with learnings

### As Needed

- [ ] Update metadata when page content changes significantly
- [ ] Add new pages to sitemap
- [ ] Regenerate OG images if branding changes

---

## Notes

### Design Decisions

1. **No Coming Soon page in sitemap** — Per user request, excluded placeholder page
2. **AI crawlers explicitly allowed** — All major AI systems given access
3. **Nationwide focus in llms.txt** — Corrected from "Mississippi Delta primarily" to nationwide coverage
4. **Daily change frequency for data pages** — SNAP, Housing, Stats update frequently
5. **Privacy emphasis** — Highlighted in multiple places (metadata, llms.txt, FAQ schemas)

### Performance Considerations

- All structured data is server-rendered (no client-side JSON-LD)
- Metadata calculated at build time when possible
- Environment variable with sensible fallback
- No external API calls for metadata generation

---

## Resources

### Validation Tools

- [Google Rich Results Test](https://search.google.com/test/rich-results)
- [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/)
- [Twitter Card Validator](https://cards-dev.twitter.com/validator)
- [Schema Markup Validator](https://validator.schema.org/)

### Documentation

- [Next.js Metadata API](https://nextjs.org/docs/app/api-reference/functions/generate-metadata)
- [Schema.org Documentation](https://schema.org/)
- [OpenAI GPTBot](https://platform.openai.com/docs/gptbot)
- [Google-Extended](https://developers.google.com/search/docs/crawling-indexing/overview-google-crawlers)
- [llms.txt Specification](https://llmstxt.org/)

---

**Implementation Complete:** All SEO metadata, AI indexing support, and structured data successfully implemented across Civic Lifeline platform. Ready for asset creation and production deployment.

