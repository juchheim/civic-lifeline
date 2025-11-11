import { describe, expect, it } from 'vitest';

import { getFontFaceCss } from '../font-css';

describe('font face css embedding', () => {
  it('inlines fonts using data URIs without remote dependencies', () => {
    const css = getFontFaceCss();

    expect(css).toContain("@font-face");
    expect(css).toContain("data:font/woff2;base64,");
    expect(css).not.toContain("fonts.googleapis.com");
    expect(css).not.toContain("fonts.gstatic.com");
  });
});

