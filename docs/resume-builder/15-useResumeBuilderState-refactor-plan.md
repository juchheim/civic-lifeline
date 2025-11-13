# useResumeBuilderState.ts Refactor Plan

This plan breaks the 1,053-line `apps/web/components/resume/useResumeBuilderState.ts` hook into domain-focused modules without altering public behavior. We will execute the refactor incrementally to minimize drift and keep the wizard functional at every checkpoint.

---

## Goals & Guardrails
- **Preserve API surface**: `useResumeBuilderState` continues to return the same shape until the entire split is complete.
- **Incremental commits**: move logic in small, verifiable steps; keep the hook operational and tested after each phase.
- **Pure helpers first**: extract shared utilities before touching React state so they can be unit-tested independently.
- **No feature changes**: identical UX/telemetry, including persistence, summary prompts, and preview workflow.
- **Type-first**: maintain or improve TypeScript coverage; reduce `any`/implicit types.

---

## Current Responsibilities & Pain Points
| Area | Description | References |
| --- | --- | --- |
| Draft state & persistence | Initializes payload/template, loads & migrates localStorage, debounced persistence (`useEffect` + `persistDraft`). | `useResumeBuilderState.ts:54-239` |
| Wizard navigation | Tracks `currentStepIndex`, completion logic, navigation handlers, unlock rules, progress percent. | `useResumeBuilderState.ts:243-385` |
| Summary workflow | Builds AI context, auto-generation triggers, regenerate prompts, error handling, summary edits. | `useResumeBuilderState.ts:386-508` |
| Experience/Education editors | Mutations for experience, education, bullets, timelines, ordering, limits. | `useResumeBuilderState.ts:510-739` |
| Submission normalization | Builds sanitized payload for preview/download signatures. | `useResumeBuilderState.ts:740-807` |
| Preview/download orchestration | Handles gating, temporary draft adjustments, API call, window management, status updates. | `useResumeBuilderState.ts:808-959` |
| Full reset | Clears state, localStorage, preview window. | `useResumeBuilderState.ts:961-990` |

Pain points:
- Single hook owns everything, making reasoning/testing hard.
- Derived data (`hasRequiredContact`, `canPreview`, etc.) intermingled with mutations.
- Preview handler silently mutates payload (skill draft ingestion, phone formatting) in-place.
- Summary effects depend on many refs leading to subtle regressions when touching unrelated code.

---

## Target Architecture
Create `apps/web/components/resume/state/` and colocate focused hooks/helpers. `useResumeBuilderState` becomes a thin composition layer.

| File | Responsibility |
| --- | --- |
| `state/types.ts` | Shared types (draft helpers, `TimelineDraft`, action payloads) to avoid circular imports. |
| `state/persisted-draft.ts` | `usePersistedResumeDraft` hook: initializes payload/template/max step from localStorage, exposes `persistDraft`, `resetDraft`. |
| `state/useResumeDraft.ts` | Owns `payload`, `skillDraft`, `bulletsInputs`, `timelineInputs`, and mutations (skills, experience, education, timeline). |
| `state/useWizardNavigation.ts` | Derives `activeStep`, completion booleans, and exposes navigation handlers; consumes `persistDraft`. |
| `state/useSummaryController.ts` | Builds summary context, auto-generation side-effects, regeneration prompt state, and summary actions. |
| `state/usePreviewController.ts` | Houses submission normalization, preview/download orchestration, preview window ref, and derived download filename. |
| `state/index.ts` | Re-exports `useResumeBuilderState` that stitches the above sub-hooks and keeps the existing return signature. |
| `state/utils/*.ts` (optional) | Pure helpers (e.g., `buildSubmissionPayload`, `hydrateStoredDraft`) shared by multiple hooks. |

Each hook is responsible for:
1. Owning its local `useState`/`useRef`.
2. Exposing a minimal API (`state`, `derived`, `actions`).
3. Accepting dependencies via parameters (e.g., `payload`, `template`, `setPayload`) instead of importing from siblings.

---

## Execution Plan

### Phase 0 – Baseline (Prep)
- [ ] Snapshot current behavior: run existing tests covering resume builder (if none, smoke-test wizard manually).
- [ ] Document the current hook's exported API in `state/types.ts` as an interface (`ResumeBuilderStateApi`) to use as a contract during refactor.

### Phase 1 – Extract Pure Utilities
- [x] Move `createExperienceEntry`, `createEducationEntry`, `createTimelineDraft`, `buildSubmissionPayload`, and `computePreviewSignature` into `state/utils`.
- [x] Export helpers with unit tests where feasible (e.g., for `buildSubmissionPayload`).
- [x] Update `useResumeBuilderState` to import from new util files; no behavioral change.
- **Exit criteria**: Hook still compiles/tests; new utils covered by tests.

