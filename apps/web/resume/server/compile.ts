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
let helpersRegistered = false;

function registerPartialsOnce() {
  if (partialsRegistered) return;
  for (const [name, source] of Object.entries(PARTIALS)) {
    Handlebars.registerPartial(name, source);
  }
  partialsRegistered = true;
}

function registerHelpersOnce() {
  if (helpersRegistered) return;
  Handlebars.registerHelper('formatTimelineRange', (start?: string, end?: string) => {
    const formatted = formatTimelineRange(start, end);
    return formatted ? new Handlebars.SafeString(formatted) : '';
  });
  Handlebars.registerHelper('formatTimelineValue', (value?: string) => {
    const formatted = formatTimelineValue(value);
    return formatted ? new Handlebars.SafeString(formatted) : '';
  });
  helpersRegistered = true;
}

export function compileTemplate(templateName: string, data: ResumePayload) {
  registerPartialsOnce();
  registerHelpersOnce();
  const source = TEMPLATES[templateName];
  if (!source) {
    throw new Error(`Unknown template: ${templateName}`);
  }
  const template = Handlebars.compile(source, { noEscape: true });
  return template({ ...data, templateName });
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;

function formatTimelineValue(value?: string) {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const lower = trimmed.toLowerCase();
  if (lower === 'present') return 'Present';
  if (/^\d{4}$/.test(trimmed)) {
    return trimmed;
  }
  const yearMonthMatch = trimmed.match(/^(\d{4})-(\d{2})$/);
  if (yearMonthMatch) {
    const monthIndex = Number(yearMonthMatch[2]) - 1;
    const month = MONTH_NAMES[monthIndex] ?? yearMonthMatch[2];
    return `${month} ${yearMonthMatch[1]}`;
  }
  const yearMonthDayMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (yearMonthDayMatch) {
    const monthIndex = Number(yearMonthDayMatch[2]) - 1;
    const month = MONTH_NAMES[monthIndex] ?? yearMonthDayMatch[2];
    return `${month} ${yearMonthDayMatch[1]}`;
  }
  return trimmed;
}

function formatTimelineRange(start?: string, end?: string) {
  const startText = formatTimelineValue(start);
  const endText = formatTimelineValue(end);
  if (startText && endText) {
    return `${startText}&ndash;${endText}`;
  }
  if (startText) {
    return startText;
  }
  if (endText) {
    return endText;
  }
  return undefined;
}
