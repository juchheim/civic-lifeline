# Project Goal

Ship a server-side resume PDF builder inside the existing Next.js app (deployed on Vercel). Job seekers visit `/jobs` (scroll to "Build Your Resume"), fill in their details, choose Classic / Modern / Minimal, and receive a print-ready PDF rendered by Puppeteer (Chromium) from Handlebars templates.

## Why Next.js + Puppeteer + @sparticuz/chromium

- **Single deployment**: the API route (`/api/pdf`) sits next to the frontend, so there is no extra service to manage.
- **Serverless-friendly**: `@sparticuz/chromium` is optimized for AWS Lambda (Vercel's infrastructure).
- **Full control**: typography and pagination via Chromium-generated PDFs.
- **Extensible**: new templates, email delivery, or storage can be layered on without changing hosting topology.

## Quick Start (Dev)

```bash
pnpm install            # installs workspaces + dependencies
pnpm --filter @web dev  # runs Next.js locally on http://localhost:3000
```

**Note**: Puppeteer uses locally-installed Chromium during development. On Vercel (production), it uses `@sparticuz/chromium`.

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
- Puppeteer renderer with serverless Chromium (`@sparticuz/chromium`)
- Chromium browser caching per Lambda container + graceful shutdown
- Zod validation + privacy-safe logging (request id, template, duration)
- Vercel-optimized configuration for serverless deployment

## Architecture

See [`01-architecture.md`](./01-architecture.md) for the full flow and [`07-deployment-vercel.md`](./07-deployment-vercel.md) for deployment details.
