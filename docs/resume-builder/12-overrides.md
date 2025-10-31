# Purpose

Provide a single, copy-pasteable set of changes to add the resume PDF builder to the existing Next.js app. Hand this doc to GPT‑5 Codex and it can recreate the feature without re-reading all specs.

## ✅ What to Create / Replace

All paths are relative to the repo root.

### 1. Server helpers (`apps/web/resume/server/`)

#### `apps/web/resume/server/logger.ts`

```typescript
import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
});
```

#### `apps/web/resume/server/validation.ts`

```typescript
import { z } from 'zod';

export const ResumeSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional(),
  location: z.string().optional(),
  summary: z.string().max(800).optional(),
  skills: z.array(z.string()).max(50).optional(),
  experience: z
    .array(
      z.object({
        title: z.string(),
        company: z.string(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        years: z.string().optional(),
        bullets: z.array(z.string()).max(8).optional(),
      }),
    )
    .max(20)
    .optional(),
  education: z
    .array(
      z.object({
        degree: z.string(),
        school: z.string(),
        graduationYear: z.string().optional(),
      }),
    )
    .max(10)
    .optional(),
  links: z
    .array(
      z.object({
        label: z.string(),
        url: z.string().url(),
      }),
    )
    .max(10)
    .optional(),
});

export type ResumePayload = z.infer<typeof ResumeSchema>;
```

#### `apps/web/resume/server/compile.ts`

```typescript
import { readFileSync, readdirSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Handlebars from 'handlebars';
import type { ResumePayload } from './validation';

const moduleDir = path.dirname(fileURLToPath(import.meta.url));
const templatesDir = path.resolve(moduleDir, '../templates');
let partialsRegistered = false;

function registerPartialsOnce() {
  if (partialsRegistered) return;
  const partialDir = path.join(templatesDir, 'partials');
  try {
    const files = readdirSync(partialDir).filter(file => file.endsWith('.hbs'));
    for (const file of files) {
      const name = path.basename(file, '.hbs');
      Handlebars.registerPartial(name, readFileSync(path.join(partialDir, file), 'utf8'));
    }
  } catch {
    // partials directory is optional during early development
  }
  partialsRegistered = true;
}

export function compileTemplate(templateName: string, data: ResumePayload) {
  registerPartialsOnce();
  const templatePath = path.join(templatesDir, `${templateName}.hbs`);
  const source = readFileSync(templatePath, 'utf8');
  const template = Handlebars.compile(source, { noEscape: true });
  return template({ ...data, templateName });
}
```

#### `apps/web/resume/server/pdf-service.ts`

```typescript
import { chromium, type Browser } from 'playwright';

declare global {
  // eslint-disable-next-line no-var
  var __RESUME_BROWSER__: Browser | undefined;
}

async function launchBrowser() {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const close = async () => {
    try {
      await browser.close();
    } catch {
      // ignore shutdown race
    }
  };
  process.on('SIGINT', close);
  process.on('SIGTERM', close);
  return browser;
}

export async function getBrowser() {
  if (!globalThis.__RESUME_BROWSER__) {
    globalThis.__RESUME_BROWSER__ = await launchBrowser();
  }
  return globalThis.__RESUME_BROWSER__;
}

export async function renderHtmlToPdf(html: string) {
  const browser = await getBrowser();
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'networkidle', timeout: 10_000 });
  const pdf = await page.pdf({
    format: 'A4',
    printBackground: true,
    margin: { top: '20mm', right: '15mm', bottom: '20mm', left: '15mm' },
  });
  await page.close();
  return pdf;
}
```

### 2. Shared template helpers (`apps/web/resume/templates/`)

- `partials/head.hbs`

  ```handlebars
  <meta charset="utf-8" />
  <title>{{name}} – Resume</title>
  <style>
  {{> tokens-css }}
  </style>
  ```

