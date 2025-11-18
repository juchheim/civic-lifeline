# Resume PDF API Routes

## POST /api/pdf?template=<classic|modern|minimal>

Generates a PDF from resume data and returns a preview URL.

**Body**: ResumePayload (see 02-data-contract.md)

**Query Parameters**:
- `template` (required): One of `classic`, `modern`, or `minimal`

### Responses

- `201 application/json` — PDF generated successfully
  ```json
  {
    "pdfId": "abc123",
    "previewUrl": "https://example.com/api/resume/pdf/abc123",
    "filename": "resume-john-doe-classic.pdf"
  }
  ```
- `400 application/json` — validation error
  ```json
  {
    "error": "Please fix the following",
    "details": "Please enter your full name (at least 2 letters)."
  }
  ```
- `422 application/json` — unsupported template
  ```json
  {
    "error": "Unsupported template"
  }
  ```
- `500 application/json` — render failure
  ```json
  {
    "error": "PDF generation failed",
    "details": "Error message"
  }
  ```

### Headers

- `X-Request-Id`: Unique request identifier (nanoid)
- `Cache-Control`: `no-store` (PDF contains PII)
- `Content-Type`: `application/json`

### Curl Example

```bash
curl -X POST 'https://<host>/api/pdf?template=modern' \
  -H 'Content-Type: application/json' \
  --data '@payload.json'
```

### Implementation Notes

- Route lives at `apps/web/app/api/pdf/route.ts` (Next.js app router).
- Uses `globalThis.__RESUME_BROWSER__` to reuse one Puppeteer browser per process.
- Logs only request id, template, duration (and optional error message) via pino.
- Validates payloads with `ResumeSchema` before compiling Handlebars templates.
- Saves PDF to storage and returns preview URL (not direct PDF download).
- PDF is stored with unique ID for later retrieval.

---

## GET /api/resume/pdf/[id]

Retrieves a previously generated PDF by ID.

**Path Parameters**:
- `id` (required): PDF ID returned from POST /api/pdf

### Responses

- `200 application/pdf` — PDF file
  - Headers:
    - `Content-Type`: `application/pdf`
    - `Content-Disposition`: `inline; filename="resume-<name>-<template>.pdf"`
    - `Cache-Control`: `no-store`
- `404 application/json` — PDF not found or expired
  ```json
  {
    "error": "PDF not found or expired"
  }
  ```

### Implementation Notes

- Route lives at `apps/web/app/api/resume/pdf/[id]/route.ts`.
- PDFs are stored temporarily and may expire.
- Used for preview and download functionality.
- No PII in logs.

### Usage Flow

1. Client calls `POST /api/pdf?template=modern` with resume data
2. Server generates PDF, saves it, returns `{ pdfId, previewUrl, filename }`
3. Client opens `previewUrl` (GET /api/resume/pdf/[id]) in new tab for preview
4. Client can also download directly using the same URL

See `04-templates.md` for template structure and shared partials.
