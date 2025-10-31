PROMPT 01 — Project context & plan


“Target: single Koyeb service running the existing Next.js app. Add a Playwright-powered PDF route + templates inside the @web workspace. No extra services.”

You are GPT-5 Codex. You will extend the existing Next.js monorepo to add the resume PDF builder feature.

Context:
- I will provide `12-overrides.md` with drop-in file contents and patch instructions tailored for the Next.js app.
- Apply those overrides exactly, with idempotent changes.
- Everything must run within the existing @web workspace (no extra services).

Tasks:
1) Inspect `apps/web` to confirm it's a Next.js app and note the package manager (pnpm) and Node baseline.
2) Locate relevant directories (`apps/web/app`, `apps/web/lib`, `apps/web/resume`) or note if they need to be created.
3) Output a short plan summarizing which files from `12-overrides.md` will be added or replaced.
4) Stop and wait.
