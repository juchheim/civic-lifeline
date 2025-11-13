import { describe, expect, it } from 'vitest';

import type { ResumePayload } from '@/lib/resume/types';

import { buildSubmissionPayload } from './payload';

describe('buildSubmissionPayload', () => {
  const base: ResumePayload = {
    name: 'Jane Doe',
    email: 'jane@example.com',
    phone: '123-456-7890',
    city: 'Austin',
    state: 'TX',
    location: '',
    summary: '',
    skills: [],
    experience: [],
    education: [],
  };

  it('normalizes core contact info, skills, experience, and education', () => {
    const payload = buildSubmissionPayload({
      ...base,
      name: '  Jane Doe  ',
      email: '  jane@example.com ',
      city: '  Austin ',
      state: ' tx ',
      summary: '  Passionate engineer ',
      skills: ['React', ' react ', 'TypeScript', '', 'typescript'],
      experience: [
        {
          title: ' Senior Dev ',
          company: ' ACME ',
          startDate: '2020-01',
          endDate: '2021-06',
          bullets: [' Built things  ', '', ''],
        },
        { title: '', company: 'Nope' },
      ],
      education: [
        { degree: ' BS ', school: ' UT ', graduationYear: ' 2020 ' },
        { degree: '', school: 'Missing' },
      ],
    });

    expect(payload.name).toBe('Jane Doe');
    expect(payload.email).toBe('jane@example.com');
    expect(payload.city).toBe('Austin');
    expect(payload.state).toBe('TX');
    expect(payload.location).toBe('Austin, TX');
    expect(payload.summary).toBe('Passionate engineer');

    expect(payload.skills).toEqual(['React', 'Typescript']);
    expect(payload.experience).toHaveLength(1);
    expect(payload.experience?.[0]).toMatchObject({
      title: 'Senior Dev',
      company: 'ACME',
      bullets: ['Built things'],
    });
    expect(payload.education).toEqual([
      { degree: 'BS', school: 'UT', graduationYear: '2020' },
    ]);
  });

  it('limits duplicate skills by case-insensitive comparison', () => {
    const payload = buildSubmissionPayload({
      ...base,
      skills: ['Node', 'node', 'NODE', 'React'],
    });

    expect(payload.skills).toEqual(['Node', 'React']);
  });
});
