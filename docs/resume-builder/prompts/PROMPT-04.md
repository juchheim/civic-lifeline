PROMPT 04 — Dependencies & scripts

Require "postinstall": "playwright install --with-deps chromium"

Update package.json:

1) Ensure dependencies include:
   - playwright
   - handlebars
   - zod
   - nanoid
   - pino
   (Add types only if missing.)

2) Add an install step for Chromium:
   - Either a `postinstall` script: `"postinstall": "playwright install --with-deps chromium"`
   - Or document a one-time step in README (choose postinstall if safe for CI).

3) Keep existing Next.js scripts (`dev`, `build`, `start`); add the postinstall without breaking them.

Acceptance:
- Show the updated package.json relevant sections.
Stop and wait.
