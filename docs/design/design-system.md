# Design System

## Foundations
- **Typography**: Inter (UI), Source Serif (long text). Scale: 12–32px.
- **Color**:
  - Primary: Civic Green (#90ae4b) - defined in `lib/theme/colors.ts`
  - Accent: Civic Blue (#153eb0) - defined in `lib/theme/colors.ts`
  - Success: Civic Green (#90ae4b)
  - Warning: Amber 500
  - Error: Rose 600
  - Neutrals: Slate 50–900
- **Spacing**: 4-point grid.
- **Radius**: `rounded-2xl` for cards; `rounded-lg` for inputs.
- **Shadows**: Soft elevation on hover; none for static text.

## Motion
- 150–250ms ease-out for micro-interactions; respect `prefers-reduced-motion`.

## Iconography
- Lucide icons; consistent stroke; descriptive `aria-label`.

## Content Tone
- Plain language, respectful, empowering. Avoid jargon.
