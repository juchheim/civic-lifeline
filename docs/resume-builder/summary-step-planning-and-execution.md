# Resume Builder – Summary Step Planning & Execution

## Goal
- Move the Summary step so it appears **after Education** in the resume builder wizard.
- Replace the manual “Rewrite with AI” interaction with an **automatic, data-driven summary generation** that runs the moment the user reaches the Summary step.
- Clearly communicate to users what data we leveraged (latest role, tenure, top skills, education) and that they can edit the generated copy immediately.
- Update the AI prompt so the model writes at the user’s education level (fallback: 8th-grade) and explains the new data contract to the backend route.

## Current Behaviour Snapshot
- `apps/web/components/resume/constants.ts` defines the Summary step between Contact and Skills; validation logic in `useResumeBuilderState` depends on this order.
- `SummaryStep` shows helper text, a manual textarea, and a “Rewrite with AI” button that calls `handleRewriteSummary`. The AI response appears in a diffing UI (`SummaryReview`) where users choose between original vs suggestion.
- `rewriteSummary` API expects messy user-entered summary notes plus optional context (name, skills, experience) and returns a polished variant.
- Tests (`apps/web/components/resume/__tests__/ResumeBuilderSection.test.tsx`) assert the current step order, button labels (`Next: Summary`), and the diff interaction.

## Target Experience
1. User finishes the Education step and clicks Next. The Summary step loads immediately with a **blocking loader card** that explains “We’re crafting your summary using your latest job, skills, and schooling. This usually takes ~15 seconds.”
2. While loading, we pass the structured resume data (most recent role, employer, computed years in role, top skills, highest education credential, contact info for tone) to the AI prompt.
3. Once the response arrives:
   - Hide the loader.
   - Pre-fill the summary textarea with the AI output (no diff UI, no second click).
   - Show inline copy that says we generated the summary from their most recent job title, employer, tenure, top 3–5 skills, and highest education (if present) and that they’re free to edit.
4. If the AI call fails, show an error state encouraging the user to write their own summary; allow retry.

## Planning

### 1. Wizard Flow & Validation
- Update `WIZARD_STEPS` order (`constants.ts`) so Summary now follows Education. Verify `StepKey` unions, progress percent calculations, and `stepCompletion` map.
- Adjust CTA labels/tests that reference `Next: Summary` or assume Summary is the third step.
- Persisted drafts in localStorage store a `step` key; confirm the migration is backward compatible (old “summary” index now points to a later step). Consider remapping stored `step` values ≥ old summary index to the new index on hydration.

### 2. Data Assembly for AI
- Create a helper (e.g., `buildSummaryContext(payload: ResumePayload)`) inside `useResumeBuilderState` or a shared `summary-context.ts` that returns:
  - `recentRole`: derive from the experience entry with the latest start date (fall back to first non-empty). Include title + company.
  - `tenureYears`: compute fractional years between start and end (or present => current date). Round to a single decimal or descriptive buckets (“2 years” / “6 months”).
  - `skills`: take up to 5 normalized skills in the order the user entered them.
  - `education`: determine the highest credential. Map `degree` strings to levels (`8th grade`, `High school diploma`, `Associate’s`, `Bachelor’s`, etc.). If empty, mark as `null`.
  - `readingLevel`: derive grade level from education mapping; fallback to `8th grade`.
  - `contactContext`: include only safe metadata (city/state) if needed for tone but never reused in output.
- Ensure this helper gracefully handles missing fields so the API always receives a predictable payload.

### 3. Prompt & API Contract
- Replace the existing `/api/resume/summary` contract (`docs/resume-builder/ai/summary-rewriter.md`, `apps/web/resume/server/summary-rewriter.ts`) with a schema that accepts the structured payload from §2 instead of messy user text:
  ```ts
  {
    recentRole?: { title?: string; employer?: string; tenure?: string };
    topSkills: string[];           // 0-5 items
    highestEducation?: { label: string; readingLevelGrade: string }; // e.g., “High school diploma”, “12th grade”
    contactContext?: { city?: string; state?: string };
  }
  ```
- Update the system + user prompts to:
  - Emphasize the new inputs and forbid hallucinations beyond provided facts.
  - Explicitly instruct the model to match the requested reading level (or 8th grade when `readingLevelGrade` is missing).
  - Remove references to “user-provided messy notes” and the “SUMMARY:” prefix requirement if we no longer need it (or keep if easier).
- Document the new prompt + request payload in `docs/resume-builder/ai/summary-rewriter.md` and link this plan.

