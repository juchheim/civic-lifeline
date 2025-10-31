PROMPT 08 — PII & logging check

Require Cache-Control: no-store and forbid PII in logs; allow only requestId, template, duration.

Harden privacy:

1) Confirm the PDF route sets `Cache-Control: no-store` and never logs PII.
2) Ensure we return `X-Request-Id` header (nanoid) and only log: request id, template name, and duration.
3) If logging not present, add a tiny pino logger in the route or a middleware (keep it minimal).

Acceptance:
- Show the small patch that adds/uses the logger (only a short snippet).
- Confirm no PII fields are printed anywhere.
Stop and wait.