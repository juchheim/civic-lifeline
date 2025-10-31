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
- Content-Disposition: attachment; filename="resume-<template>.pdf"

## Curl Example

```bash
curl -X POST 'https://<host>/api/pdf?template=modern' \
  -H 'Content-Type: application/json' \
  --data '@payload.json' \
  --output resume-modern.pdf
```

## Implementation Notes

- Route lives at `apps/web/app/api/pdf/route.ts` (Next.js app router).
- Uses `globalThis.__RESUME_BROWSER__` to reuse one Playwright browser per process.
- Logs only request id, template, duration (and optional error message) via pino.
- Validate payloads with `ResumeSchema` before compiling Handlebars templates.

See `04-templates.md` for template structure and shared partials.
