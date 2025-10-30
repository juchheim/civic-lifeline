# Objectives & KPIs

- p95 time‑to‑PDF (TTPDF) ≤ 3s on 1 vCPU / 1GB (sample payload).
- Success rate ≥ 99% (no 5xx) during smoke tests (100 sequential requests).
- Zero PII persistence: logs contain only request id, template, duration.
- A11y: Frontend form meets WCAG 2.2 AA (labels, focus, keyboard nav, contrast).

# Milestones & Deliverables

## Phase 1 — MVP (Backend PDF)

### Deliverables

- POST /api/pdf?template=classic|modern|minimal route.
- 3 Handlebars templates with Google Fonts.
- Playwright renderer with printBackground: true and A4 margins.
- Zod validation + basic IP rate limit (e.g., 30/min).
- Dockerfile with Chromium deps; healthcheck route /healthz.

### Acceptance Criteria

- Returns a valid PDF for all three templates using the sample payload.
- p95 TTPDF ≤ 3s (10-run average) on Koyeb free/entry tier.
- 400 for validation errors; 422 for bad template; structured 500 otherwise.
- No personal fields in logs.

## Phase 2 — UX Upgrades (Frontend)

### Deliverables

- Resume Builder form + template selector.
- Client-side validation mirroring Zod rules.
- LocalStorage autosave for draft data (opt‑out toggle).
- Preview pane (approximate HTML preview using the same tokens/fonts).

### Acceptance Criteria

- Users can switch templates and see immediate visual change in preview.
- Form prevents submit on invalid inputs; inline error messages and focus.
- Draft persists across refresh; "Reset" clears all.

## Phase 3 — Integrations (Optional)

### Deliverables

- Email PDF (Brevo/Resend) with explicit consent checkbox.
- Temporary storage (R2/S3) for 15‑minute signed download links.
- AI bullet assistant (local Ollama / OpenAI), rate‑limited to 5 uses/day/user.
- i18n + RTL fonts (e.g., Noto Sans family) template support.

### Acceptance Criteria

- Email sends include request id in subject; links expire as configured.
- AI suggestions never auto‑submit; user must approve edits.

## Phase 4 — Reliability & Ops

### Deliverables

- Reuse single Playwright browser instance; graceful shutdown hooks.
- Self‑hosted fonts to remove CDN dependency.
- Observability: pino logs + request id; basic metrics (count, latency, error rate).
- Load test profile + error budget (e.g., 0.1% 5xx weekly).

### Acceptance Criteria

- Under 5 concurrent requests, no memory leaks; CPU returns to baseline within 30s.
- Fonts render identically offline (self‑host) vs online (Google Fonts)

## Risks & Mitigations

- High CPU/memory under burst → simple IP rate limit + 429, consider queue later.
- Font CDN outage → self‑host fonts; cache‑control headers.
- Large payloads → enforce body size limit (e.g., 200KB) and array caps via Zod.

## Timeline (Indicative)

- Week 1: Phase 1
- Week 2: Phase 2
- Week 3–4: Phase 3 (optional)
- Week 4+: Phase 4 hardening

## Definition of Done (overall)

Meets KPIs, passes smoke/load tests, a11y checked, and documented (README updated).

## Out of Scope (for now)

Workers/queues, persistent resume storage, multi‑tenant theming engine.