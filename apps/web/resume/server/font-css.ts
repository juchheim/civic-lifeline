import { readFileSync } from 'node:fs';

let cachedFontFaceCss: string | null = null;

type FontVariant = {
  family: string;
  weight: number;
  style?: 'normal' | 'italic';
  file: string;
};

const FONT_VARIANTS: readonly FontVariant[] = [
  {
    family: 'Libre Baskerville',
    weight: 400,
    file: '../../public/resume/fonts/LibreBaskerville-Regular-latin.woff2',
  },
  {
    family: 'Libre Baskerville',
    weight: 700,
    file: '../../public/resume/fonts/LibreBaskerville-Bold-latin.woff2',
  },
  {
    family: 'Inter',
    weight: 400,
    file: '../../public/resume/fonts/Inter-Regular-latin.woff2',
  },
  {
    family: 'Inter',
    weight: 600,
    file: '../../public/resume/fonts/Inter-SemiBold-latin.woff2',
  },
  {
    family: 'IBM Plex Mono',
    weight: 400,
    file: '../../public/resume/fonts/IBMPlexMono-Regular-latin.woff2',
  },
  {
    family: 'IBM Plex Mono',
    weight: 600,
    file: '../../public/resume/fonts/IBMPlexMono-SemiBold-latin.woff2',
  },
] as const;

function loadFontBase64(path: string) {
  const buffer = readFileSync(new URL(path, import.meta.url));
  return buffer.toString('base64');
}

export function getFontFaceCss() {
  if (cachedFontFaceCss) {
    return cachedFontFaceCss;
  }

  const css = FONT_VARIANTS.map(variant => {
    const { family, weight, style = 'normal', file } = variant;
    const base64 = loadFontBase64(file);
    return `@font-face { font-family: '${family}'; font-style: ${style}; font-weight: ${weight}; font-display: swap; src: url(data:font/woff2;base64,${base64}) format('woff2'); }\n`;
  }).join('');

  cachedFontFaceCss = css;
  return css;
}