### 4. Front-End State Management
- Extend `useResumeBuilderState` with:
  - `isSummaryGenerating`, `summaryGenerationError`, `hasAutoSummary`.
  - `generateSummaryFromProfile()` that calls the updated API once the Summary step becomes active **and** we have enough data (template not required, but need at least one of role/skills/education).
  - A `useEffect` watching `activeStep.key` that triggers generation on initial entry. Cache the payload hash (e.g., `JSON.stringify` over the context object) so we only re-run if upstream data changed **after** the user edits earlier steps.
  - Retry handler if the user clicks “Try again” after an error.
- Remove `handleRewriteSummary`, `handleAcceptSummarySuggestion`, `handleKeepOriginalSummary`, and the associated diff state (`summaryComparison`).
- Keep `summaryStatus` but repurpose it for success/error toast copy, or replace with dedicated messaging state.

### 5. SummaryStep UI
- Replace the button + diff block with:
  - Loader panel (skeleton or spinner) that includes the mandated copy: “We’re crafting your summary... takes about 15 seconds… pulling in your latest job, skills, and education.”
  - Once data arrives, render the textarea and below it a short paragraph: “We generated this summary using your role at {company}, about {tenure}, your top skills ({skills list}), and your {educationLabel}. Feel free to edit or rewrite anything.”
  - If education is missing, mention that we used an 8th-grade reading level.
  - Error state: show alert + “Write your own summary” CTA, plus “Retry AI” button.
  - Keep character counter + helper text.

### 6. Edge Cases & Persistence
- Ensure manual edits after the auto-fill mark the draft dirty so localStorage captures the custom summary.
- If a user removes experience/education/skills after the summary was generated, decide whether to invalidate (recommended: re-run automatically when they return to Summary; highlight in open questions if product wants a manual “Regenerate”).
- Guarantee the Summary step remains navigable even if AI fails (do not block Next/Preview if the user manually enters text).

### 7. Telemetry, Tests, and Docs
- Add logging around the new auto-generation call (duration, success/failure) for observability in `logger`.
- Update unit/integration tests:
  - Hook test verifying `generateSummaryFromProfile` fires when summary step activates and populates `payload.summary`.
  - Component test ensuring loader copy and success message render.
  - Regression test covering failure mode + retry.
- Refresh docs:
  - `docs/resume-builder/10-frontend-ui.md` for the new step order + UX.
  - `docs/resume-builder/ai/summary-rewriter.md` for the API contract.
  - This planning doc links to implementation PRs once complete.

## Execution Plan
1. **Prep & Alignment**
   - Confirm with product whether automatic regeneration should occur whenever upstream data changes or only on first visit. Record answer here before coding.
2. **Reorder Wizard Constants**
   - Update `constants.ts`, adjust `StepKey` types, fix hydration logic, and rewrite tests referencing “Next: Summary”.
3. **Context Builder Utility**
   - Implement `buildSummaryContext` (with unit tests) that extracts role/tenure/skills/education + reading level from `ResumePayload`.
4. **API & Prompt Refresh**
   - Modify `SummaryRewriteSchema`, new payload interface, and prompt instructions per §3.
   - Update `docs/resume-builder/ai/summary-rewriter.md` to describe inputs/outputs and the reading-level rule.
5. **Hook State Changes**
   - Remove obsolete summary rewrite handlers; add `isSummaryGenerating`, `summaryGenerationError`, `generateSummaryFromProfile`, and effect logic keyed to `activeStep`.
   - Ensure localStorage persists the generated summary and that retries don’t deadlock navigation.
6. **SummaryStep UI Pass**
   - Introduce loader, success, and error states; remove diff UI.
   - Add the explanatory copy referencing job/employer/tenure/skills/education and the “edit as you like” reminder.
7. **Testing & QA**
   - Expand unit/integration tests to cover new behaviours.
   - Do manual QA: populate resume, watch loader, verify autopopulated summary, test retry + manual edit, confirm preview gating still works.
8. **Docs & Sign-off**
   - Link this plan plus implementation notes in `docs/resume-builder/revisions-00.md` or roadmap as needed.
   - Capture before/after screenshots for release notes.

## Open Questions
- Should we offer an explicit “Regenerate summary” control after edits, or only auto-run on first load?
Do indeed offer an explicit "Regenerate summary" control after edits.
- What tenure rounding reads best to users (whole years vs. “1 year 4 months”)? Need copy guidance.
Use whole years.
- If multiple education entries exist, do we prefer the highest degree by `degree` taxonomy or the most recent graduation year?
We prefer the highest degree taxonomy over the most recent graduation year. If the user has more than one high degree, we should use all high level degrees (college(s)+doctorate for example)

Document owner: Codex Agent.
