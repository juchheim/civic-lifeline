# System Overview

## Architecture Summary
- **Frontend**: Next.js (App Router, React), Tailwind, shadcn/ui, Mapbox/Leaflet, Recharts.
- **Backend**: Next.js API routes (Node) for data proxy, auth, AI, and ETL orchestration hooks.
- **Workers**: Koyeb cron for ETL (FCC CSV, nightly USDA snapshot, BLS refresh).
- **Data**: MongoDB Atlas (resources + geo), Redis (cache), S3 (PDFs, raw CSV).
- **AI**: Ollama (Mistral) local first; OpenAI/Gemini fallback via feature flag.
- **Auth**: NextAuth (email/password or email link), roles (user/moderator/admin).
- **Observability**: PostHog (product), Logtail/OTEL (logs/traces), Uptime checks.

## Data Flow (ASCII)
[USDA ArcGIS] ---
[BLS API] --------> [API Routes] -> [Redis Cache] -> [Mongo] -> [Next.js Pages]
[FCC CSV] --ETL--> [S3 Raw] -> [Worker] -> [Mongo] -> [API]
[HUD APIs] -------/
[AI (Ollama)] <-> [API /ai/*] -> [S3 PDF]

## Key Tenets
- All external requests are server-side.
- Provenance metadata returned with every response.
- Empty states > synthetic data.