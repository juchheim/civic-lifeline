/**
 * Brand color constants - single source of truth for Civic Lifeline colors
 * 
 * These values are used in:
 * - Tailwind config (tailwind.config.ts)
 * - Resume PDF templates (resume/templates/partials/tokens-css.hbs)
 * - Any other places that need direct color values
 * 
 * To update colors site-wide, change these values and update:
 * 1. tailwind.config.ts (civic-green and civic-blue)
 * 2. resume/templates/partials/tokens-css.hbs (template-modern brand-primary)
 * 3. docs/design/design-system.md (documentation)
 */

export const BRAND_COLORS = {
  green: '#9ab955',
  blue: '#153eb0',
} as const;

export type BrandColor = typeof BRAND_COLORS[keyof typeof BRAND_COLORS];

