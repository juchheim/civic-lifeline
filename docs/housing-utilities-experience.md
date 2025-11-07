# Housing & Utilities Experience

## Purpose
- Combine the existing Housing and Broadband tools into one sandbox page that experiments with the future “Housing & Utilities” vertical.
- Keep the legacy `/housing` and `/broadband` routes live until the consolidated page covers all use cases.
- Document the information architecture so additional services (e.g. Utilities, Internet, Rental Aid) can slot in without redesign.

## Audience & Principles
- People with limited digital literacy using a phone first.
- < 5 second task recognition: clear labels, icon support, minimal jargon.
- Progressive disclosure: show only what is needed, expand for details.
- Consistent flow across tools: “Get Started” (form) → “Results & Next Steps”.

## Layout Strategy
1. **Hero overview**
   - Brief explanation, reassurance, and a “Jump to a service” skip link.
   - On mobile, hero cards stack; on desktop a two-column split keeps copy short.
2. **Sticky quick nav**
   - Horizontal pill selector on mobile, vertical rail on desktop.
   - Scroll spy highlights the active service; “Collapse all” resets the view.
3. **Service sections**
   - Accordion-like panels with smooth expand/collapse.
   - Each panel contains a headline, subcopy, and icon to aid recognition.
   - Inside, two consistent blocks:
     - `Get Started`: existing search form (identical controls for muscle memory).
     - `Results & Next Steps`: render current data modules (counselors + FMR, or broadband coverage cards).
   - Empty or loading states reuse current visual treatments.
4. **Future-proofing**
   - Section metadata driven by a config array. Adding “Utilities” later is data-only.
   - Optional `status` token (e.g. “Coming soon”) surfaces experimental modules.

## Implementation Notes
- Extract reusable `HousingExperience` and `BroadbandExperience` components for embedding.
- Build a `ServiceAccordion` component that manages expand/collapse and focus order.
- Ensure the consolidated page is fully client-side to reuse existing hooks and React Query logic.
- Update the main navigation and footer links to surface “Housing & Utilities”.
- Retain per-route metadata so sharing `/housing-utilities` is descriptive.

## Accessibility Checklist
- Accordion buttons: `<button>` with `aria-expanded`, `aria-controls`.
- Maintain focus when panels toggle; move focus to first heading when expanded.
- Ensure sticky nav is keyboard navigable and has visible focus.
- Provide skip links for screen reader users to reach each service quickly.

## QA Plan
- Manual smoke test on mobile widths (320px, 375px, 414px).
- Verify search, suggestion, and geolocation flows still function.
- Confirm React Query caches remain isolated per section to avoid stale data bleed.
- Test accordion with keyboard only and VoiceOver to confirm announcements.
- Monitor layout with long error messages and zero-result states.

