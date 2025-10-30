# services/pdfService.js

```javascript
import { chromium } from 'playwright';

let browser; // simple reuse; close on process exit

export async function getBrowser() {
  if (!browser) {
    browser = await chromium.launch({ args: ['--no-sandbox'] });
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

# HTML Compilation

```javascript
import { readFileSync } from 'fs';
import Handlebars from 'handlebars';

export function compileTemplate(templateName, data) {
  const templatePath = `./templates/${templateName}.hbs`;
  const source = readFileSync(templatePath, 'utf8');
  const template = Handlebars.compile(source, { noEscape: true });
  return template(data);
}
```

# Route Handler

```javascript
import { ResumeSchema } from '../lib/validation.js';
import { compileTemplate } from '../services/compile.js';
import { renderHtmlToPdf } from '../services/pdfService.js';
import { nanoid } from 'nanoid';

const ALLOWED = new Set(['classic','modern','minimal']);

export async function handlePostPdf(req, res) {
  const reqId = nanoid();
  res.setHeader('X-Request-Id', reqId);

  try {
    const template = String(req.query.template || 'classic');
    if (!ALLOWED.has(template)) return res.status(422).json({ error: 'Unsupported template' });

    const payload = ResumeSchema.parse(req.body);
    const html = compileTemplate(template, payload);

    const pdf = await renderHtmlToPdf(html);
    res
      .status(200)
      .contentType('application/pdf')
      .setHeader('Content-Disposition', `attachment; filename="resume-${template}.pdf"`)
      .setHeader('Cache-Control', 'no-store')
      .send(pdf);
  } catch (err) {
    const status = err.name === 'ZodError' ? 400 : 500;
    res.status(status).json({ error: 'PDF generation failed', details: err?.message });
  }
}
```