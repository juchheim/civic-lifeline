# Deployment

## Environments
- **Prod**: Vercel (web/API), Koyeb (workers), Mongo Atlas, Redis, S3.
- **Local**: dev containers for Mongo/Redis; .env.example provided.

## CI/CD
- CI: lint, typecheck, unit tests, contract tests (fixtures), build.
- E2E: Playwright against staging nightly.
- CD: Vercel preview → required checks → prod; workers via Koyeb Git deploy.

## Env Vars
- `MONGO_URI`, `REDIS_URL`, `MAPBOX_TOKEN` (or Leaflet tiles),
- `BLS_API_KEY`, `HUD_TOKEN`, `AWS_*` (for S3), `AI_PROVIDER`, `AI_KEYS`.

## Rollback
- Vercel instant rollback; Koyeb previous release.
- Data rollback: retain previous FCC snapshot; blue/green ETL paths.

## Health
- `/healthz` returns status of cache, DB, and external reachability (shallow).
