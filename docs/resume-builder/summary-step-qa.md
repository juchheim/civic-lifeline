# Summary Step QA Checklist

Document manual verification for the Summary step auto-generation flow. Check off each scenario per browser/device pair used during testing.

## Core Scenarios
- [ ] Fresh draft → reach Summary step, observe loader copy (~15s note), summary auto-populates, proceed to Preview.
- [ ] Regenerate summary after editing upstream data (skills or experience) and confirm new text replaces the old draft.
- [ ] Error fallback: simulate a failed AI call (e.g., by disabling network or mocking 500) and verify inline alert + “Try again” + ability to type manually.
- [ ] Hydrated draft: reload with an existing summary and ensure it is not auto-overwritten (Regenerate button remains available).
- [ ] Mobile viewport (<768px): confirm loader, helper copy, textarea, and buttons remain accessible and sticky actions don’t overlap the Summary step.

## Notes
- Include browser + OS per run (e.g., Chrome 123 / macOS 14.4).
- Capture screenshots or recordings for the loader state and the regenerated summary if regressions are suspected.
