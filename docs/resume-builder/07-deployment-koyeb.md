# Dockerfile (Augment)

```dockerfile
FROM node:18-slim

# System deps for Chromium
RUN apt-get update && apt-get install -y \
  libnss3 libatk1.0-0 libx11-xcb1 libxcomposite1 libxrandr2 libxi6 libasound2 \
  libpangocairo-1.0-0 libxdamage1 libgbm1 libpango-1.0-0 libcairo2 \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package*.json ./
RUN npm ci
RUN npx playwright install --with-deps chromium
COPY . .
CMD ["node", "server.js"]
```

# Koyeb Notes

- Single App Service only; expose HTTP port (e.g., 3000).
- Increase CPU/memory if PDFs are heavy (512–1024MB is fine to start).
- Set healthcheck on /healthz.

## Env Vars (optional)

- PORT (default 3000)
- NODE_ENV=production