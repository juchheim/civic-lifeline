# Security & Privacy

## Authentication & Authorization
- NextAuth with email/password (bcrypt) or email link.
- Roles: user, moderator, admin (RBAC at API route level).
- Session cookies: HttpOnly, Secure, SameSite=Lax.

## Data Protection
- Encrypt at rest (MongoDB Atlas); TLS in transit.
- Secrets in server env only (Vercel/Koyeb); no client exposure.
- Minimize PII; allow user-initiated deletion.

## Web Security
- Strict CSP (no inline scripts), limited origins.
- Rate limiting + IP throttling on write routes.
- Input validation (zod) everywhere; sanitize outputs.

## AI Safety
- System prompts enforce: no legal advice; provide sources; no fabrication.
- Refusal patterns for uncertain or unsafe guidance.

## Compliance & Logging
- Access logs w/ redaction; audit trails for moderation actions.
- Data retention: letters 30 days (configurable), counselor cache 24h, logs 30–90 days.
