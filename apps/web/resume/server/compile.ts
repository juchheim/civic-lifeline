import Handlebars from 'handlebars';
import type { ResumePayload } from './validation';
import headPartial from '../templates/partials/head.hbs';
import tokensCssPartial from '../templates/partials/tokens-css.hbs';
import classicTemplate from '../templates/classic.hbs';
import modernTemplate from '../templates/modern.hbs';
import minimalTemplate from '../templates/minimal.hbs';

const PARTIALS: Record<string, string> = {
  head: headPartial,
  'tokens-css': tokensCssPartial,
};

const TEMPLATES: Record<string, string> = {
  classic: classicTemplate,
  modern: modernTemplate,
  minimal: minimalTemplate,
};

let partialsRegistered = false;

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
