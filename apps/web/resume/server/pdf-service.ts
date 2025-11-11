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
  const isProduction = process.env.AWS_REGION || process.env.VERCEL;
  
  // Set chromium font config for serverless environment
  if (isProduction) {
    chromium.setGraphicsMode = false;
  }

  // In local development, use system Chrome
  // In production (Vercel/Lambda), use @sparticuz/chromium
  const launchOptions = isProduction
    ? {
        args: [...chromium.args, ...LAUNCH_ARGS],
        executablePath: await chromium.executablePath(),
        headless: true,
      }
    : {
        args: [...LAUNCH_ARGS],
        executablePath:
          process.platform === 'darwin'
            ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
            : process.platform === 'win32'
              ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
              : '/usr/bin/google-chrome-stable', // Linux
        headless: true,
      };

  const browser = await puppeteer.launch(launchOptions);
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
  let page: Awaited<ReturnType<Browser['newPage']>> | null = null;

  try {
    page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0', timeout: 10000 });
    return await page.pdf({
      format: 'Letter',
      printBackground: true,
      margin: { top: '0.75in', right: '0.6in', bottom: '0.75in', left: '0.6in' },
    });
  } finally {
    if (page) {
      try {
        await page.close();
      } catch {
        // ignore errors while cleaning up the page
      }
    }
  }
}
