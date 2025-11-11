import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

let cachedFontFaceCss: string | null = null;

type FontVariant = {
  family: string;
  weight: number;
  style?: 'normal' | 'italic';
  filename: string;
};

const FONT_VARIANTS: readonly FontVariant[] = [
  {
    family: 'Libre Baskerville',
    weight: 400,
    filename: 'LibreBaskerville-Regular-latin.woff2',
  },
  {
    family: 'Libre Baskerville',
    weight: 700,
    filename: 'LibreBaskerville-Bold-latin.woff2',
  },
  {
    family: 'Inter',
    weight: 400,
    filename: 'Inter-Regular-latin.woff2',
  },
  {
    family: 'Inter',
    weight: 600,
    filename: 'Inter-SemiBold-latin.woff2',
  },
  {
    family: 'IBM Plex Mono',
    weight: 400,
    filename: 'IBMPlexMono-Regular-latin.woff2',
  },
  {
    family: 'IBM Plex Mono',
    weight: 600,
    filename: 'IBMPlexMono-SemiBold-latin.woff2',
  },
] as const;

const FONT_BASE_PATH = resolve(process.cwd(), 'apps/web/public/resume/fonts');

function loadFontBase64(filename: string) {
  const filePath = resolve(FONT_BASE_PATH, filename);
  const buffer = readFileSync(filePath);
  return buffer.toString('base64');
}

export function getFontFaceCss() {
  if (cachedFontFaceCss) {
    return cachedFontFaceCss;
  }

  const css = FONT_VARIANTS.map(variant => {
    const { family, weight, style = 'normal', filename } = variant;
    const base64 = loadFontBase64(filename);
    return `@font-face { font-family: '${family}'; font-style: ${style}; font-weight: ${weight}; font-display: swap; src: url(data:font/woff2;base64,${base64}) format('woff2'); }\n`;
  }).join('');

  cachedFontFaceCss = css;
  return css;
}

