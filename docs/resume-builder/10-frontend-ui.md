# Goal

Deliver an accessible resume builder section within `/jobs` that posts to `POST /api/pdf?template=...`, lets users pick a template, and downloads a Playwright-rendered PDF. Future iterations can layer on richer preview and editing tools.

## User Stories

- As a job seeker, I can fill out my info and download a PDF in one click.
- As a returning user, my draft auto‑restores (localStorage) so I don't lose work.
- As a user, I can switch templates (Classic/Modern/Minimal) and see a preview.
- As a keyboard user/screen‑reader user, I can complete the form without a mouse.

## Routes & IA

- `/jobs` — see `apps/web/app/jobs/page.tsx`; the resume builder renders beneath the unemployment chart inside `<ResumeBuilderSection />`.
- Optional future enhancement: add a second column or modal preview when templates grow.

## Components

- `apps/web/components/resume/ResumeBuilderSection.tsx` — main UI, stores payload/template, handles localStorage + status messaging.
- `apps/web/app/resume/page.tsx` — lightweight redirect to `/jobs#resume-builder` for legacy links.
- `apps/web/lib/resume/download-pdf.ts` — browser helper that posts to `/api/pdf` and triggers downloads.
- `apps/web/resume/shared/templates.ts` — authoritative template list for both client & server.
- Future: extract sub-forms (experience, education, links) once full data entry is added.

## State Management

- Local React state holds `ResumePayload` + selected template.
- Draft auto-saves to `localStorage` (`resume.draft`) with a 600 ms debounce.
- Reset clears state and removes the storage key.

## Data Model (client)

Mirror ResumePayload (see 02-data-contract.md).

## Validation

- Client Zod schema identical to server.
- Inline errors: aria‑live polite, focus moves to first invalid field on submit.

## Template Selector

- Options: classic, modern, minimal (derived from `TEMPLATES` constant).
- Selector drives both the API querystring and output filename.
- Enhancement ideas: display font specimens or screenshot thumbnails.

## Preview Strategy (Future)

- MVP ships without a live preview; users inspect the downloaded PDF.
- To add a preview later, reuse the shared tokens partial for consistent typography.
- Optional Phase 3: expose `/api/preview-html?template=...` for iframe-based previews.

## API Integration

```typescript
// services/api.ts
export async function downloadPdf(payload: ResumePayload, template: string) {
  const res = await fetch(`/api/pdf?template=${template}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`PDF failed: ${res.status}`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `resume-${template}.pdf`; a.click();
  URL.revokeObjectURL(url);
}
```

## Accessibility

- Visible labels; inputs associated via htmlFor/id.
- Keyboard support for all controls (add/remove items, tag input).
- Announce validation via aria-live regions.
- Color contrast ≥ 4.5:1; focus outlines visible.

## Styling

- Plain CSS (your preference) with CSS variables for spacing, colors, fonts.
- Print‑friendly palette in preview; avoid hairline borders and ultra‑light fonts.

## Error Handling

- Non-2xx responses set an inline status message (e.g., validation errors, unsupported template).
- TODO: surface field-level validation feedback once the form is fully built out.

## Privacy & Consent

- Toggle: "Save my draft to this device" (on by default).
- No data sent anywhere except PDF POST.

## Analytics (optional)

Track template switches, PDF generation success/failure, time‑to‑first‑PDF.

## Tests

- Component tests (future): cover localStorage sync and disabled state when required fields missing.
- E2E (Playwright): fill form → click “Generate PDF” → assert download name/size (>1 KB).

## Responsive Rules

Switch to stacked layout below 1024px; sticky ActionsBar at bottom on mobile.

## Copy (editable)

- Title: "Build Your Resume"
- CTA: "Generate PDF"
- Subtext: "Your data stays on this device except when generating the PDF."
