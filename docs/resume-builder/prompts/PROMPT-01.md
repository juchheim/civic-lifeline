PROMPT 01 — Project context & plan
You are GPT-5 Codex. You will modify my existing Node/Express repo to add a server-side resume PDF builder.

Context:
- I will provide a file called `12-overrides.md` that contains all drop-in file contents and patch instructions.
- We will apply those overrides exactly, with idempotent changes.
- This is a single Koyeb service (no worker).

Tasks:
1) Read the repository structure and detect:
   - Server entry (e.g., server.js or src/index.ts),
   - Existing routes folder,
   - templates directory (create if missing),
   - package manager (npm or pnpm or yarn).
2) Confirm Node version and OS assumptions for Playwright.
3) Output a short plan: which files will be added/replaced/updated per `12-overrides.md`.
4) Stop and wait.