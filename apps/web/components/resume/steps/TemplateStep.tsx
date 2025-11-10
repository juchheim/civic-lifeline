import { useRef } from 'react';
import type { KeyboardEvent } from 'react';
import { Check } from 'lucide-react';

import { TEMPLATES, type TemplateName } from '@/resume/shared/templates';

const TEMPLATE_DETAILS: Record<TemplateName, { label: string; description: string }> = {
  classic: {
    label: 'Classic',
    description: 'Best for office jobs, retail, and customer service roles.',
  },
  modern: {
    label: 'Modern',
    description: 'Good for healthcare, education, and professional positions.',
  },
  minimal: {
    label: 'Minimal',
    description: 'Works well for tech jobs, creative fields, and startups.',
  },
};

type TemplateStepProps = {
  selectedTemplate: TemplateName | null;
  onSelectTemplate: (template: TemplateName) => void;
  onRequestNext?: () => void;
  errorMessage?: string | null;
  errorId?: string;
};

export function TemplateStep({ selectedTemplate, onSelectTemplate, onRequestNext, errorMessage, errorId }: TemplateStepProps) {
  const optionRefs = useRef<Record<TemplateName, HTMLInputElement | null>>({
    classic: null,
    modern: null,
    minimal: null,
  });

  const handleGroupKeyDown = (event: KeyboardEvent<HTMLFieldSetElement>) => {
    if (event.key === 'Enter' && selectedTemplate) {
      event.preventDefault();
      onRequestNext?.();
      return;
    }

    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault();
      const currentIndex = selectedTemplate ? TEMPLATES.indexOf(selectedTemplate) : 0;
      const direction = event.key === 'ArrowRight' ? 1 : -1;
      const nextIndex = (currentIndex + direction + TEMPLATES.length) % TEMPLATES.length;
      const nextTemplate = TEMPLATES[nextIndex];
      onSelectTemplate(nextTemplate);
      optionRefs.current[nextTemplate]?.focus();
    }
  };

  const selectionAnnouncement = selectedTemplate ? `${TEMPLATE_DETAILS[selectedTemplate].label} template selected.` : 'No template selected.';

  return (
    <fieldset
      role="radiogroup"
      aria-label="Resume template"
      className="flex flex-col gap-4"
      onKeyDown={handleGroupKeyDown}
      aria-describedby={errorMessage && errorId ? errorId : undefined}
    >
      <legend className="sr-only">Resume template</legend>
      <div className="grid gap-4 md:grid-cols-3">
        {TEMPLATES.map(option => {
          const detail = TEMPLATE_DETAILS[option];
          const isSelected = selectedTemplate === option;
          return (
            <label
              key={option}
              className={`group relative flex h-full flex-col justify-between rounded-2xl border px-5 py-4 text-left shadow-[0_1px_3px_rgba(15,23,42,0.08)] transition duration-200 focus-within:-translate-y-0.5 focus-within:outline-none focus-within:ring-2 focus-within:ring-brand-primary/70 focus-within:ring-offset-2 ${
                isSelected
                  ? 'border-brand-primary bg-brand-primary/5 text-brand-primary shadow-[0_12px_30px_rgba(15,23,42,0.08)]'
                  : 'border-slate-200 bg-white text-slate-800 hover:-translate-y-0.5 hover:shadow-md'
              }`}
            >
              <input
                type="radio"
                name="resume-template"
                value={option}
                checked={isSelected}
                onChange={() => onSelectTemplate(option)}
                className="sr-only"
                ref={element => {
                  optionRefs.current[option] = element;
                }}
              />
              <div className="flex flex-col gap-4">
                <div className="relative flex flex-col gap-2 pr-12 sm:pr-16">
                  <span className="text-lg font-semibold text-slate-900">{detail.label}</span>
                  <p className="text-sm font-medium text-slate-600" style={{ textWrap: 'balance' }}>
                    {detail.description}
                  </p>
                  {isSelected && (
                    <span className="absolute right-0 top-0 inline-flex items-center gap-1 rounded-full bg-brand-primary/10 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-brand-primary">
                      <Check className="h-3.5 w-3.5" aria-hidden="true" />
                      Selected
                    </span>
                  )}
                </div>
                <TemplatePreview template={option} />
              </div>
            </label>
          );
        })}
      </div>
      <div aria-live="polite" className="sr-only">
        {selectionAnnouncement}
      </div>
      {errorMessage && (
        <p id={errorId} className="text-sm font-semibold text-rose-600" role="alert" aria-live="assertive">
          {errorMessage}
        </p>
      )}
    </fieldset>
  );
}

function TemplatePreview({ template }: { template: TemplateName }) {
  const accentClass = template === 'modern' ? 'bg-civic-blue' : template === 'minimal' ? 'bg-neutral-900' : 'bg-neutral-700';
  const accentLightClass = template === 'modern' ? 'bg-civic-blue/30' : template === 'minimal' ? 'bg-neutral-300' : 'bg-neutral-300';
  const bulletClass = template === 'minimal' ? 'bg-neutral-800' : template === 'modern' ? 'bg-civic-blue/40' : 'bg-neutral-400';

  return (
    <div className="flex flex-col gap-2 rounded border border-neutral-200 bg-white p-3" aria-hidden="true">
      <div className={`h-2 w-2/3 rounded ${accentClass}`} />
      <div className="flex flex-col gap-1">
        <div className={`h-2 w-full rounded ${accentLightClass}`} />
        <div className={`h-2 w-4/6 rounded ${accentLightClass}`} />
      </div>
      <div className="flex flex-col gap-1 pt-1">
        <div className={`h-1.5 w-full rounded ${bulletClass}`} />
        <div className={`h-1.5 w-11/12 rounded ${bulletClass}`} />
        <div className={`h-1.5 w-10/12 rounded ${bulletClass}`} />
      </div>
    </div>
  );
}
