# Template System

Handlebars templates live under `apps/web/resume/templates/`:

- `classic.hbs` – Serif, conservative layout (Libre Baskerville)
- `modern.hbs` – Sans serif with blue accent (Inter)
- `minimal.hbs` – Monospaced treatment (IBM Plex Mono)
- `partials/head.hbs` – `<head>` partial that injects tokens + `<title>`
- `partials/tokens-css.hbs` – shared CSS variables and base styles

## Usage

```handlebars
<!DOCTYPE html>
<html>
<head>
{{> head}}
<!-- Template-specific font link -->
<link href="..." rel="stylesheet" />
</head>
<body class="template-{{templateName}}">
  ...
</body>
</html>
```

The API route passes `templateName` so the CSS variables in `tokens-css.hbs` can scope to `.template-classic`, `.template-modern`, and `.template-minimal`.

## Fonts

Each template includes its Google Fonts `<link>` so Playwright fetches the font while rendering. Fonts are embedded into the generated PDF automatically. To self-host later, replace the `<link>` tags with `@font-face` rules that point to `/public/fonts/...`.

## Pagination & Styles

- Base rules set `@page` margins to 20mm and apply neutral typography.
- Section headings use border-bottom hairlines; keep at ≥0.75pt for print.
- Add `.page-break { page-break-before: always; }` as needed inside templates.

## Where to Extend

- Shared helpers can be registered in `apps/web/resume/server/compile.ts` if we need custom Handlebars functions (e.g., `formatDate`, `join`).
- Add new templates by duplicating an existing `.hbs`, adjusting fonts, and updating the `TEMPLATES` array in `apps/web/resume/shared/templates.ts`.
