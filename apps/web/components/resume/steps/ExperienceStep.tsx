import type { ResumePayload } from '@/lib/resume/types';

type ExperienceEntry = NonNullable<ResumePayload['experience']>[number];

type TimelineDraft = {
  startMonth: string;
  startYear: string;
  endMonth: string;
  endYear: string;
  endPresent: boolean;
};

type ExperienceStepProps = {
  experience: ExperienceEntry[];
  experienceHelpId: string;
  onAddExperience: () => void;
  onRemoveExperience: (index: number) => void;
  onMoveExperience: (index: number, offset: number) => void;
  onUpdateExperienceField: (index: number, field: keyof ExperienceEntry, value: string) => void;
  timelineDrafts: TimelineDraft[];
  bulletsInputs: string[];
  onUpdateTimelineDraft: (
    index: number,
    section: 'start' | 'end',
    part: 'month' | 'year' | 'present',
    value: string | boolean,
  ) => void;
  monthOptions: ReadonlyArray<{ value: string; label: string }>;
  yearOptions: string[];
  experienceLimit: number;
};

export function ExperienceStep({
  experience,
  experienceHelpId,
  onAddExperience,
  onRemoveExperience,
  onMoveExperience,
  onUpdateExperienceField,
  timelineDrafts,
  bulletsInputs,
  onUpdateTimelineDraft,
  monthOptions,
  yearOptions,
  experienceLimit,
}: ExperienceStepProps) {
  return (
    <div className="flex flex-col gap-6" aria-describedby={experienceHelpId}>
      <p id={experienceHelpId} className="text-lg text-neutral-600">
        List your recent jobs or volunteer work. Focus on the tasks that show reliability and people skills.
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-full bg-brand-primary px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-primary/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-brand-primary/40"
          onClick={onAddExperience}
          disabled={experience.length >= experienceLimit}
        >
          Add a job
        </button>
        {!experience.length && (
          <span className="text-sm text-neutral-500">Start with your most recent role.</span>
        )}
      </div>
      {!experience.length && (
        <div className="rounded-lg border border-dashed border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-600">
          Add your first job to show employers what you have done and how you helped.
        </div>
      )}
      <div className="flex flex-col gap-6">
        {experience.map((entry, index) => {
          const timelineDraft =
            timelineDrafts[index] ?? { startMonth: '', startYear: '', endMonth: '', endYear: '', endPresent: false };
          return (
            <div key={`experience-${index}`} className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200 pb-3">
                <span className="text-lg font-semibold text-neutral-900">Role {index + 1}</span>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onMoveExperience(index, -1)}
                    className="rounded border border-neutral-300 px-3 py-1 text-sm font-medium text-neutral-700 transition hover:border-neutral-500 hover:text-neutral-900 focus:outline-none focus:ring-4 focus:ring-neutral-200 disabled:cursor-not-allowed disabled:text-neutral-400"
                    disabled={index === 0}
                    title="Move this role up"
                  >
                    Move up
                  </button>
                  <button
                    type="button"
                    onClick={() => onMoveExperience(index, 1)}
                    className="rounded border border-neutral-300 px-3 py-1 text-sm font-medium text-neutral-700 transition hover:border-neutral-500 hover:text-neutral-900 focus:outline-none focus:ring-4 focus:ring-neutral-200 disabled:cursor-not-allowed disabled:text-neutral-400"
                    disabled={index === experience.length - 1}
                    title="Move this role down"
                  >
                    Move down
                  </button>
                  <button
                    type="button"
                    onClick={() => onRemoveExperience(index)}
                    className="rounded bg-red-600 px-3 py-1 text-sm font-semibold text-white transition hover:bg-red-700 focus:outline-none focus:ring-4 focus:ring-red-200"
                    title="Remove this role"
                  >
                    Remove
                  </button>
                </div>
              </div>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <label className="flex flex-col gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-neutral-600">Job Title</span>
                  <input
                    className="rounded border border-neutral-300 px-3 py-2 text-base focus:border-civic-green focus:outline-none focus:ring-4 focus:ring-civic-green/30"
                    value={entry.title ?? ''}
                    onChange={event => onUpdateExperienceField(index, 'title', event.target.value)}
                    onBlur={event => {
                      const capitalized = event.target.value
                        .trim()
                        .split(' ')
                        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                        .join(' ');
                      onUpdateExperienceField(index, 'title', capitalized);
                    }}
                    placeholder="Cashier"
                    autoCapitalize="words"
                  />
                </label>
                <label className="flex flex-col gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-neutral-600">Employer</span>
                  <input
                    className="rounded border border-neutral-300 px-3 py-2 text-base focus:border-civic-green focus:outline-none focus:ring-4 focus:ring-civic-green/30"
                    value={entry.company ?? ''}
                    onChange={event => onUpdateExperienceField(index, 'company', event.target.value)}
                    onBlur={event => {
                      const capitalized = event.target.value
                        .trim()
                        .split(' ')
                        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                        .join(' ');
                      onUpdateExperienceField(index, 'company', capitalized);
                    }}
                    placeholder="Walmart"
                    autoCapitalize="words"
                  />
                </label>
                <div className="flex flex-col gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-neutral-600">Start date</span>
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      className="rounded border border-neutral-300 px-2 py-2 text-sm focus:border-civic-green focus:outline-none focus:ring-4 focus:ring-civic-green/30"
                      value={timelineDraft.startMonth}
                      onChange={event => onUpdateTimelineDraft(index, 'start', 'month', event.target.value)}
                    >
                      <option value="">Month</option>
                      {monthOptions.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <select
                      className="rounded border border-neutral-300 px-2 py-2 text-sm focus:border-civic-green focus:outline-none focus:ring-4 focus:ring-civic-green/30"
                      value={timelineDraft.startYear}
                      onChange={event => onUpdateTimelineDraft(index, 'start', 'year', event.target.value)}
                    >
                      <option value="">Year</option>
                      {yearOptions.map(year => (
                        <option key={year} value={year}>
                          {year}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-neutral-600">End date</span>
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      className="rounded border border-neutral-300 px-2 py-2 text-sm focus:border-civic-green focus:outline-none focus:ring-4 focus:ring-civic-green/30"
                      value={timelineDraft.endMonth}
                      onChange={event => onUpdateTimelineDraft(index, 'end', 'month', event.target.value)}
                      disabled={timelineDraft.endPresent}
                    >
                      <option value="">Month</option>
                      {monthOptions.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <select
                      className="rounded border border-neutral-300 px-2 py-2 text-sm focus:border-civic-green focus:outline-none focus:ring-4 focus:ring-civic-green/30"
                      value={timelineDraft.endYear}
                      onChange={event => onUpdateTimelineDraft(index, 'end', 'year', event.target.value)}
                      disabled={timelineDraft.endPresent}
                    >
                      <option value="">Year</option>
                      {yearOptions.map(year => (
                        <option key={year} value={year}>
                          {year}
                        </option>
                      ))}
                    </select>
                  </div>
                  <label className="flex items-center gap-2 text-sm text-neutral-700">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-neutral-400 text-civic-green focus:ring-civic-green/30"
                      checked={timelineDraft.endPresent}
                      onChange={event => onUpdateTimelineDraft(index, 'end', 'present', event.target.checked)}
                    />
                    I still work here
                  </label>
                </div>
              </div>
              <label className="mt-4 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wide text-neutral-600">What you did</span>
                  <span className="text-xs text-neutral-500">
                    {(bulletsInputs[index] ?? '').split('\n').filter(line => line.trim()).length} tasks (up to 8)
                  </span>
                </div>
                <textarea
                  className="min-h-[140px] rounded border border-neutral-300 px-3 py-2 text-base focus:border-civic-green focus:outline-none focus:ring-4 focus:ring-civic-green/30"
                  value={bulletsInputs[index] ?? ''}
                  onChange={event => onUpdateExperienceField(index, 'bullets', event.target.value)}
                  placeholder={'Served customers at checkout\nRestocked shelves\nCleaned work area'}
                  spellCheck="true"
                />
                <span className="text-xs text-neutral-500">
                  One task per line. Start each line with a verb: Served, Helped, Managed, Trained.
                </span>
              </label>
            </div>
          );
        })}
      </div>
    </div>
  );
}
