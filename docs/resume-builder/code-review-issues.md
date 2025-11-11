# Resume Builder Code Review Issues

This log captures every problem spotted in the current resume builder stack. Each entry lists the affected files (with line references), what is wrong, and why it matters so we can fix issues methodically without introducing behaviour changes.

## Frontend State & Data Flow

COMPLETE: 1. **Cached previews/downloads stay stale after any edit**  
   - Files: `apps/web/components/resume/useResumeBuilderState.ts:712-819`, `apps/web/components/resume/ResumeBuilderSection.tsx:247-330`.  
   - `handleGenerate('download')` immediately reuses `previewUrl` if it exists, and we never reset that URL when the user edits contact info, skills, summary, template, etc. After a single preview, every later “Download PDF” call can return an outdated file even though the UI suggests it reflects the latest inputs.

COMPLETE: 2. **Highest completed step is not persisted, so progress + preview unlocks reset**  
   - Files: `apps/web/components/resume/useResumeBuilderState.ts:83-365, 796-829`.  
   - Local storage records now include both the current step key and the highest step reached, and hydration restores the max of the two. Preview unlock/step navigation therefore survives reloads even if the user backed up before closing the tab.

COMPLETE: 3. **Local storage versioning is defined but never enforced**  
   - Files: `apps/web/components/resume/constants.ts:1-35`, `apps/web/components/resume/useResumeBuilderState.ts:83-226`.  
   - Hydration now checks the persisted `version` and clears incompatible or corrupt drafts before loading state, so bumping `STORAGE_VERSION` reliably resets users stuck on an outdated schema.

COMPLETE: 4. **Summary auto-generation flag is lost after rehydration**  
   - Files: `apps/web/components/resume/useResumeBuilderState.ts:149-423`.  
   - We now persist the `summaryEdited` flag alongside the draft and hydrate it directly, so AI drafts remain eligible for automatic regeneration after reloads instead of being treated as manual edits.

COMPLETE: 5. **Experience bullets are silently truncated**  
   - Files: `apps/web/components/resume/steps/ExperienceStep.tsx:1-237`, `apps/web/components/resume/steps/__tests__/ExperienceStep.test.tsx`.  
   - The textarea now enforces the eight-line limit, surfaces a warning when the cap is reached, and a unit test covers the behavior so users cannot unknowingly add tasks that would be dropped from the PDF.

COMPLETE: 6. **Skill count copy does not match the actual limit**  
   - Files: `apps/web/components/resume/constants.ts:1-12`, `apps/web/components/resume/ResumeBuilderSection.tsx:41-45`, `apps/web/components/resume/useResumeBuilderState.ts:319-848`.  
   - `MAX_SKILLS` has been reduced to 10, so both the UI copy and the enforcement layer now agree on the cap users see.

COMPLETE: 7. **Year pickers allow impossible future dates**  
   - File: `apps/web/components/resume/ResumeBuilderSection.tsx:31-36`.  
   - `YEAR_OPTIONS` now starts at the current year (not current year + 1), preventing users from selecting future start or end dates in the experience step.

## Frontend Accessibility & UX

8. **Skills input lacks any accessible name and references a missing helper element**  
   - File: `apps/web/components/resume/steps/SkillsStep.tsx:59-75`.  
   - The freeform skill input has no `<label>`/`aria-label`, and the `aria-describedby={skillsHelpId}` attribute points to an ID that is never rendered. Screen readers announce it as an unlabeled text box, failing WCAG requirements.

9. **Summary textarea loses its description on mobile**  
   - File: `apps/web/components/resume/steps/SummaryStep.tsx:54-120`.  
   - The helper paragraph with `id={summaryHelpId}` is wrapped in `hidden md:block`, so it disappears from the accessibility tree on small screens even though the textarea’s `aria-describedby` still points to it. Mobile users end up with an unlabeled textarea.

10. **Experience date selectors are not associated with labels**  
    - File: `apps/web/components/resume/steps/ExperienceStep.tsx:144-203`.  
    - “Start date”/“End date” text is just a `<span>` above two `<select>` elements. Without `<label>`/`htmlFor` or `aria-labelledby`, screen readers announce each combo box without context (“Combo box, blank”), which is unusable.

## Frontend Code Hygiene

11. **`ActionControls` is dead code**  
    - File: `apps/web/components/resume/ActionControls.tsx`.  
    - The component duplicates our current preview/download/reset controls but is never imported anywhere. It increases maintenance cost and causes confusion when searching for button logic.

## Server & PDF Pipeline

12. **User content goes into templates without escaping or sanitisation**  
    - Files: `apps/web/resume/server/compile.ts:44-52`, `apps/web/resume/templates/*.hbs`.  
    - We compile templates with `noEscape: true`, so fields like `name`, `summary`, `bullets`, etc. render raw HTML/JS. Attackers can embed `<script>` tags that execute inside the Puppeteer instance during PDF generation (SSRF/data exfil) and can also inject arbitrary markup into the final PDF.

13. **PDF storage is per-process, volatile, and keeps binaries in memory until expiry**  
    - Files: `apps/web/resume/server/pdf-store.ts:9-33`, `apps/web/app/api/pdf/route.ts:86-103`, `apps/web/app/api/resume/pdf/[id]/route.ts:10-21`.  
    - Generated PDFs live only in an in-memory `Map`. Any request served by a different Node process (or a cold Lambda) cannot retrieve the preview URL, causing “PDF not found” errors under load. Records are never deleted after a successful download, so each preview holds the full binary in RAM for up to five minutes even if the user closes the tab.

14. **Puppeteer pages aren’t cleaned up when rendering fails**  
    - File: `apps/web/resume/server/pdf-service.ts:64-74`.  
    - `renderHtmlToPdf` opens a page, calls `setContent`/`pdf`, and only closes the page on success. Any timeout or rendering error leaks a page handle, eventually exhausting the process.

15. **Templates require live Google Fonts during PDF generation**  
    - Files: `apps/web/resume/templates/classic.hbs:5-7`, `modern.hbs:5-13`, `minimal.hbs:5-7`.  
    - Every PDF render depends on fetching `fonts.googleapis.com`. Serverless environments without outbound network (or during transient DNS/firewall failures) will hang or throw timeouts, making PDF generation unreliable.
