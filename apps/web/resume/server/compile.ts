import { readFileSync } from 'fs';
import Handlebars from 'handlebars';
import type { ResumePayload } from './validation';

const PARTIALS: Record<string, string> = {
  head: readFile('../templates/partials/head.hbs'),
  'tokens-css': readFile('../templates/partials/tokens-css.hbs'),
};

const TEMPLATES: Record<string, string> = {
  classic: readFile('../templates/classic.hbs'),
  modern: readFile('../templates/modern.hbs'),
  minimal: readFile('../templates/minimal.hbs'),
};

let partialsRegistered = false;

function readFile(relativePath: string) {
  return readFileSync(new URL(relativePath, import.meta.url), 'utf8');
}

function registerPartialsOnce() {
  if (partialsRegistered) return;
  for (const [name, source] of Object.entries(PARTIALS)) {
    Handlebars.registerPartial(name, source);
  }
  partialsRegistered = true;
}

export function compileTemplate(templateName: string, data: ResumePayload) {
  registerPartialsOnce();
  const source = TEMPLATES[templateName];
  if (!source) {
    throw new Error(`Unknown template: ${templateName}`);
  }
  const template = Handlebars.compile(source, { noEscape: true });
  return template({ ...data, templateName });
}
