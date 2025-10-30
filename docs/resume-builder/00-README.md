# Project Goal

Build a server-side resume PDF builder integrated into the existing Koyeb Express API (no separate worker). Users fill a form on /jobs (or /resume), select a template (Classic, Modern, Minimal), and receive a print-quality PDF generated via Playwright (Chromium) from HTML templates (Handlebars).

## Why this design

- Consistency: server controls fonts, pagination, headers/footers.
- Simplicity: single service; no queues, no workers.
- Extensibility: easy to add templates, email delivery, storage.

## Quick Start (Dev)

```bash
npm i express playwright handlebars zod pino nanoid
npx playwright install --with-deps chromium
```

Run dev API: `node server.js` (or your existing dev script)

POST to `POST /api/pdf?template=modern` with JSON body (see 02-data-contract.md).

## Deliverables

- API route: POST /api/pdf
- Three templates: classic.hbs, modern.hbs, minimal.hbs
- Fonts: Google Fonts (with option to self-host)
- PDF renderer service (Playwright)
- Validation (Zod) + basic rate limiting
- Dockerfile additions + Koyeb notes