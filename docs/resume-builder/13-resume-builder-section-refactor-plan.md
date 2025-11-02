# ResumeBuilderSection Refactor Plan (Zero-Regressions Focus)

## Context Snapshot
- `apps/web/components/resume/ResumeBuilderSection.tsx` (~1,900 LOC) intermixes UI, persistence, diffing, and state normalization.
- Duplicate state mirrors (`bulletsInputs`, `timelineInputs`) exist solely to support form controls, increasing mismatch risk.
- Hard dependencies on browser APIs (`window`, `localStorage`, `open`) are scattered, obstructing deterministic testing.
- Helpers for formatting and diffing live inline, inflating the render file and discouraging reuse.

## Guiding Principles
- **Zero Behaviour Loss:** Every change must be backed by automated coverage or manual verification before moving on.
- **Sequential Isolation:** Reorganize logic in small, testable slices to avoid thrash; finish each slice before touching the next.
- **Deterministic State Management:** Co-locate state with the feature that consumes it; avoid global mirrors where single-source-of-truth suffices.
- **Stable Contracts:** Preserve existing storage keys, API payloads, and visual affordances.

## Guard Rails (Do First)
1. Add smoke tests (React Testing Library):
   - Fill each wizard step, save, reload (simulate `localStorage`), ensure data hydrates.
   - Trigger summary rewrite mock, verify comparison UI.
   - Generate preview (mock `fetch` + `window.open`), confirm status messaging.
2. Capture targeted snapshot/visual references:
   - Summary diff card.
   - Preview step checklist.
   - Skills chips list.
3. Document baseline behaviour:
   - Log current storage schema, key names, and debounce timing.
   - Note current prop/handler signatures used by `renderStepContent`.

## Implementation Stages

### Stage 1 – Utility Extraction
- Create `apps/web/lib/resume/utils/` for pure helpers.
- Move and test:
  - `formatPhoneNumber`
  - `normalizeSkillLabel`
  - Timeline helpers (`buildTimelineValue`, `splitTimeline`, `normalizeTimeline`, `parseMonthYear`)
  - Diff helpers (`diffWords`, `mergeSegments`, `tokenizeForDiff`)
- Ensure `ResumeBuilderSection` imports from the new modules without functional change (no refactor yet).

### Stage 2 – Controlled State Hook
- Introduce `apps/web/components/resume/useResumeBuilderState.ts`:
  - Own canonical `payload`, `template`, `currentStepIndex`, `status`, `previewUrl`, etc.
  - Encapsulate persistence (`localStorage`) with memoized read + debounced write using existing key/version.
  - Expose mutation methods mirroring current handlers (`addSkill`, `updateExperienceField`, `handleGenerate`, `handleReset`, etc.).
  - Provide selectors/derived state (e.g., `stepCompletion`, `canPreview`) so the UI becomes declarative.
- Wrap effectful APIs (`window`, `fetch`) in injected adapters for easier mocking.
- Update tests to exercise the hook in isolation, ensuring parity with documented baseline.

### Stage 3 – Step Component Decomposition
- Create dedicated components under `apps/web/components/resume/steps/`:
  - `TemplateStep`
  - `ContactStep`
  - `SummaryStep`
  - `SkillsStep`
  - `ExperienceStep`
  - `EducationStep`
  - `PreviewStep`
- Each step receives only the slice of state + callbacks required, sourced from the hook.
- Move step-specific form state (e.g., bullet textarea drafts, timeline drafts) into each step via local `useState`/custom hook (`useExperienceDrafts`) to eliminate mirrored arrays in the parent.
- Confirm step components remain stateless from the parent’s perspective (no side effects).

### Stage 4 – Shared Action Surfaces & Layout
- Extract header/footer action bars into `PreviewActions` (header) and `StickyActions` (footer) components to remove duplication.
- These components consume the hook’s exposed command functions and derived booleans.
- Ensure focus management, ARIA labels, and titles remain identical by copying attributes, then cross-check snapshots.

### Stage 5 – Integrate & Thin Root Component
- Refactor `ResumeBuilderSection` to:
  - Initialize the new hook.
  - Render progress UI and orchestrate steps via the new components.
  - Delegate commands to `PreviewActions`/`StickyActions`.
- Target <250 LOC for this file; no business logic should remain inline.

### Stage 6 – Post-Refactor Validation
- Re-run smoke + unit tests; add any missing edge cases discovered during refactor.
- Perform manual exploratory testing in the browser (especially persistence + `window.open` flows).
- Update documentation (`docs/resume-builder/10-frontend-ui.md`) with the new component tree and extension points.
- Record before/after metrics: file size, bundle size diff (if measurable), rerender counts (React DevTools).

## Risk Matrix & Mitigations
- **State Divergence:** Moving form draft state into steps risks losing sync. Mitigate by writing tests for adding/removing experience entries and verifying `payload` reflects changes.
- **Storage Compatibility:** Changing defaults could nuke existing drafts. Keep `STORAGE_VERSION` untouched unless migration logic is added; test hydration using real stored payloads.
- **Async Side Effects:** Extraction of `handleGenerate` must maintain preview window behaviour. Mock `window.open` in tests to assert new tab messaging.
- **Prop Drilling Explosion:** Step components could receive sprawling props. Use structured prop objects (`experienceHandlers`, `timelineState`) to limit argument explosion.

## Notes
- useResumeBuilderState encapsulates logic; ResumeBuilderSection is presentational, steps extracted under steps/.
- Preview/reset controls now centralized via ActionControls (shared header/footer usage).

- useResumeBuilderState now encapsulates payload, persistence, preview, and summary logic.
- All wizard steps render via extracted components (Template, Contact, Summary, Skills, Experience, Education, Preview).
- Shared action controls exist as ActionControls, reused in header/footer.

## Success Criteria
- Automated tests cover all existing behaviours (summary rewrite diff, experience CRUD, preview generation, persistence).
- `ResumeBuilderSection.tsx` acts as a coordinator only; utilities and state logic live elsewhere.
- Redundant state mirrors removed; each form area owns its transient state.
- Manual QA confirms zero visible regressions; existing drafts continue to load.

## Execution To-Do Checklist
1. ✅ Baseline tests (RTL + snapshots).
2. ✅ Baseline behaviour notes (storage schema, handlers, UI attributes).
3. ✅ Extract + test utility functions.
4. ✅ Introduce state hook with parity tests.
5. ✅ Migrate `ResumeBuilderSection` to use the hook (no UI changes yet).
6. ✅ Extract step components one at a time, running tests after each extraction.
7. ✅ Extract shared action components; dedupe header/footer.
8. ✅ Remove deprecated state from root component; confirm new structure.
9. ✅ Update documentation + metrics.
10. ✅ Final regression run (automated + manual).
