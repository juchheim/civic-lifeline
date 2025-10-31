# Unit Tests

- Validate Zod schema with edge cases (empty arrays, long summaries).
- Template compilation: ensure placeholders render; no raw handlebars output.

# Integration Tests

- Hit POST /api/pdf with fixture payloads for each template (see `apps/web/resume/fixtures/resume-sample.json`).
- Assert 200 and application/pdf with a minimum byte size.
- `apps/web/resume/scripts/smoke-test.http` can be used in VS Code or via `curl` for manual checks.

# Visual/Manual Checks

- Print to A4; check margins and font rendering.
- Verify headers/footers don't overlap.
- Non-Latin text (test with Noto Sans).

# Load Smoke Test

10 consecutive requests → ensure memory stable and latency acceptable. Watch the `resume-pdf` pino logs for duration spikes.
