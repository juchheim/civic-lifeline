import { TEMPLATES, type TemplateName } from '@/resume/shared/templates';

const TEMPLATE_DETAILS: Record<TemplateName, { label: string; description: string }> = {
  classic: {
    label: 'Classic',
    description: 'Serif, column-free layout. Best for traditional employers and ATS scans.',
  },
  modern: {
    label: 'Modern',
    description: 'Clean sans-serif with bold headings and accent colour for section titles.',
  },
  minimal: {
    label: 'Minimal',
    description: 'Monospaced typography with generous spacing for tech-forward teams.',
  },
};

type TemplateStepProps = {
  selectedTemplate: TemplateName;
  onSelectTemplate: (template: TemplateName) => void;
};

export function TemplateStep({ selectedTemplate, onSelectTemplate }: TemplateStepProps) {
  return (
    <div className="flex flex-col gap-6">
      <p className="text-lg text-neutral-600">
        Each template keeps your information the same. Choose the look that fits the job you want.
      </p>
      <div role="radiogroup" aria-label="Resume template" className="grid gap-4 md:grid-cols-3">
        {TEMPLATES.map(option => {
          const detail = TEMPLATE_DETAILS[option];
          const isSelected = selectedTemplate === option;
          return (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => onSelectTemplate(option)}
              className={`rounded-xl border-2 px-5 py-4 text-left shadow-sm transition focus:outline-none focus:ring-4 focus:ring-emerald-200 ${
                isSelected
                  ? 'border-emerald-600 bg-emerald-50 text-emerald-900'
                  : 'border-neutral-300 bg-white text-neutral-700 hover:border-emerald-400 hover:text-neutral-900'
              }`}
              title={`Use the ${detail.label} resume template`}
            >
              <div className="flex flex-col gap-4">
                <div>
                  <span className="text-lg font-semibold text-neutral-900">{detail.label}</span>
                  <p className="mt-2 text-sm text-neutral-600">{detail.description}</p>
                </div>
                <TemplatePreview template={option} />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function TemplatePreview({ template }: { template: TemplateName }) {
  const accentClass = template === 'modern' ? 'bg-blue-500' : template === 'minimal' ? 'bg-neutral-900' : 'bg-neutral-700';
  const accentLightClass =
    template === 'modern' ? 'bg-blue-200' : template === 'minimal' ? 'bg-neutral-300' : 'bg-neutral-300';
  const bulletClass = template === 'minimal' ? 'bg-neutral-800' : template === 'modern' ? 'bg-blue-300' : 'bg-neutral-400';

  return (
    <div className="flex flex-col gap-2 rounded border border-neutral-200 bg-white p-3">
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
