FROM node:18-slim

# System dependencies required for Playwright Chromium
RUN apt-get update && apt-get install -y \
  libnss3 libatk1.0-0 libx11-xcb1 libxcomposite1 libxrandr2 libxi6 libasound2 \
  libpangocairo-1.0-0 libxdamage1 libgbm1 libpango-1.0-0 libcairo2 \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json pnpm-lock.yaml ./

RUN corepack enable && corepack prepare pnpm@9.12.0 --activate
RUN pnpm install --frozen-lockfile

COPY . .

# Reinstall to ensure workspace dependencies are properly linked
RUN pnpm install --frozen-lockfile

RUN pnpm build

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

CMD ["pnpm", "--filter", "@web", "start"]
