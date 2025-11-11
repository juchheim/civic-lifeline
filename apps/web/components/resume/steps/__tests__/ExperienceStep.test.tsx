import React, { useState } from 'react';
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { MAX_BULLETS } from '../../constants';
import { ExperienceStep } from '../ExperienceStep';

const handleTimelineDraft = () => {};

function Wrapper() {
  const [bullets, setBullets] = useState<string[]>(['']);
  return (
    <ExperienceStep
      experience={[{ title: '', company: '' }]}
      experienceHelpId="exp-help"
      onAddExperience={() => {}}
      onRemoveExperience={() => {}}
      onMoveExperience={() => {}}
      onUpdateExperienceField={(index, field, value) => {
        if (field !== 'bullets') return;
        setBullets(prev => {
          const next = [...prev];
          next[index] = value as string;
          return next;
        });
      }}
      timelineDrafts={[{ startMonth: '', startYear: '', endMonth: '', endYear: '', endPresent: false }]}
      bulletsInputs={bullets}
      onUpdateTimelineDraft={handleTimelineDraft}
      monthOptions={[]}
      yearOptions={[]}
      experienceLimit={5}
    />
  );
}

describe('ExperienceStep', () => {
  it('limits bullets to the configured maximum and shows a warning', async () => {
    const user = userEvent.setup();
    render(<Wrapper />);

    const textarea = screen.getByRole('textbox', { name: /what you did/i }) as HTMLTextAreaElement;

    const extraLines = Array.from({ length: MAX_BULLETS + 2 }, (_, idx) => `Task ${idx + 1}`).join('\n');
    await user.clear(textarea);
    await user.type(textarea, extraLines);

    const valueLines = textarea.value.split('\n');
    expect(valueLines).toHaveLength(MAX_BULLETS + 2);
    expect(valueLines.at(-1)).toBe(`Task ${MAX_BULLETS + 2}`);

    expect(
      screen.getByText(/Only the first/i, {
        exact: false,
      }),
    ).toBeInTheDocument();
  });
});
