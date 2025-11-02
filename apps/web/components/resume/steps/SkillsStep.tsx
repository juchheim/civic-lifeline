import type { ChangeEvent } from 'react';

import { SKILL_SUGGESTIONS } from '../constants';

type SkillsStepProps = {
  skills: string[];
  skillDraft: string;
  onChangeDraft: (value: string) => void;
  onCommitDraft: () => void;
  onAddSkill: (value: string) => void;
  onRemoveSkill: (skill: string) => void;
  skillsHelpId: string;
};

export function SkillsStep({
  skills,
  skillDraft,
  onChangeDraft,
  onCommitDraft,
  onAddSkill,
  onRemoveSkill,
  skillsHelpId,
}: SkillsStepProps) {
  const handleDraftChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChangeDraft(event.target.value);
  };

  return (
    <div className="flex flex-col gap-5">
      <p id={skillsHelpId} className="text-lg text-neutral-600">
        Add short phrases like Cash Handling or Teamwork. Press Enter after each skill or pick from the suggestions.
      </p>
      <div
        className={`flex flex-wrap items-center gap-2 rounded-lg border-2 px-3 py-3 ${
          skills.length ? 'border-neutral-300 bg-white' : 'border-dashed border-neutral-300 bg-neutral-50'
        }`}
      >
        {skills.map(skill => (
          <span
            key={skill}
            className="inline-flex items-center gap-2 rounded-full bg-neutral-100 px-3 py-1 text-sm font-medium text-neutral-800"
          >
            {skill}
            <button
              type="button"
              className="rounded-full bg-neutral-300 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-neutral-800 transition hover:bg-neutral-400"
              onClick={() => onRemoveSkill(skill)}
              aria-label={`Remove ${skill}`}
            >
              Remove
            </button>
          </span>
        ))}
        <input
          className="min-w-[12rem] flex-1 rounded border-none bg-transparent px-2 py-1 text-base text-neutral-900 outline-none placeholder:text-neutral-400"
          placeholder="Type a skill and press Enter"
          value={skillDraft}
          onChange={handleDraftChange}
          onKeyDown={event => {
            if (event.key === 'Enter') {
              event.preventDefault();
              onCommitDraft();
            }
          }}
          onBlur={onCommitDraft}
          aria-describedby={skillsHelpId}
        />
      </div>
      <div className="flex flex-wrap gap-2">
        {SKILL_SUGGESTIONS.map(skill => (
          <button
            key={skill}
            type="button"
            className="rounded-full border border-neutral-300 px-3 py-1 text-sm text-neutral-700 transition hover:border-emerald-500 hover:text-emerald-700"
            onClick={() => onAddSkill(skill)}
          >
            {skill}
          </button>
        ))}
      </div>
    </div>
  );
}
