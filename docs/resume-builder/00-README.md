# Project Goal

Ship a server-side resume PDF builder inside the existing Next.js app (deployed on Koyeb). Job seekers visit `/jobs` (scroll to “Build Your Resume”), fill in their details, choose Classic / Modern / Minimal, and receive a print-ready PDF rendered by Playwright (Chromium) from Handlebars templates.

## Why Next.js + Playwright

- Single deployment: the API route (`/api/pdf`) sits next to the frontend, so there is no extra service to manage.
- Full control over typography and pagination via Playwright-generated PDFs.
- Extensible: new templates, email delivery, or storage can be layered on without changing hosting topology.

## Quick Start (Dev)

```bash
pnpm install            # installs workspaces + Playwright Chromium (postinstall)
pnpm --filter @web dev  # runs Next.js locally on http://localhost:3000
```

Generate a PDF:

```bash
curl -X POST 'http://localhost:3000/api/pdf?template=modern' \
  -H 'Content-Type: application/json' \
  --data @apps/web/resume/fixtures/resume-sample.json \
  --output resume-modern.pdf
```

See `02-data-contract.md` for the payload shape.

## Deliverables

- Next.js API route: `POST /api/pdf`
- Three templates: `classic.hbs`, `modern.hbs`, `minimal.hbs`
- Shared partials + design tokens for typography/spacing
- Playwright renderer with Chromium caching + graceful shutdown
- Zod validation + privacy-safe logging (request id, template, duration)
- Dockerfile additions for Chromium dependencies and Koyeb deployment tips
