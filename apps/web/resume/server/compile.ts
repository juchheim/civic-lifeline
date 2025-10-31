import { readFileSync, readdirSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Handlebars from 'handlebars';
import type { ResumePayload } from './validation';

const moduleDir = path.dirname(fileURLToPath(import.meta.url));
const templatesDir = path.resolve(moduleDir, '../templates');
let partialsRegistered = false;

function registerPartialsOnce() {
  if (partialsRegistered) return;
  const partialDir = path.join(templatesDir, 'partials');
  try {
    const files = readdirSync(partialDir).filter(file => file.endsWith('.hbs'));
    for (const file of files) {
      const name = path.basename(file, '.hbs');
      Handlebars.registerPartial(name, readFileSync(path.join(partialDir, file), 'utf8'));
    }
  } catch (error) {
    // Partials directory is optional; ignore if missing.
  }
  partialsRegistered = true;
}

export function compileTemplate(templateName: string, data: ResumePayload) {
  registerPartialsOnce();
  const templatePath = path.join(templatesDir, `${templateName}.hbs`);
  const source = readFileSync(templatePath, 'utf8');
  const template = Handlebars.compile(source, { noEscape: true });
  return template({ ...data, templateName });
}