- `partials/tokens-css.hbs`

  ```css
  :root {
    --c-n-0:#fff; --c-n-50:#fafafa; --c-n-100:#f2f2f2; --c-n-200:#e6e6e6;
    --c-n-300:#d4d4d4; --c-n-400:#a3a3a3; --c-n-500:#737373; --c-n-600:#525252;
    --c-n-700:#404040; --c-n-800:#262626; --c-n-900:#171717; --c-black:#000;

    --space-0:0; --space-1:4px; --space-2:8px; --space-3:12px; --space-4:16px;
    --space-5:24px; --space-6:32px; --space-7:40px; --space-8:48px;

    --border-hairline:0.75pt; --border-thin:1pt; --radius-sm:2px; --radius-md:4px;

    --fs-xs:12px; --fs-sm:13px; --fs-base:14px; --fs-lg:16px; --fs-xl:20px;
    --fs-h2:16px; --fs-h1:28px;
  }

  .template-classic { --font-family:"Libre Baskerville", serif; --brand-primary:#2C2C2C; --brand-accent:#6B7280; --weight-heading:700; --weight-body:400; }
  .template-modern { --font-family:"Inter", system-ui, -apple-system, Segoe UI, Roboto, sans-serif; --brand-primary:#1B4DB1; --brand-accent:#0F172A; --weight-heading:600; --weight-body:400; }
  .template-minimal { --font-family:"IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, monospace; --brand-primary:#374151; --brand-accent:#9CA3AF; --weight-heading:600; --weight-body:400; }

  body { font-family: var(--font-family); color: var(--c-n-900); font-size: var(--fs-base); margin: 40px; }
  h1 { font-size: var(--fs-h1); font-weight: var(--weight-heading); margin: 0 0 var(--space-2); }
  h2 { font-size: var(--fs-h2); font-weight: var(--weight-heading); color: var(--brand-primary); margin: var(--space-5) 0 var(--space-2); border-bottom: var(--border-hairline) solid var(--c-n-300); }
  p, li { font-weight: var(--weight-body); line-height: 1.45; }
  ul { margin: 0; padding-left: 16px; }
  ```

- `classic.hbs`, `modern.hbs`, `minimal.hbs` — use the partials above and include the template-specific Google Font `<link>` (see repository versions for exact markup).

### 3. Shared constants

`apps/web/resume/shared/templates.ts`

```typescript
export const TEMPLATES = ['classic', 'modern', 'minimal'] as const;
export type TemplateName = (typeof TEMPLATES)[number];
```

### 4. Next.js API route

`apps/web/app/api/pdf/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { compileTemplate } from '@/resume/server/compile';
import { renderHtmlToPdf } from '@/resume/server/pdf-service';
import { ResumeSchema, type ResumePayload } from '@/resume/server/validation';
import { logger } from '@/resume/server/logger';
import { TEMPLATES, type TemplateName } from '@/resume/shared/templates';

export const runtime = 'nodejs';

const ALLOWED_TEMPLATES = new Set<TemplateName>(TEMPLATES);

export async function POST(request: NextRequest) {
  const reqId = nanoid();
  const url = new URL(request.url);
  const requestedTemplate = (url.searchParams.get('template') ?? 'classic').toLowerCase();
  const template = isTemplate(requestedTemplate) ? requestedTemplate : undefined;
  const headers = new Headers({
    'X-Request-Id': reqId,
    'Cache-Control': 'no-store',
  });
  const startedAt = process.hrtime.bigint();

  if (!template || !ALLOWED_TEMPLATES.has(template)) {
    logRequest({ reqId, template: requestedTemplate, startedAt, level: 'warn' });
    return NextResponse.json({ error: 'Unsupported template' }, { status: 422, headers });
  }

  let payload: ResumePayload;
  try {
    const body = await request.json();
    payload = ResumeSchema.parse(body);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid payload';
    logRequest({ reqId, template, startedAt, level: 'warn', error });
    return NextResponse.json({ error: 'Validation failed', details: message }, { status: 400, headers });
  }

  try {
    const html = compileTemplate(template, payload);
    const pdf = await renderHtmlToPdf(html);

    const response = new NextResponse(pdf, { status: 200, headers });
    response.headers.set('Content-Type', 'application/pdf');
    response.headers.set('Content-Disposition', `attachment; filename="resume-${template}.pdf"`);
    logRequest({ reqId, template, startedAt, level: 'info' });
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logRequest({ reqId, template, startedAt, level: 'error', error });
    return NextResponse.json({ error: 'PDF generation failed', details: message }, { status: 500, headers });
  }
}

type LogLevel = 'info' | 'warn' | 'error';

function isTemplate(value: string): value is TemplateName {
  return (TEMPLATES as readonly string[]).includes(value);
}

function logRequest({
  reqId,
  template,
  startedAt,
  level,
  error,
}: {
  reqId: string;
  template: string;
  startedAt: bigint;
  level: LogLevel;
  error?: unknown;
}) {
  const durationMs = Number((process.hrtime.bigint() - startedAt) / BigInt(1e6));
  const payload = {
    requestId: reqId,
    template,
    durationMs,
    ...(error instanceof Error ? { error: error.message } : {}),
  };
  const log = typeof logger[level] === 'function' ? logger[level].bind(logger) : logger.info.bind(logger);
  log(payload, 'resume-pdf');
}
```

