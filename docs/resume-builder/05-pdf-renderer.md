# Playwright Renderer (`apps/web/resume/server/pdf-service.ts`)

```typescript
import { chromium, type Browser } from 'playwright';

declare global {
  // eslint-disable-next-line no-var
  var __RESUME_BROWSER__: Browser | undefined;
}

const LAUNCH_ARGS = [
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-dev-shm-usage',
  '--single-process',
  '--no-zygote',
  '--disable-gpu',
  '--font-render-hinting=medium',
];

async function launchBrowser() {
  const browser = await chromium.launch({
    args: LAUNCH_ARGS,
    headless: true,
  });
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

# Handlebars Compilation (`apps/web/resume/server/compile.ts`)

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
    // partials directory optional during early dev
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

# Next.js API Route (`apps/web/app/api/pdf/route.ts`)

```typescript
export const runtime = 'nodejs';

const ALLOWED_TEMPLATES = new Set(['classic', 'modern', 'minimal'] as const);

export async function POST(request: NextRequest) {
  const reqId = nanoid();
  const url = new URL(request.url);
  const requestedTemplate = (url.searchParams.get('template') ?? 'classic').toLowerCase();
  const template = ALLOWED_TEMPLATES.has(requestedTemplate as any) ? (requestedTemplate as TemplateName) : undefined;
  const headers = new Headers({
    'X-Request-Id': reqId,
    'Cache-Control': 'no-store',
  });
  const startedAt = process.hrtime.bigint();

  if (!template) {
    logRequest({ reqId, template: requestedTemplate, startedAt, level: 'warn' });
    return NextResponse.json({ error: 'Unsupported template' }, { status: 422, headers });
  }

  let payload: ResumePayload;
  try {
    payload = ResumeSchema.parse(await request.json());
  } catch (error) {
    logRequest({ reqId, template, startedAt, level: 'warn', error });
    return NextResponse.json({ error: 'Validation failed' }, { status: 400, headers });
  }

  try {
    const html = compileTemplate(template, payload);
    const pdf = await renderHtmlToPdf(html);
    const response = new NextResponse(new Uint8Array(pdf), { status: 200, headers });
    response.headers.set('Content-Type', 'application/pdf');
    response.headers.set('Content-Disposition', `attachment; filename="resume-${template}.pdf"`);
    logRequest({ reqId, template, startedAt, level: 'info' });
    return response;
  } catch (error) {
    console.error('[resume-pdf] render failure', error);
    logRequest({ reqId, template, startedAt, level: 'error', error });
    return NextResponse.json(
      {
        error: 'PDF generation failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500, headers },
    );
  }
}
```
