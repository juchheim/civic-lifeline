# Deployment on Vercel (Serverless)

## Overview

The resume PDF generation runs on Vercel's serverless functions (AWS Lambda). This requires a serverless-compatible Chromium setup.

## Serverless PDF Solution

### Dependencies

```json
{
  "dependencies": {
    "puppeteer-core": "^23.7.1",
    "@sparticuz/chromium": "^141.0.0"
  }
}
```

- **puppeteer-core**: Lightweight Puppeteer without bundled Chromium (~5MB)
- **@sparticuz/chromium**: Pre-compiled serverless Chromium (~66MB compressed)

### How It Works

1. **Cold Start** (first request or after 15min idle):
   - Extracts brotli-compressed binaries from `@sparticuz/chromium/bin/` to `/tmp`
   - Decompresses `chromium.br` → `/tmp/chromium` (~180MB uncompressed)
   - Decompresses `swiftshader.tar.br` → `/tmp/swiftshader/` (GPU libraries)
   - Launches Chromium with serverless-optimized args
   - Generates PDF (~3-5 seconds total)

2. **Warm Start** (subsequent requests within 15min):
   - Reuses `/tmp/chromium` from previous request
   - Generates PDF instantly (~1-2 seconds)

3. **Container Lifecycle**:
   - Lambda keeps containers warm for ~15 minutes
   - After inactivity, container is destroyed
   - Next request triggers a cold start

### Next.js Configuration

**next.config.mjs**:
```javascript
experimental: {
  // Prevent Next.js from webpack-bundling these packages
  serverComponentsExternalPackages: ["@sparticuz/chromium", "puppeteer-core"],
  
  // Ensure .br binary files are included in deployment
  outputFileTracingIncludes: {
    "/api/pdf": [
      "./resume/templates/**/*",
      "../../node_modules/@sparticuz/**",
    ],
  },
}
```

**Why this is needed**:
- `serverComponentsExternalPackages`: Prevents webpack from trying to bundle the chromium package (which would break binary extraction)
- `outputFileTracingIncludes`: Ensures the `.br` files in `@sparticuz/chromium/bin/` are deployed (Next.js's automatic tracing misses them with pnpm)

### PDF Service Configuration

**resume/server/pdf-service.ts**:
```typescript
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';

const LAUNCH_ARGS = [
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-dev-shm-usage',
  '--disable-gpu',
  '--font-render-hinting=medium',
] as const;

async function launchBrowser() {
  // Disable graphics mode for serverless (no GPU available)
  if (process.env.AWS_REGION || process.env.VERCEL) {
    chromium.setGraphicsMode = false;
  }

  const browser = await puppeteer.launch({
    args: [...chromium.args, ...LAUNCH_ARGS],
    executablePath: await chromium.executablePath(), // Extracts to /tmp
    headless: true,
  });
  return browser;
}
```

**Key points**:
- `chromium.args`: Provides Lambda-optimized Chromium arguments
- `chromium.executablePath()`: Handles extraction/decompression to `/tmp`
- `chromium.setGraphicsMode = false`: Disables GPU acceleration (not available in Lambda)

## Vercel Configuration

### Function Settings

No special `vercel.json` configuration needed. Vercel automatically provides:
- **Memory**: 1024MB (sufficient for Chromium + PDF generation)
- **Timeout**: 10 seconds (enough for cold starts)
- **Disk**: 512MB `/tmp` storage (Chromium uses ~180MB)
- **Region**: Automatic (deployed to edge locations)

### Environment Variables

None required. The code auto-detects Vercel via:
```typescript
if (process.env.VERCEL) {
  // Use serverless configuration
}
```

## Performance Characteristics

### Cold Start (first request)
- Extract & decompress binaries: ~1-2s
- Launch Chromium: ~0.5s
- Generate PDF: ~1-2s
- **Total**: ~3-5 seconds

### Warm Start (cached)
- Launch Chromium (from `/tmp`): ~0.5s
- Generate PDF: ~1-2s
- **Total**: ~1-2 seconds

### Resource Usage
- **Deployment size**: ~66MB (chromium binaries)
- **Runtime memory**: ~400-600MB (Chromium + PDF)
- **Disk usage**: ~180MB in `/tmp`

## Troubleshooting

### Error: "The input directory does not exist"
- **Cause**: Binary files not included in deployment
- **Fix**: Verify `outputFileTracingIncludes` in `next.config.mjs`

### Error: "Cannot find module @sparticuz/chromium"
- **Cause**: Package marked as external but not installed
- **Fix**: Ensure both packages in `dependencies` (not `devDependencies`)

### Slow cold starts (>10s timeout)
- **Cause**: Chromium download/extraction taking too long
- **Fix**: Increase function timeout in `vercel.json`:
  ```json
  {
    "functions": {
      "app/api/pdf/route.ts": {
        "maxDuration": 15
      }
    }
  }
  ```

## Limitations

- **Cold start latency**: 3-5 seconds (vs <1s warm)
- **Function size**: ~66MB of 250MB Lambda limit
- **Concurrent requests**: Each Lambda instance extracts Chromium independently
- **Font support**: Limited to fonts in `@sparticuz/chromium` (basic Latin, common symbols)

## Alternative: Docker Deployment

For persistent environments (Koyeb, Railway, Render), you can use Playwright instead:

### Switch to Playwright

**1. Update dependencies:**
```json
{
  "dependencies": {
    "playwright": "^1.48.2"
  },
  "scripts": {
    "postinstall": "playwright install chromium"
  }
}
```

**2. Update pdf-service.ts:**
```typescript
import { chromium } from 'playwright';

async function launchBrowser() {
  const browser = await chromium.launch({
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
    ],
    headless: true,
  });
  return browser;
}
```

**3. Dockerfile:**
```dockerfile
FROM node:18-slim

# Install Playwright system dependencies
RUN apt-get update && apt-get install -y \
  libnss3 libatk1.0-0 libatk-bridge2.0-0 libx11-xcb1 \
  libxcomposite1 libxrandr2 libxi6 libasound2 \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000
CMD ["pnpm", "--filter", "@web", "start"]
```

### Benefits of Docker Deployment

- ✅ No cold starts (always warm)
- ✅ Full font support
- ✅ Predictable performance
- ✅ Easier debugging

### Drawbacks

- ❌ Requires persistent server ($5-20/month)
- ❌ Manual scaling needed
- ❌ More DevOps overhead

## Recommended Setup

**For this project**: Vercel serverless (current setup)
- Zero cost for moderate usage
- Auto-scaling
- Simple deployment

**When to switch to Docker**:
- High traffic (>1000 PDFs/day)
- Need <1s response times consistently
- Require custom fonts
- Need WebGL/advanced browser features

