# Purpose

Provide a single source of truth for colors, typography, spacing, borders, and print rules used by:

- the frontend preview components, and
- the server-rendered templates (Classic, Modern, Minimal) under `apps/web/resume/templates`.

This keeps all three templates visually distinct yet coherent, and ensures print-safe output in PDFs.

## Token Model (three layers)

- Core tokens – neutrals, spacing scale, type scale, borders.
- Template tokens – per-template brand color + font family.
- CSS variables – emitted to both the client preview and Handlebars templates.

## Core Tokens (reference)

```json
{
  "color": {
    "neutral": {
      "0": "#FFFFFF",
      "50": "#FAFAFA",
      "100": "#F2F2F2",
      "200": "#E6E6E6",
      "300": "#D4D4D4",
      "400": "#A3A3A3",
      "500": "#737373",
      "600": "#525252",
      "700": "#404040",
      "800": "#262626",
      "900": "#171717",
      "black": "#000000"
    }
  },
  "space": { "0":0, "1":4, "2":8, "3":12, "4":16, "5":24, "6":32, "7":40, "8":48 },
  "radius": { "none":0, "sm":2, "md":4 },
  "border": { "hairline":"0.75pt", "thin":"1pt" },
  "typeScalePx": { "xs":12, "sm":13, "base":14, "lg":16, "xl":20, "h2":16, "h1":28 }
}
```

Print note: use border.hairline (0.75pt) or thin (1pt); avoid sub‑hairline borders which may drop in print. Prefer color.neutral.900 for body text (or black in PDFs).

## Template Tokens

```json
{
  "classic": {
    "fontFamily": "'Libre Baskerville', serif",
    "brand": { "primary": "#2C2C2C", "accent": "#6B7280" },
    "headingWeight": 700,
    "bodyWeight": 400
  },
  "modern": {
    "fontFamily": "'Inter', sans-serif",
    "brand": { "primary": "#1B4DB1", "accent": "#0F172A" },
    "headingWeight": 600,
    "bodyWeight": 400
  },
  "minimal": {
    "fontFamily": "'IBM Plex Mono', monospace",
    "brand": { "primary": "#374151", "accent": "#9CA3AF" },
    "headingWeight": 600,
    "bodyWeight": 400
  }
}
```

## CSS Variables (to share across client + server)

Add the following to `apps/web/resume/templates/partials/tokens-css.hbs` so both the preview (future) and server templates stay in sync. Apply a template class on the `<body>`: `.template-classic`, `.template-modern`, `.template-minimal`.

```css
:root {
  /* Core neutrals */
  --c-n-0:#FFFFFF; --c-n-50:#FAFAFA; --c-n-100:#F2F2F2; --c-n-200:#E6E6E6;
  --c-n-300:#D4D4D4; --c-n-400:#A3A3A3; --c-n-500:#737373; --c-n-600:#525252;
  --c-n-700:#404040; --c-n-800:#262626; --c-n-900:#171717; --c-black:#000;

  /* Spacing */
  --space-0:0; --space-1:4px; --space-2:8px; --space-3:12px; --space-4:16px;
  --space-5:24px; --space-6:32px; --space-7:40px; --space-8:48px;

  /* Borders */
  --border-hairline:0.75pt; --border-thin:1pt; --radius-sm:2px; --radius-md:4px;

  /* Type scale */
  --fs-xs:12px; --fs-sm:13px; --fs-base:14px; --fs-lg:16px; --fs-xl:20px;
  --fs-h2:16px; --fs-h1:28px;
}

/* Template: Classic */
.template-classic {
  --font-family:"Libre Baskerville", serif;
  --brand-primary:#2C2C2C; --brand-accent:#6B7280;
  --weight-heading:700; --weight-body:400;
}

/* Template: Modern */
.template-modern {
  --font-family:"Inter", system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
  --brand-primary:#1B4DB1; --brand-accent:#0F172A;
  --weight-heading:600; --weight-body:400;
}

/* Template: Minimal */
.template-minimal {
  --font-family:"IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, monospace;
  --brand-primary:#374151; --brand-accent:#9CA3AF;
  --weight-heading:600; --weight-body:400;
}

/* Common usage */
body { font-family: var(--font-family); color: var(--c-n-900); font-size: var(--fs-base); }
h1 { font-size: var(--fs-h1); font-weight: var(--weight-heading); margin: 0 0 var(--space-2); }
h2 { font-size: var(--fs-h2); font-weight: var(--weight-heading); color: var(--brand-primary);
  border-bottom: var(--border-hairline) solid var(--c-n-300); margin: var(--space-5) 0 var(--space-2); }
p, li { font-weight: var(--weight-body); line-height: 1.45; }
```

## Body class suggestion inside Handlebars HTML

```handlebars
<body class="template-{{templateName}}"> ... </body>
```

Where templateName is classic | modern | minimal passed from the route.

## Google Fonts (server + client)

Add to `<head>` of each template or to a shared partial:

```html
<!-- Classic -->
<link href="https://fonts.googleapis.com/css2?family=Libre+Baskerville:wght@400;700&display=swap" rel="stylesheet" />
<!-- Modern -->
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600&display=swap" rel="stylesheet" />
<!-- Minimal -->
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600&display=swap" rel="stylesheet" />
```

## Self‑hosting (recommended for reliability)

At build time, download .woff2 subsets and reference via @font-face with absolute URLs (so Playwright can resolve them). Example:

```css
@font-face {
  font-family: 'Inter'; font-style: normal; font-weight: 400;
  src: url('/fonts/inter-400.woff2') format('woff2'); font-display: swap;
}
```

## Print-Safe Guidance

- Prefer #000000 or neutral.900 for body text; avoid < 400 font weight for small text.
- Backgrounds and rules: keep contrast ≥ 4.5:1; avoid ultra‑light tints that disappear on grayscale printers.
- Minimum border thickness: 0.75pt; padding ≥ --space-2 around sections.
- Page margins via `@page { margin: 20mm };` ensure content fits A4/Letter gracefully.

## Frontend Consumption (tokens.ts)

```typescript
export const TOKENS = {
  space: [0,4,8,12,16,24,32,40,48],
  radius: { sm:2, md:4 },
  type: { xs:12, sm:13, base:14, lg:16, xl:20, h2:16, h1:28 },
  templates: {
    classic: { font:"'Libre Baskerville', serif", brand:{ primary:'#2C2C2C', accent:'#6B7280' } },
    modern: { font:"'Inter', sans-serif", brand:{ primary:'#1B4DB1', accent:'#0F172A' } },
    minimal: { font:"'IBM Plex Mono', monospace", brand:{ primary:'#374151', accent:'#9CA3AF' } }
  }
} as const;
```

> Consider placing a canonical `TOKENS` export in `apps/web/resume/shared/tokens.ts` when the preview UI grows.

## Versioning & Governance

Keep this file as the single authority on tokens.

Any change to fonts, sizes, or colors must be reflected in:

1. CSS variables, 2) Handlebars templates, 3) frontend tokens.ts.

Bump a simple TOKENS_VERSION string to invalidate stale caches if needed.
