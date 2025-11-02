## Current Implementation
- State & effects centralized in useResumeBuilderState hook; ResumeBuilderSection now composes step components only.
- Step UIs live in apps/web/components/resume/steps/ providing isolated markup for template/contact/summary/skills/experience/education/preview.
- Shared header/footer preview actions reuse ActionControls ensuring consistent buttons/states.

## Behaviour Parity (Baseline Observations)

_Source: `apps/web/components/resume/ResumeBuilderSection.tsx` @ baseline prior to refactor._

## Persistence & Draft Schema
- Browser storage key: `resume.draft`, version `2`.
- Stored record shape:
  ```json
  {
    "version": 2,
    "payload": { ...ResumePayload },
    "template": "classic" | "modern" | "minimal",
    "step": "template" | "contact" | "summary" | "skills" | "experience" | "education" | "preview"
  }
  ```
- Draft saves debounce: 600 ms `setTimeout` inside `useEffect` watching `payload`, `template`, `currentStepIndex`.
- Hydration on mount:
  - Merges stored payload with `createDefaultPayload`.
  - Normalizes phone (via `formatPhoneNumber`) and ensures summary fallback to `DEFAULT_SUMMARY_TEMPLATE`.
  - Rebuilds `bulletsInputs` (newline-joined bullet strings) and `timelineInputs` (month/year/present drafts) from experience entries.
  - Resumes stored template and wizard step if valid.
- Reset flow (`handleReset`) clears React state, closes preview window, removes `resume.draft` from `localStorage`, and resets status flags.

## Wizard Flow & Validation
- Steps defined by `WIZARD_STEPS` constant; active step derived from `currentStepIndex`.
- Completion rules (`stepCompletion` memo):
  - `template`: always true.
  - `contact`: requires trimmed non-empty `name`, `email`, formatted `phone`, and `location`.
  - `summary`: requires trimmed length ≥ 12 and not equal to the trimmed `DEFAULT_SUMMARY_TEMPLATE`.
  - `skills`, `experience`, `education`: always true (no gating).
  - `preview`: requires `contact` && `summary`.
- Navigation:
  - `handleNextStep` blocks advancement if current step incomplete.
  - `handleGoToStep` only allows jumping backwards or to same index (forward jumps disallowed).
  - `handlePreviousStep` decrements index with bounds checks.
- Progress indicator: percent = `currentStepIndex / (steps - 1)` rounded to integer; used for width of progress bar.
- Buttons:
  - Sticky footer duplicates header actions (`Back`, `Next`, `Preview Resume`, optional `Download PDF`, `Reset All`) with identical enable/disable logic.
  - `Next` button label includes title of next step except on final step (`Next`).

## Summary Rewrite Behaviour
- Guardrails:
  - Empty summary or trimmed length < 12 → status error message, no request.
  - When valid: `summaryStatus` set to success ("Polishing…"), `isSummaryRewriting` true.
- Payload sent to `rewriteSummary`:
  - Trimmed summary, optional `name`.
  - Up to 12 trimmed skills.
  - Up to 3 experiences, each containing trimmed `title`, `company`, and first two trimmed bullets.
- Post-response:
  - Empty or identical rewrite → `summaryComparison` cleared, status success ("kept as-is").
  - Different text → `summaryComparison` populated (drives diff UI), status success ("Review the AI suggestion below"). Original summary kept until user picks an action.
- Diff UI (`SummaryReview`):
  - Uses custom `diffWords` LCS implementation to highlight removals (yellow strikethrough) and additions (green background).
  - Actions: “Keep original” restores original text; “Use AI suggestion” commits suggestion. Both update `summaryStatus` with success message.

## Skills Management
- `MAX_SKILLS` = 20.
- `addSkill` normalizes input via `normalizeSkillLabel`, deduplicates (case-insensitive), trims to limit, clears draft field.
- `handleSkillDraftCommit` invoked on enter/blur to add current draft.
- `removeSkill` filters selected entry.
- Suggestions: static `SKILL_SUGGESTIONS` list displayed in UI (unchanged by interactions).

