# Goal

Deliver an accessible resume builder section within `/resume` that posts to `POST /api/pdf?template=...`, lets users pick a template, and downloads a Playwright-rendered PDF. Future iterations can layer on richer preview and editing tools.

## User Stories

- As a job seeker, I can fill out my info and download a PDF in one click.
- As a returning user, my draft auto‑restores (localStorage) so I don't lose work.
- As a user, I can switch templates (Classic/Modern/Minimal) and see a preview.
- As a keyboard user/screen‑reader user, I can complete the form without a mouse.

## Routes & IA

- `/resume` — see `apps/web/app/resume/page.tsx`; the resume builder wizard is the primary content.
- `/stats` — see `apps/web/app/stats/page.tsx`; the unemployment chart now lives on its own analytics page.
- Optional future enhancement: add a second column or modal preview when templates grow.

## Components

- `apps/web/components/resume/ResumeBuilderSection.tsx` — main UI, stores payload/template, handles localStorage + status messaging.
- `apps/web/app/resume/page.tsx` — page shell that introduces and mounts the wizard.
- `apps/web/lib/resume/download-pdf.ts` — browser helper that posts to `/api/pdf` and triggers downloads.
- `apps/web/resume/shared/templates.ts` — authoritative template list for both client & server.
- Future: extract sub-forms (experience, education, links) once full data entry is added.

## Wizard Flow

1. Template
2. Contact info
3. Skills
4. Experience
5. Education
6. Summary (auto-generated)
7. Preview

Summary sits after Education so the AI sees every prior field before generating a draft. Reloading the wizard resumes on the stored step key.

## Summary Step

- Entering the Summary step triggers an automatic call to `POST /api/resume/summary` with the latest context (most recent role + tenure, top 5 skills, highest education, location). A blocking loader explains that this takes ~15 seconds.
- Once the AI responds, the textarea is pre-filled and the UI highlights which inputs informed the draft (role, tenure, skills, education, reading level). Users can edit immediately or click **Regenerate summary** for another pass.
- The AI is instructed to match the user’s education level; if no education is provided we default to an 8th grade reading level.
- Error handling: inline alert with “Try again” + manual entry fallback. If the user edits the summary, we do not auto-overwrite it on future visits (they must click Regenerate).

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

## Preview Strategy

- Generate request returns a signed preview URL (`/api/resume/pdf/:id`).
- Browser opens the preview in a new tab using `window.open(url, '_blank')` so users can review before saving.
- Provide a dedicated download button that links to the same URL with `download="<filename>"` for folks who prefer a file immediately.

## API Integration

```typescript
export async function requestPdfPreview(payload: ResumePayload, template: string) {
  const res = await fetch(`/api/pdf?template=${template}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const { error, details } = await res.json().catch(() => ({ }));
    throw new Error(details ?? error ?? `PDF failed: ${res.status}`);
  }
  return (await res.json()) as { previewUrl: string; filename: string };
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
- E2E (Playwright): fill form → click “Preview Resume” → assert preview/download availability and file name (>1 KB when saved).

## Responsive Rules

Switch to stacked layout below 1024px; sticky ActionsBar at bottom on mobile.

## Copy (editable)

- Title: "Build Your Resume" (section) / "Resume Builder" (page hero)
- CTA: "Preview Resume"
- Subtext: "Preview opens in a new tab; your data stays on this device except when generating the PDF."
