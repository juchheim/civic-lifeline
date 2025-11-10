# Summary Step Implementation Checklist

This document breaks the high-level plan into concrete work units and encodes the latest product decisions (auto-regenerate control, tenure rounding, degree priority). Use it as the execution tracker for the Summary step relocation + auto-generation effort.

## 0. Decision Snapshot
- **Regenerate control:** Provide an explicit “Regenerate summary” action even after edits. Surface it near the instruction copy once the first AI draft lands.
- **Tenure phrasing:** Always describe tenure in whole years (round to the nearest whole year; minimum “Less than 1 year” for shorter stints).
- **Education priority:** When multiple entries exist, pick the highest degree level. If users have multiple entries at that same top tier, list each high-level credential in the context sent to AI (e.g., Bachelor’s + Master’s). Reading level mirrors that highest tier; if no education, default to 8th grade.

## 1. Wizard Order & Persistence
- Update `apps/web/components/resume/constants.ts` so `WIZARD_STEPS` order becomes: Template → Contact → Skills → Experience → Education → Summary → Preview.
- Revisit `StepKey` unions and any switch statements/derived maps (`stepCompletion` in `useResumeBuilderState`) to align with the new order.
- When hydrating from `localStorage`, remap stored step indices so drafts saved on the old flow land on the nearest valid step in the new order (e.g., `summary` becomes `education` if that was the stored key, since summary now comes later).
- Update label strings (`Next: Summary`, etc.) in tests (`ResumeBuilderSection.test.tsx`) and any analytics events that rely on the old order.

## 2. Summary Context Builder
- Create `apps/web/lib/resume/summary-context.ts` exporting `buildSummaryContext(payload: ResumePayload)`.
- Responsibilities:
  - Select the experience entry with the newest start date; fall back to the first populated entry. Return `{ title, employer, tenureText }` where `tenureText` is computed via a helper (`formatTenure(startDate, endDate)`).
  - Tenure rules: if < 1 year, say “Less than 1 year”; otherwise round to the nearest whole year with pluralization.
  - Collect up to five skills (existing order). Ensure normalization matches what AI expects (title case, no duplicates).
  - Determine highest education: create a taxonomy map (`none < diploma < associate < bachelor < master < doctorate`). Include every degree that shares the top rank in the payload we send to AI plus the canonical label shown to the user.
  - Provide `readingLevelGrade`: e.g., `8th grade`, `12th grade`, `College level`. If no education, return `8th grade`.
  - Include `contactContext` with city/state when both exist to help AI keep tone local without exposing contact info.
  - Return a stable object shape even when data is missing so caching works (e.g., `topSkills: []` instead of `undefined`).
- Add Jest tests covering edge cases (no experience, multiple top-tier degrees, blank skills).

## 3. API Contract & Prompt
- Update `apps/web/resume/server/summary-rewriter.ts`:
  - Replace `SummaryRewriteSchema` with the structured context schema described above; remove the raw `summary` input since AI now produces the initial draft.
  - Add a field for `readingLevelGrade` and explicit instructions to match that reading level (fallback already handled client-side).
  - Keep response payload as `{ summary: string }`.
  - Rework the system and user prompts to explain the data sources (recent role, tenure, top skills, highest education) and to forbid hallucinating beyond provided facts.
  - Maintain the `SUMMARY:` prefix in the response unless product wants plain text (still note this in docs).
- Update `docs/resume-builder/ai/summary-rewriter.md` to reflect the new schema, prompt guidelines, and latency expectations (~15 seconds).
- Ensure any server-side logging still records `requestId`, duration, model, and failure reasons; add new fields if helpful (e.g., presence/absence of certain context).

## 4. Front-End State Changes
- Small refactor in `useResumeBuilderState`:
  - Remove obsolete diff-related state (`summaryComparison`, `handleAcceptSummarySuggestion`, etc.).
  - Add `isSummaryGenerating`, `summaryGenerationError`, `summaryContextHash`, and `hasGeneratedSummary`.
  - Implement `generateSummaryFromProfile` that:
    1. Builds the summary context via `buildSummaryContext`.
    2. Hashes the payload (e.g., `stableHash(context)`) to avoid duplicate calls.
    3. Invokes `rewriteSummary(context)` on Summary step entry or when `Regenerate` is clicked.
    4. Writes the AI result into `payload.summary` and marks `hasGeneratedSummary = true`.
  - Add an effect that fires when `activeStep.key === 'summary'` and `hasGeneratedSummary` is false; gate it behind safeguards (avoid firing if another request is pending or context lacks minimum info).
  - Retry handler resets the error state and re-triggers generation.
- Update selectors (e.g., `summaryComplete`) to keep manual entry valid even if AI fails.
- Persist new booleans in local state only (no need to store in `localStorage`).

## 5. SummaryStep UX Wiring
- Loader state: show a full-width card with the copy “We’re crafting your summary using your latest job, skills, and schooling. This usually takes about 15 seconds.” Add a progress spinner or skeleton if desired.
- Success state: display the textarea plus a helper paragraph summarizing which inputs were used (e.g., “Based on your role as {title} at {employer} for about {tenure}, your top skills ({skills}), and your {educationLabel}. Feel free to edit or rewrite anything.”).
- Include the explicit “Regenerate summary” button (secondary style) near this helper text; disable it while `isSummaryGenerating` is true.
- Error state: show inline alert with failure reason, keep textarea enabled for manual entry, and surface “Try again” button.
- Remove the diff comparison UI entirely; update copy tests/screenshots.

## 6. QA, Telemetry, and Docs
- Unit tests:
  - `buildSummaryContext` coverage.
  - `useResumeBuilderState` tests for auto-generation trigger and retry behaviour.
  - Component test verifying loader → populated summary flow and regenerate control.
- Manual QA checklist (log results in `docs/resume-builder/summary-step-qa.md` once run):
  - Fresh draft path, AI success.
  - Failure fallback (simulate by mocking fetch rejection).
  - Regenerate after editing upstream data (skills/experience) to ensure cache busting works.
  - LocalStorage resume with prefilled summary.
- Analytics / logging: emit a client event (if available) when auto-generation starts/completes to monitor success rate.
- Documentation updates:
  - `docs/resume-builder/10-frontend-ui.md` for the new step order + loader UX.
  - `docs/resume-builder/revisions-00.md` referencing this checklist and the completed work.

### Tracking Template
Use the table below to track status as work progresses (update in subsequent commits).

| Area | Status | Notes |
| --- | --- | --- |
| Wizard reorder | ☑ | `apps/web/components/resume/constants.ts` now places Summary after Education; tests updated. |
| Summary context builder | ☑ | Added `apps/web/lib/resume/summary-context.ts` with tenure, skills, education + reading level helpers. |
| API/prompt update | ☑ | `apps/web/resume/server/summary-rewriter.ts` + docs now accept structured payload and enforce reading level. |
| Hook refactor | ☑ | `useResumeBuilderState` auto-generates summaries, tracks loader/error state, and exposes regenerate handler. |
| Summary UI | ☑ | `SummaryStep` shows loader, context explanation, regenerate button, and removes the diff UI. |
| Tests & QA | ☑ | Updated RTL tests for new flow; manual QA doc pending after final verification. |
