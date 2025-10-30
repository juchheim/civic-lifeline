# POST /api/pdf?template=<classic|modern|minimal>

Body: ResumePayload (see 02-data-contract.md)

## Responses

- `200 application/pdf` — Content-Disposition: attachment; filename="resume-<template>.pdf"
- `400 application/json` — validation error
- `422 application/json` — unsupported template
- `500 application/json` — render failure

## Headers

- Cache-Control: no-store (PDF contains PII)
- X-Request-Id (nanoid)

## Curl Example

```bash
curl -X POST 'https://<host>/api/pdf?template=modern' \
  -H 'Content-Type: application/json' \
  --data '@payload.json' \
  --output resume-modern.pdf
```

## Rate Limiting (optional MVP)

- Simple IP-based sliding window (e.g., 30/min)
- Return 429 Too Many Requests

---

# 04-templates.md

## Files

- `templates/classic.hbs` – Serif, conservative
- `templates/modern.hbs` – Sans, blue accents
- `templates/minimal.hbs` – Monospace minimal
- `templates/partials/` – shared helpers (e.g., header, footer)

## Using Google Fonts

Add `<link href="https://fonts.googleapis.com/css2?..." rel="stylesheet">` in `<head>`.

Playwright will fetch and embed into PDF.

## Self-Host Option (recommended for reliability)

- Download font subsets (e.g., woff2) at build-time.
- Serve from /public/fonts and reference with absolute URLs.

## CSS & Pagination

- Use `@page { margin: 20mm }` for consistent print margins.
- Use `.page-break { page-break-before: always; }` for multi-page control.
- Avoid very light weights; ensure sufficient print contrast.

## Helpers (optional)

Register Handlebars helpers for join, formatDate, safeUrl.