# Roadmap

## Phase 1 — Spine (Food + Provenance)
- USDA SNAP map with bbox search, filters, SourceChip, EmptyState.
- ETL nightly snapshot; Redis caching.
- **Exit**: Real retailers visible for MS counties; Lighthouse ≥90.

## Phase 2 — AI Coach + Letters
- Private coach with disclaimers + citations.
- Letter wizard (repair request, benefits inquiry) → PDF to S3.
- **Exit**: Letter PDF generated in <5s; citations appear.

## Phase 3 — Jobs/Skills (BLS) + Resume Builder
- County unemployment chart (last 5–10 years).
- Resume/cover builder (user facts → AI phrasing) → PDF.
- **Exit**: Chart renders with cached series; PDF export works offline-ready.

## Phase 4 — Broadband (FCC) + Housing (HUD)
- FCC CSV ingestion; county summaries.
- HUD counselor search + FMR panel.
- **Exit**: County selection updates broadband stats; counselors visible.

## Phase 5 — Community Submissions + Moderation
- Submit Wi-Fi/food pantry; moderation queue; verification notes.
- **Exit**: Unverified stays hidden; audit trail stored.

## Phase 6 — Hardening & A11y
- Rate limits/retries; monitoring; WCAG 2.2 AA audit pass; SEO polish.

> Stretch: Alerts, bilingual mode, county comparisons, Go ETL microservice.

---

Last updated: 2025-10-29 — CI stabilized for workers TypeScript build (Docker).
