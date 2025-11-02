PROMPT 06 — Frontend minimal hook (optional MVP)
Create a minimal frontend hook to call the API:

1) In client code (React), add `apps/web/lib/resume/download-pdf.ts` with a `downloadPdf(payload, template)` helper that POSTs to `/api/pdf?template=${template}`, receives a Blob, and triggers a download named `resume-${template}.pdf`.

2) Embed the UI on `/resume` (update `apps/web/app/resume/page.tsx`) so the section renders as the primary content:
   - A select with options: classic, modern, minimal
   - A button “Preview Resume” that calls `downloadPdf(...)` or similar helper
   - (Optional) Save draft in localStorage under key `resume.draft` (do not over-engineer).
   - (Optional) add a redirect from `/jobs` to `/resume` for legacy links.

Acceptance:
- Show the new/updated file paths and a short code excerpt of the `downloadPdf` function and the JSX snippet for the selector + button.
Stop and wait.
