# Goal

Design a resume builder UI that posts to POST /api/pdf?template=... and gives users a clear, accessible way to enter data, pick one of three templates, preview the look, and download a print‑quality PDF.

## User Stories

- As a job seeker, I can fill out my info and download a PDF in one click.
- As a returning user, my draft auto‑restores (localStorage) so I don't lose work.
- As a user, I can switch templates (Classic/Modern/Minimal) and see a preview.
- As a keyboard user/screen‑reader user, I can complete the form without a mouse.

## Routes & IA

/resume (or /jobs#resume-builder) — single page with two‑column layout.

### Layout Wireframes (ASCII)

**Desktop (≥1024px)**

```
+--------------------------------------------------------------+
| Title & Intro                                                |
+-----------------------+--------------------------------------+
| Form (scrollable)    | Preview Pane                          |
| - Contact            | [Template: Classic ⌄]                 |
| - Summary            | ┌──────────────────────────────┐     |
| - Experience [+]     | │ Live Preview (approx.)        │     |
| - Education [+]      | └──────────────────────────────┘     |
| - Skills (tags)      | [Generate PDF] [Reset]               |
| - Links [+]          |                                       |
+-----------------------+--------------------------------------+
```

**Mobile (<1024px)**

```
Title & Intro
[Template: Classic ⌄]
Preview (collapsible)
Form (stacked sections)
[Generate PDF] [Reset]
```

## Components

- ResumeBuilderPage
- TemplateSelector
- ResumeForm
- ContactFields
- SummaryField
- ExperienceList (repeatable items with bullets)
- EducationList
- SkillsInput (token/tag input)
- LinksList
- PreviewPane (approximate client-side preview using shared CSS tokens)
- ActionsBar (Generate / Reset)

## State Management

- Zustand store: resume (payload), template, dirty, autoSave.
- Persist resume + template to localStorage (throttled every 1s).
- Clear on Reset.

## Data Model (client)

Mirror ResumePayload (see 02-data-contract.md).

## Validation

- Client Zod schema identical to server.
- Inline errors: aria‑live polite, focus moves to first invalid field on submit.

## Template Selector

- Options: classic, modern, minimal.
- Show small font specimen under each option (e.g., Libre Baskerville, Inter, IBM Plex Mono).
- Changes update preview immediately.

## Preview Strategy

- Approximate preview client‑side using the same fonts and simplified CSS.
- Use <iframe> or a styled <div>; avoid Playwright in the browser.
- Note: final PDF comes from server; preview is visually close but not authoritative.

### (Optional) Server HTML Preview

Add GET /api/preview-html?template=... that returns compiled HTML for iframe. (Can be Phase 3.)

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

- 400: show validation errors mapping (field list).
- 422: unsupported template → reset selector to classic.
- 500: generic error with retry and support link (logs include request id).

## Privacy & Consent

- Toggle: "Save my draft to this device" (on by default).
- No data sent anywhere except PDF POST.

## Analytics (optional)

Track template switches, PDF generation success/failure, time‑to‑first‑PDF.

## Tests

- RTL tests: add/remove experience items; tag input; template switching.
- E2E (Playwright): fill form → download PDF; verify response headers and >1KB file.

## Responsive Rules

Switch to stacked layout below 1024px; sticky ActionsBar at bottom on mobile.

## Copy (editable)

- Title: "Build Your Resume"
- CTA: "Generate PDF"
- Subtext: "Your data stays on this device except when generating the PDF."