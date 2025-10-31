PROMPT 03 — Apply backend overrides (files & code)

“Replace full files exactly as in overrides; show a file change summary only.”

Apply `12-overrides.md` exactly:

1) Create the directories/files under `apps/web/resume/` (partials, templates, server helpers, shared constants) exactly as listed.
2) Add/replace `apps/web/app/api/pdf/route.ts` with the override content.
3) Update `apps/web/lib/resume/` utilities (types + download helper).
4) Add the fixture + smoke-test HTTP file under `apps/web/resume/`.
5) Ensure `apps/web/package.json` matches the override (dependencies + `postinstall`).
6) Update the root `Dockerfile` if the Chromium block isn’t present yet.

Acceptance:
- Show a concise git-style diff or file list of created/modified files.
- Do NOT include the full file bodies here again; the diff or a per-file change summary is enough.
Stop and wait.
