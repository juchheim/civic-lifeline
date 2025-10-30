# Purpose

Apply the "best practice" improvements without re-reading multiple specs. Hand this file to GPT‑5 Codex and ask it to apply these overrides to your codebase. It includes complete, drop‑in file contents (safe to replace) and minimal edits where replacement isn't desired.

## ✅ What to Change (one pass)

### Create templates/partials/head.hbs (new file)

```handlebars
<meta charset="utf-8" />
<title>{{name}} – Resume</title>
<style>
{{> tokens-css }}
</style>
```

### Create templates/partials/tokens-css.hbs (new file)

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

/* Template variables (set by body class) */
.template-classic { --font-family:"Libre Baskerville", serif; --brand-primary:#2C2C2C; --brand-accent:#6B7280; --weight-heading:700; --weight-body:400; }
.template-modern { --font-family:"Inter", system-ui, -apple-system, Segoe UI, Roboto, sans-serif; --brand-primary:#1B4DB1; --brand-accent:#0F172A; --weight-heading:600; --weight-body:400; }
.template-minimal { --font-family:"IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, monospace; --brand-primary:#374151; --brand-accent:#9CA3AF; --weight-heading:600; --weight-body:400; }

/* Common usage */
body { font-family: var(--font-family); color: var(--c-n-900); font-size: var(--fs-base); margin: 40px; }
h1 { font-size: var(--fs-h1); font-weight: var(--weight-heading); margin: 0 0 var(--space-2); }
h2 { font-size: var(--fs-h2); font-weight: var(--weight-heading); color: var(--brand-primary); margin: var(--space-5) 0 var(--space-2); border-bottom: var(--border-hairline) solid var(--c-n-300); }
p, li { font-weight: var(--weight-body); line-height: 1.45; }
ul { margin: 0; padding-left: 16px; }
```

Fonts are not included here on purpose; each template manages its own Google Font link(s).

### Replace services/compile.js (full file)

```javascript
// services/compile.js
import { readFileSync, readdirSync } from 'fs';
import path from 'path';
import Handlebars from 'handlebars';

let partialsRegistered = false;

function registerPartialsOnce() {
  if (partialsRegistered) return;
  const partialDir = path.resolve('./templates/partials');
  try {
    const files = readdirSync(partialDir).filter(f => f.endsWith('.hbs'));
    for (const f of files) {
      const name = path.basename(f, '.hbs');
      Handlebars.registerPartial(name, readFileSync(path.join(partialDir, f), 'utf8'));
    }
  } catch (e) {
    // Partials are optional in early MVP; ignore if directory missing.
  }
  partialsRegistered = true;
}

export function compileTemplate(templateName, data) {
  registerPartialsOnce();
  const templatePath = path.resolve(`./templates/${templateName}.hbs`);
  const source = readFileSync(templatePath, 'utf8');
  const tpl = Handlebars.compile(source, { noEscape: true });
  return tpl({ ...data, templateName }); // expose templateName for body class
}
```

### Replace services/pdfService.js (full file)

```javascript
// services/pdfService.js
import { chromium } from 'playwright';

let browser; // reuse one instance in-process

export async function getBrowser() {
  if (!browser) {
    browser = await chromium.launch({ args: ['--no-sandbox'] });
    // Optional: handle process shutdown
    const close = async () => { try { await browser?.close(); } catch {} };
    process.on('SIGTERM', close); process.on('SIGINT', close);
  }
  return browser;
}

export async function renderHtmlToPdf(html) {
  const b = await getBrowser();
  const page = await b.newPage();
  await page.setContent(html, { waitUntil: 'networkidle', timeout: 10000 });
  const pdf = await page.pdf({
    format: 'A4',
    printBackground: true,
    margin: { top: '20mm', right: '15mm', bottom: '20mm', left: '15mm' },
  });
  await page.close();
  return pdf;
}
```

### Replace routes/resume.js (full file)

```javascript
// routes/resume.js
import express from 'express';
import { nanoid } from 'nanoid';
import { compileTemplate } from '../services/compile.js';
import { renderHtmlToPdf } from '../services/pdfService.js';
import { ResumeSchema } from '../lib/validation.js';

const router = express.Router();
const ALLOWED = new Set(['classic','modern','minimal']);

router.post('/pdf', async (req, res) => {
  const reqId = nanoid();
  res.setHeader('X-Request-Id', reqId);
  res.setHeader('Cache-Control', 'no-store');

  try {
    const template = String(req.query.template || 'classic');
    if (!ALLOWED.has(template)) {
      return res.status(422).json({ error: 'Unsupported template' });
    }

    const payload = ResumeSchema.parse(req.body);
    const html = compileTemplate(template, payload);

    const pdf = await renderHtmlToPdf(html);
    res
      .status(200)
      .contentType('application/pdf')
      .setHeader('Content-Disposition', `attachment; filename="resume-${template}.pdf"`)
      .send(pdf);
  } catch (err) {
    const status = err?.name === 'ZodError' ? 400 : 500;
    res.status(status).json({ error: 'PDF generation failed', details: err?.message });
  }
});

export default router;
```

In server.js: `import resumeRoutes from './routes/resume.js'; app.use('/api', resumeRoutes);`

### Update each template file to use the shared head + body class

#### templates/classic.hbs (replace file)

```handlebars
<!DOCTYPE html>
<html>
<head>
{{> head}}
<!-- Classic font -->
<link href="https://fonts.googleapis.com/css2?family=Libre+Baskerville:wght@400;700&display=swap" rel="stylesheet" />
</head>
<body class="template-{{templateName}}">
<h1>{{name}}</h1>
<p>{{email}} {{#if phone}}| {{phone}}{{/if}} {{#if location}}| {{location}}{{/if}}</p>

{{#if summary}}<h2>Summary</h2><p>{{summary}}</p>{{/if}}

{{#if experience}}
<h2>Experience</h2>
<ul>
{{#each experience}}
<li><b>{{title}}</b>, {{company}} {{#if years}}— {{years}}{{/if}}
{{#if bullets}}<ul>{{#each bullets}}<li>{{this}}</li>{{/each}}</ul>{{/if}}
</li>
{{/each}}
</ul>
{{/if}}

{{#if education}}
<h2>Education</h2>
<ul>
{{#each education}}
<li>{{degree}} — {{school}} {{#if graduationYear}}({{graduationYear}}){{/if}}</li>
{{/each}}
</ul>
{{/if}}

{{#if skills}}<h2>Skills</h2><p>{{#each skills}}{{this}}{{#unless @last}}, {{/unless}}{{/each}}</p>{{/if}}

{{#if links}}
<h2>Links</h2>
<ul>{{#each links}}<li>{{label}} — {{url}}</li>{{/each}}</ul>
{{/if}}
</body>
</html>
```

#### templates/modern.hbs (replace file)

```handlebars
<!DOCTYPE html>
<html>
<head>
{{> head}}
<!-- Modern font -->
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600&display=swap" rel="stylesheet" />
<style>
h1 { color: #1B4DB1; }
</style>
</head>
<body class="template-{{templateName}}">
<h1>{{name}}</h1>
<p>{{email}} {{#if phone}}| {{phone}}{{/if}} {{#if location}}| {{location}}{{/if}}</p>

{{#if summary}}<h2>Summary</h2><p>{{summary}}</p>{{/if}}
{{#if experience}}
<h2>Experience</h2>
<ul>
{{#each experience}}
<li><b>{{title}}</b>, {{company}} {{#if years}}({{years}}){{/if}}
{{#if bullets}}<ul>{{#each bullets}}<li>{{this}}</li>{{/each}}</ul>{{/if}}
</li>
{{/each}}
</ul>
{{/if}}

{{#if education}}
<h2>Education</h2>
<ul>{{#each education}}<li>{{degree}} — {{school}} {{#if graduationYear}}({{graduationYear}}){{/if}}</li>{{/each}}</ul>
{{/if}}

{{#if skills}}<h2>Skills</h2><p>{{#each skills}}{{this}}{{#unless @last}}, {{/unless}}{{/each}}</p>{{/if}}
{{#if links}}<h2>Links</h2><ul>{{#each links}}<li>{{label}} — {{url}}</li>{{/each}}</ul>{{/if}}
</body>
</html>
```

#### templates/minimal.hbs (replace file)

```handlebars
<!DOCTYPE html>
<html>
<head>
{{> head}}
<!-- Minimal font -->
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600&display=swap" rel="stylesheet" />
</head>
<body class="template-{{templateName}}">
<h1>{{name}}</h1>
<p>{{email}} {{#if phone}}| {{phone}}{{/if}} {{#if location}}| {{location}}{{/if}}</p>

{{#if summary}}<h2>Summary</h2><p>{{summary}}</p>{{/if}}
{{#if experience}}
<h2>Experience</h2>
<ul>
{{#each experience}}
<li>{{title}} at {{company}} {{#if years}}({{years}}){{/if}}
{{#if bullets}}<ul>{{#each bullets}}<li>{{this}}</li>{{/each}}</ul>{{/if}}
</li>
{{/each}}
</ul>
{{/if}}

{{#if education}}<h2>Education</h2><ul>{{#each education}}<li>{{degree}} — {{school}} {{#if graduationYear}}({{graduationYear}}){{/if}}</li>{{/each}}</ul>{{/if}}
{{#if skills}}<h2>Skills</h2><p>{{#each skills}}{{this}}{{#unless @last}}, {{/unless}}{{/each}}</p>{{/if}}
{{#if links}}<h2>Links</h2><ul>{{#each links}}<li>{{label}} — {{url}}</li>{{/each}}</ul>{{/if}}
</body>
</html>
```

### Dockerfile additions (only if not present yet)

```dockerfile
# Ensure Chromium + deps for Playwright
FROM node:18-slim
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

## 🔎 Post‑Apply Sanity Checks

- POST /api/pdf?template=classic|modern|minimal returns a PDF with correct fonts.
- Inspect PDF: text is selectable (not a raster image); headings use template font; borders are visible in print preview.
- Logs show X-Request-Id, template name, and duration — no PII.

## Notes for Codex

- If existing files differ, replace with the versions above rather than trying to merge line‑by‑line.
- Fonts remain per‑template; if self‑hosting later, add @font-face rules and remove Google links — no other code changes needed.
- If partials directory doesn't exist, create it; compilation tolerates it being empty.

End of overrides. Apply these changes, then run a test: use the sample payload from 02-data-contract.md and confirm all three templates generate successfully.