import type { ResumePayload } from '@/lib/resume/types';
import type { TemplateName } from '@/resume/shared/templates';

export const STORAGE_KEY = 'resume.draft';
export const STORAGE_VERSION = 3;
export const EXPERIENCE_LIMIT = 20;
export const EDUCATION_LIMIT = 10;
export const MAX_BULLETS = 8;
export const SUMMARY_MIN_CHARS = 12;
export const MAX_SKILLS = 10;

export type StepKey = 'template' | 'contact' | 'skills' | 'experience' | 'education' | 'summary' | 'preview';

export const WIZARD_STEPS: Array<{ key: StepKey; title: string; description: string }> = [
  { key: 'template', title: 'Template', description: 'Pick a style. You can change this later.' },
  { key: 'contact', title: 'Contact info', description: 'Share how employers can reach you.' },
  { key: 'skills', title: 'Skills', description: 'List your abilities.' },
  { key: 'experience', title: 'Experience', description: 'Add past jobs and what you did.' },
  { key: 'education', title: 'Education', description: 'Show your schooling or training.' },
  { key: 'summary', title: 'Summary', description: 'Describe your strengths in a few sentences.' },
  { key: 'preview', title: 'Preview', description: 'Check the final resume before downloading.' },
];

export const PREVIEW_UNLOCK_STEP_KEY: StepKey = 'skills';
export const PREVIEW_UNLOCK_STEP_INDEX = WIZARD_STEPS.findIndex(step => step.key === PREVIEW_UNLOCK_STEP_KEY);

export const DEFAULT_PAYLOAD: ResumePayload = {
  name: '',
  email: '',
  phone: '',
  city: '',
  state: '',
  summary: '',
  skills: [],
  experience: [],
  education: [],
};

export const createDefaultPayload = (): ResumePayload => ({
  ...DEFAULT_PAYLOAD,
  skills: [],
  experience: [],
  education: [],
});

export const DEFAULT_TEMPLATE: TemplateName = 'classic';

export const SKILL_SUGGESTIONS = [
  'Customer Service',
  'Cash Handling',
  'POS/Register',
  'Returns & Exchanges',
  'Food Safety',
  'Cleaning & Sanitizing',
  'Stocking',
  'Teamwork',
  'Punctuality',
  'Basic Computer Skills',
] as const;
