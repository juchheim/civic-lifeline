# Unit Tests

- Validate Zod schema with edge cases (empty arrays, long summaries).
- Template compilation: ensure placeholders render; no raw handlebars output.

# Integration Tests

- Hit POST /api/pdf with fixture payloads for each template.
- Assert 200 and application/pdf with a minimum byte size.

# Visual/Manual Checks

- Print to A4; check margins and font rendering.
- Verify headers/footers don't overlap.
- Non-Latin text (test with Noto Sans).

# Load Smoke Test

10 consecutive requests → ensure memory stable and latency acceptable.