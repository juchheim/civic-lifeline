# Dockerfile (Next.js + Playwright)

```dockerfile
FROM node:18-slim

RUN apt-get update && apt-get install -y \
  libnss3 libatk1.0-0 libx11-xcb1 libxcomposite1 libxrandr2 libxi6 libasound2 \
  libpangocairo-1.0-0 libxdamage1 libgbm1 libpango-1.0-0 libcairo2 \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN corepack enable && corepack prepare pnpm@9.12.0 --activate
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm build

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

CMD ["pnpm", "--filter", "@web", "start"]
```

# Koyeb Notes

- Deploy the existing Next.js app; the `/api/pdf` route runs within the same service.
- Size the service at 1 vCPU / 512–1024 MB RAM to give Chromium headroom.
- Health check: GET `/` (or `/api/health` if you add one).
- Environment variables:
  - `PORT` (default 3000; leave for Koyeb to inject)
  - `NODE_ENV=production`
  - Optional: `LOG_LEVEL`, `PLAYWRIGHT_BROWSERS_PATH=0`