### 5. Browser helper + types

- `apps/web/lib/resume/types.ts`

  ```typescript
  export type { ResumePayload } from '@/resume/server/validation';
  ```

- `apps/web/lib/resume/download-pdf.ts`

  ```typescript
  import type { TemplateName } from '@/resume/shared/templates';
  import type { ResumePayload } from './types';

  export type { TemplateName } from '@/resume/shared/templates';

  export async function downloadPdf(payload: ResumePayload, template: TemplateName) {
    if (typeof window === 'undefined') {
      throw new Error('downloadPdf must run in the browser');
    }

    const rawBase = process.env.NEXT_PUBLIC_RESUME_API_URL ?? '';
    const baseUrl = rawBase.endsWith('/') ? rawBase.slice(0, -1) : rawBase;
    const target = `${baseUrl}/api/pdf?template=${encodeURIComponent(template)}`;

    const res = await fetch(target, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const message = await safeErrorMessage(res);
      throw new Error(message ?? `PDF generation failed (${res.status})`);
    }

    const blob = await res.blob();
    if (blob.size < 1024) {
      throw new Error('PDF looks suspiciously small (< 1KB)');
    }

    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `resume-${template}.pdf`;
    anchor.rel = 'noopener';
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function safeErrorMessage(res: Response) {
    try {
      const data = await res.json();
      if (typeof data?.error === 'string') return data.error;
    } catch {
      // ignore parse errors
    }
    return undefined;
  }
  ```

### 6. Client UI integration

- `apps/web/components/resume/ResumeBuilderSection.tsx` — copy the client-side form (localStorage, template selector, CTA buttons).
- `apps/web/app/jobs/page.tsx` — import `ResumeBuilderSection` and render it beneath the unemployment chart.
- `apps/web/app/resume/page.tsx` — optional redirect stub to `/jobs#resume-builder` for legacy bookmarks.

### 7. Fixture & REST client snippets

- `apps/web/resume/fixtures/resume-sample.json` — canonical sample payload.
- `apps/web/resume/scripts/smoke-test.http` — VS Code REST client file for integration testing.

### 8. Package updates (`apps/web/package.json`)

```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "next lint",
  "typecheck": "tsc --noEmit",
  "postinstall": "playwright install --with-deps chromium"
},
"dependencies": {
  "handlebars": "^4.7.8",
  "nanoid": "^5.0.7",
  "pino": "^9.4.0",
  "playwright": "^1.48.2",
  "zod": "^3.23.8"
  /* plus existing deps */
}
```

> Ensure `pnpm-lock.yaml` is updated by running `pnpm install` after adding dependencies.

### 9. Dockerfile

Update the root `Dockerfile` to use `node:18-slim`, install Chromium dependencies (`apt-get install ...`), run `pnpm install --frozen-lockfile`, execute the Playwright `postinstall`, and finally `pnpm --filter @web start`.

### 10. Smoke test command

```
curl -X POST "http://localhost:3000/api/pdf?template=modern" \
  -H "Content-Type: application/json" \
  --data @apps/web/resume/fixtures/resume-sample.json \
  --output resume-modern.pdf
```

Expected headers: `200 OK`, `Content-Type: application/pdf`, `Content-Disposition: attachment; filename="resume-modern.pdf"`. File size should exceed 1 KB with selectable text.

## 🔎 Post-Apply Sanity Checks

- `pnpm --filter @web dev` boots on http://localhost:3000 and `/api/pdf` returns PDFs for all templates.
- Playwright launches once; logs show `resume-pdf` entries with duration + requestId.
- `/jobs` includes the “Build Your Resume” section with name/email/template selection and PDF download CTA.
- Docker image builds successfully and Chromium binaries are available at runtime.

## Notes for Codex

- Keep everything under `apps/web/...` so the feature deploys with the existing Next.js app.
- Reuse the shared template list (`TEMPLATES`) across server and client to avoid drift.
- Never log the resume payload; stick to requestId, template, duration, optional error message.
- When adding new templates, update the Handlebars file, register the font link, and extend `TEMPLATES`.
