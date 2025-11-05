import type { ResumePayload } from '@/lib/resume/types';

type EducationEntry = NonNullable<ResumePayload['education']>[number];

type EducationStepProps = {
  education: EducationEntry[];
  educationLimit: number;
  onAddEducation: () => void;
  onRemoveEducation: (index: number) => void;
  onMoveEducation: (index: number, offset: number) => void;
  onUpdateEducationField: (index: number, field: keyof EducationEntry, value: string) => void;
};

export function EducationStep({
  education,
  educationLimit,
  onAddEducation,
  onRemoveEducation,
  onMoveEducation,
  onUpdateEducationField,
}: EducationStepProps) {
  return (
    <div className="flex flex-col gap-6">
      <p className="text-lg text-neutral-600">
        Share your schooling, certificates, or training programs. Most recent items should go first.
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          className="rounded bg-neutral-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-neutral-800 focus:outline-none focus:ring-4 focus:ring-neutral-300 disabled:cursor-not-allowed"
          onClick={onAddEducation}
          disabled={education.length >= educationLimit}
        >
          Add education
        </button>
        {!education.length && (
          <span className="text-sm text-neutral-500">Include diplomas, certificates, or relevant coursework.</span>
        )}
      </div>
      {!education.length && (
        <div className="rounded-lg border border-dashed border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-600">
          Add your highest level of education or any job-ready training.
        </div>
      )}
      <div className="flex flex-col gap-6">
        {education.map((entry, index) => (
          <div key={`education-${index}`} className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200 pb-3">
              <span className="text-lg font-semibold text-neutral-900">Education {index + 1}</span>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => onMoveEducation(index, -1)}
                  className="rounded border border-neutral-300 px-3 py-1 text-sm font-medium text-neutral-700 transition hover:border-neutral-500 hover:text-neutral-900 focus:outline-none focus:ring-4 focus:ring-neutral-200 disabled:cursor-not-allowed disabled:text-neutral-400"
                  disabled={index === 0}
                  title="Move this entry up"
                >
                  Move up
                </button>
                <button
                  type="button"
                  onClick={() => onMoveEducation(index, 1)}
                  className="rounded border border-neutral-300 px-3 py-1 text-sm font-medium text-neutral-700 transition hover:border-neutral-500 hover:text-neutral-900 focus:outline-none focus:ring-4 focus:ring-neutral-200 disabled:cursor-not-allowed disabled:text-neutral-400"
                  disabled={index === education.length - 1}
                  title="Move this entry down"
                >
                  Move down
                </button>
                <button
                  type="button"
                  onClick={() => onRemoveEducation(index)}
                  className="rounded bg-red-600 px-3 py-1 text-sm font-semibold text-white transition hover:bg-red-700 focus:outline-none focus:ring-4 focus:ring-red-200"
                  title="Remove this entry"
                >
                  Remove
                </button>
              </div>
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label className="flex flex-col gap-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-neutral-600">Type</span>
                <input
                  type="text"
                  className="rounded border border-neutral-300 px-3 py-2 text-base focus:border-civic-green focus:outline-none focus:ring-4 focus:ring-civic-green/30"
                  value={entry.degree ?? ''}
                  onChange={event => onUpdateEducationField(index, 'degree', event.target.value)}
                  onBlur={event => {
                    const capitalized = event.target.value
                      .trim()
                      .split(' ')
                      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                      .join(' ');
                    onUpdateEducationField(index, 'degree', capitalized);
                  }}
                  placeholder="High School Diploma"
                  autoCapitalize="words"
                />
                <span className="text-xs text-neutral-500">Example: GED, CPR Certificate, Food Handler Permit</span>
              </label>
              <label className="flex flex-col gap-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-neutral-600">School name</span>
                <input
                  type="text"
                  className="rounded border border-neutral-300 px-3 py-2 text-base focus:border-civic-green focus:outline-none focus:ring-4 focus:ring-civic-green/30"
                  value={entry.school ?? ''}
                  onChange={event => onUpdateEducationField(index, 'school', event.target.value)}
                  onBlur={event => {
                    const capitalized = event.target.value
                      .trim()
                      .split(' ')
                      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                      .join(' ');
                    onUpdateEducationField(index, 'school', capitalized);
                  }}
                  placeholder="Greenwood High School"
                  autoCapitalize="words"
                />
              </label>
              <label className="flex flex-col gap-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-neutral-600">
                  Year finished (if done)
                </span>
                <input
                  type="number"
                  className="rounded border border-neutral-300 px-3 py-2 text-base focus:border-civic-green focus:outline-none focus:ring-4 focus:ring-civic-green/30"
                  value={entry.graduationYear ?? ''}
                  onChange={event => onUpdateEducationField(index, 'graduationYear', event.target.value)}
                  placeholder="2022"
                  min="1950"
                  max="2030"
                />
              </label>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
