import puppeteer, { type Browser } from 'puppeteer-core';
import chromium from '@sparticuz/chromium';

declare global {
  // eslint-disable-next-line no-var
  var __RESUME_BROWSER__: Browser | undefined;
}

const LAUNCH_ARGS = [
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-dev-shm-usage',
  '--disable-gpu',
  '--font-render-hinting=medium',
] as const;

async function launchBrowser() {
  // Set chromium font config for serverless environment
  if (process.env.AWS_REGION || process.env.VERCEL) {
    chromium.setGraphicsMode = false;
  }

  const browser = await puppeteer.launch({
    args: [...chromium.args, ...LAUNCH_ARGS],
    executablePath: await chromium.executablePath('/tmp'),
    headless: true,
  });
  const close = async () => {
    try {
      await browser.close();
    } catch {
      // ignore errors that can happen on shutdown
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
  await page.setContent(html, { waitUntil: 'networkidle0', timeout: 10000 });
  const pdf = await page.pdf({
    format: 'A4',
    printBackground: true,
    margin: { top: '20mm', right: '15mm', bottom: '20mm', left: '15mm' },
  });
  await page.close();
  return pdf;
}
