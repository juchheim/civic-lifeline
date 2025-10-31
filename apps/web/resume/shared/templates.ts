export const TEMPLATES = ['classic', 'modern', 'minimal'] as const;
export type TemplateName = (typeof TEMPLATES)[number];
