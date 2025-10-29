# Non-Fake-Data Policy

## Purpose
Trust is the product. We will never display fabricated, seeded, or placeholder “real-looking” data.

## Definitions
- **Verified public data**: Data from official/authoritative sources (e.g., USDA, BLS, FCC, HUD).
- **User-submitted data**: Contributed by users; hidden until verified.
- **AI-generated text**: Explanations/templates drafted by AI; clearly labeled and sourced.

## Rules
1. **No synthetic listings**. If a map/list is empty, show an honest empty state with reasons and next actions.
2. **Provenance** on every item/panel: Source name/logo, link, last fetched timestamp, data vintage (if applicable).
3. **Verification gate** for community submissions before public display.
4. **AI labeling**: “AI-generated guidance, not legal advice.” Always include official links when referencing procedures/eligibility.
5. **Change logs**: Record fetch times, dataset versions, and transformations.
6. **User safety**: Never guess. If uncertain, say so and link to official resources.

## UI Patterns
- **SourceChip** component with tooltip: provider, URL, fetchedAt, dataVintage.
- **EmptyState** component with “Why is this empty?”, “How to help,” and “Submit resource” options.
- **Verified badge** for community content (with verifier and date).

## QA & Release Gates
- Data contracts validated by schema.
- Contract tests against recorded fixtures before deploy.
- Manual spot-check of random items each release.

## Incident Handling
- If a data error surfaces: show banner, disable suspect panel, post status note, re-fetch/rollback, publish a brief post-mortem.