### Phase 2 – Persistence Hook
- [x] Create `usePersistedResumeDraft` that encapsulates:
  - localStorage hydration/migration (lines 106-229).
  - `persistDraft` callback & debounced effect.
  - `handleReset` (since it clears persistence and state scaffolding).
- [x] Hook accepts setters for `payload`, `template`, etc., or exposes hydrated defaults + `persistDraft`.
- [x] Replace inline persistence logic inside `useResumeBuilderState` with this hook.
- **Exit criteria**: Reloading the page restores draft exactly as before; reset still wipes storage.

### Phase 3 – Draft & Collection Management
- [x] Implement `useResumeDraft`:
  - Owns `payload`, `setPayload`, `skillDraft`, `bulletsInputs`, `timelineInputs`.
  - Exposes `addSkill`, `removeSkill`, `handleSkillDraftCommit`, experience & education CRUD, `updateTimelineInput`.
- [x] Replace direct state management in main hook with values/actions returned from `useResumeDraft`.
- [x] Keep `setPayload` exposed for consumers needing direct access (matching current API).
- **Exit criteria**: Skills/experience/education interactions behave identically during manual QA.

### Phase 4 – Wizard Navigation
- [x] Build `useWizardNavigation` that receives `payload`, `template`, `persistDraft`, `maxStepReached`, and returns:
  - Derived booleans (`hasRequiredContact`, `stepCompletion`, etc.).
  - `currentStepIndex`, `maxStepReached`, mutators, and navigation handlers.
- [x] Ensure this hook is the single source for progress labels and gating logic.
- **Exit criteria**: Navigation/locking rules unchanged; progress bar renders same values.

- [x] Phase 5 – Summary Controller
  - [x] Move summary-related state/effects into `useSummaryController`, parameterized by `payload`, `setPayload`, `activeStep`.
  - [x] Encapsulate `summaryContext`, `summaryDetails`, prompt booleans, and actions (`handleUpdateSummary`, `generateSummaryFromProfile`, etc.).
  - [x] Provide explicit callbacks for the parent to update `hasUserEditedSummary` and `persistDraft` dependencies as needed.
- **Exit criteria**: AI summary auto-generation and prompts trigger exactly as before (verify by toggling summary fields).

### Phase 6 – Preview/Download Controller
- [x] Extract preview functionality into `usePreviewController`:
  - Accepts `payload`, `template`, `skillDraft`, `setPayload`, gating booleans, and `persistDraft`.
  - Returns `handleGenerate`, `downloadFilename`, `isPreviewLoading`, `previewUrl`, `previewWindowRef`, `status`.
  - Houses `buildSubmissionPayload` & `computePreviewSignature` usage plus side effects (window handling).
- [x] Ensure this hook is the only place mutating `previewUrl`/`previewSignature`.
- **Exit criteria**: Preview/download flows (including caching & skill draft ingestion) operate as before.

### Phase 7 – Final Composition & Cleanup
- [x] Create `state/index.ts` exporting the assembled `useResumeBuilderState` and re-export needed types.
- [x] Update imports in consuming components to point at the new path if necessary.
- [ ] Remove any remaining inline logic from the original file, leaving only the composition wrapper (or delete the original if replaced).
- [ ] Run full test suite + manual regression on resume builder.

---

## Risk Mitigation & Testing Strategy
- **Layered testing**: add unit tests for new pure utils and hooks where feasible (use React Testing Library hooks renderer or vitest).
- **Contract verification**: after each phase, compare `Object.keys(useResumeBuilderState())` before/after (temporary console/test) to ensure the API shape matches.
- **Manual QA checklist** (run after phases 2, 3, 5, 6, 7):
  1. Load page, fill sample data, reload -> data persists.
  2. Navigate wizard forward/back, ensure gating works.
  3. Add/remove/reorder experience & education entries.
  4. Generate AI summary, edit manually, trigger regenerate prompt.
  5. Preview resume, download, ensure cached download uses existing preview.
  6. Clear draft via reset and confirm storage cleared.
- **Telemetry/side-effects**: watch console/network for `/api/pdf` calls to ensure payload remains unchanged.

---

## Definition of Done
- Original monolithic file replaced by modular hooks/files listed above.
- All new modules documented (inline comments only where non-obvious).
- Tests updated/passing; manual QA checklist executed.
- No regressions reported in wizard UX, summary generation, or preview/download.
- Planning doc updated/checked off to reflect actual execution notes during implementation.
