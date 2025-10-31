PROMPT 07 — Fonts verification

Confirm the three <link> tags (Libre Baskerville, Inter, IBM Plex Mono) are in place and explain embedding.

Verify that each template file in `apps/web/resume/templates/` includes its own Google Font link as per overrides:
- classic.hbs -> Libre Baskerville
- modern.hbs  -> Inter
- minimal.hbs -> IBM Plex Mono

Acceptance:
- Confirm the exact `<link>` tags present in each template head.
- Explain how Playwright embeds these fonts into the generated PDF.
Stop and wait.