## Experience Management
- Caps: `EXPERIENCE_LIMIT` = 20 entries; `MAX_BULLETS` per role = 8.
- Local mirrored state:
  - `bulletsInputs`: array of newline-delimited textarea contents (ensures user editing preserves whitespace until parsed).
  - `timelineInputs`: array of `{startMonth,startYear,endMonth,endYear,endPresent}` to manage selects and "present" checkbox.
- Mutations:
  - `addExperience` initializes empty entry + blank mirror entries.
  - `removeExperience` splices arrays to keep mirrors in sync.
  - `moveExperience` reorders experience, bullets, and timeline arrays in lockstep.
  - `updateExperienceField` handles `bullets` specially (parses newline list into trimmed bullets array); other fields store raw value unless blank (then delete key).
  - `updateTimelineInput` updates draft month/year/present and writes normalized `startDate`/`endDate` (`YYYY` or `YYYY-MM`, `'present'`).
- Helpers:
  - `buildTimelineValue` / `splitTimeline` / `normalizeTimeline` / `parseMonthYear` manage string formats and free-form inputs.

## Education Management
- `EDUCATION_LIMIT` = 10 entries.
- Similar add/remove/move patterns to experience (without bullet/timeline mirrors).
- `updateEducationField` stores degree/school values as typed; clears `graduationYear` if blank.

## Preview Generation & Download
- `handleGenerate` guard: if `canPreview` false, sets `status` message "Please complete your contact details and summary before previewing."
- Prior to submission:
  - Adds normalized `skillDraft` if present and unique.
  - Formats phone number and updates state if changed.
  - Uses `buildSubmissionPayload` to trim fields, dedupe skills, normalize timelines, and filter incomplete entries.
  - Writes record to localStorage via `persistDraft`.
- Preview lifecycle:
  - Sets `status` "Generating PDF preview...", `isPreviewLoading` true, `previewUrl` null.
  - Opens `window.open('', '_blank')`; writes placeholder HTML + title.
  - Performs POST `/api/pdf?template=${template}` with submission payload JSON.
  - On success: expects `{ previewUrl }`, resolves to absolute URL (via `window.location.origin`). Sets `previewUrl` state, updates status to "Preview opened...", and navigates/opens preview window appropriately.
  - On failure: extracts error details from JSON body or status code; updates `status` with message and closes any open preview window.
  - Always clears `isPreviewLoading` when request completes.
- Download link (`Download PDF`) shown when `previewUrl` exists; uses `downloadFilename = buildResumeFilename(payload.name, template)`.

## Status Messaging & UI Notes
- `status` (footer status line) reflects preview actions; `summaryStatus` handles summary alerts; both use text/colour styling.
- ARIA:
  - Input helpers use `aria-describedby` linking to step-specific help text.
  - Buttons include descriptive `title` attributes.
  - Progress step buttons set `aria-current="step"` when active; disabled buttons prevent forward navigation.
- Focus/scroll:
  - After step change or summary rewrite diff, component scrolls window to top or bottom to keep new content visible.

## External Effects & Globals
- Relies on `window`, `document`, `localStorage`, `fetch`, and `window.open`; all checks guard for `typeof window !== 'undefined'`.
- Summary rewrite & preview fetches are async operations without cancellation.
- Debounced persistence uses `window.setTimeout` / `window.clearTimeout`.

## Constants & Limits (for parity)
- `STORAGE_KEY = 'resume.draft'`
- `STORAGE_VERSION = 2`
- `SUMMARY_MIN_CHARS = 12`
- `MAX_SKILLS = 20`
- `MAX_BULLETS = 8`
- `EXPERIENCE_LIMIT = 20`
- `EDUCATION_LIMIT = 10`
- Month/year options derived from current year ±60 years (`YEAR_OPTIONS`).

## Observations for Refactor Readiness
- Mirrored state (`bulletsInputs`, `timelineInputs`) must stay aligned with `payload.experience`.
- LocalStorage schema should remain backward compatible (keep version or provide migration).
- Preview window reference (`previewWindowRef`) must persist across renders to close existing tabs on reset/failures.
- Status strings surfaced in UI tests; maintain wording or adjust tests alongside refactor.
