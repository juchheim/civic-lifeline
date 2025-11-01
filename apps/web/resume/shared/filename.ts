import { type TemplateName } from './templates';

const DEFAULT_PREFIX = 'resume';

export function buildResumeFilename(rawName: string | undefined, template: TemplateName) {
  const fallback = `${DEFAULT_PREFIX}-${template}.pdf`;
  if (!rawName) return fallback;

  const normalized = rawName
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
  if (!normalized) return fallback;

  const parts = normalized
    .split(/\s+/)
    .map(part => part.replace(/[^A-Za-z0-9]/g, ''))
    .filter(Boolean)
    .map(part => {
      if (part.length === 0) return part;
      if (part.length === 1) return part.toUpperCase();
      return part[0].toUpperCase() + part.slice(1).toLowerCase();
    });
  if (!parts.length) return fallback;

  return `${parts.join('-')}-resume.pdf`;
}
