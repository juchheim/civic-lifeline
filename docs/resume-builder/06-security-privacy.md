# PII Handling Principles

- Do not persist resume payloads in logs or storage.
- Sanitize logs; log only request id, template, duration.
- Use Cache-Control: no-store on responses (done in `apps/web/app/api/pdf/route.ts`).
- Enforce HTTPS (Koyeb provides TLS at the edge).

# Abuse Mitigation

- Rate limit per IP (e.g., 30/min).
- Validate payload size (max ~100KB) and arrays lengths (Zod does this).
- Reject remote images/iframes; block external navigation during render.
- Next.js API route already blocks navigation by keeping content inline (no external fetch helpers).

# Playwright Hardening

- Launch with --no-sandbox on Koyeb; disable GPU.
- Consider page.route('**/*', ...) to block third-party trackers.
