PROMPT 09 — Koyeb deploy readiness
Prepare for Koyeb:

1) Ensure the root Dockerfile contains Chromium deps and runs the Playwright postinstall (`pnpm install` covers it).
2) Confirm the container listens on `PORT` (default 3000) and starts Next via `pnpm --filter @web start`.
3) Document Koyeb settings: memory 512–1024 MB, autoscaling off for MVP, healthcheck can hit `/` or a custom `/api/health` if added.

Acceptance:
- Show the Dockerfile block you will use (or confirm existing is correct).
- Provide a brief deploy checklist (bulleted).
Stop and wait.
