import { describe, expect, it } from 'vitest';

import type { ResumePayload } from '@/lib/resume/types';
import { buildSummaryContext } from '../summary-context';

const basePayload: ResumePayload = {
  name: 'Test User',
  email: 'test@example.com',
  phone: '5551234567',
  city: 'Denver',
  state: 'CO',
  summary: '',
  skills: [],
  experience: [],
  education: [],
};

describe('buildSummaryContext', () => {
  it('selects the most recent role and computes tenure label', () => {
    const payload: ResumePayload = {
      ...basePayload,
      experience: [
        {
          title: 'Cashier',
          company: 'Corner Store',
          startDate: '2018-01',
          endDate: '2020-06',
        },
        {
          title: 'Team Lead',
          company: 'SuperMart',
          startDate: '2021-03',
          endDate: 'present',
        },
      ],
    };

    const { request, display } = buildSummaryContext(payload);

    expect(request.recentRole).toMatchObject({
      title: 'Team Lead',
      employer: 'SuperMart',
    });
    expect(request.recentRole?.tenureLabel).toBeDefined();
    expect(display.roleTitle).toBe('Team Lead');
    expect(display.roleEmployer).toBe('SuperMart');
  });

  it('limits top skills to five unique entries', () => {
    const payload: ResumePayload = {
      ...basePayload,
      skills: ['customer service', 'cash handling', 'Cleaning', 'POS', 'Stocking', 'Cash Handling'],
    };

    const { request, display } = buildSummaryContext(payload);

    expect(request.topSkills).toEqual(['Customer Service', 'Cash Handling', 'Cleaning', 'POS', 'Stocking']);
    expect(display.skills).toHaveLength(5);
  });

  it('captures all highest-level education entries and reading level', () => {
    const payload: ResumePayload = {
      ...basePayload,
      education: [
        { degree: 'Bachelor of Arts', school: 'State College' },
        { degree: 'Master of Science', school: 'Tech University' },
        { degree: 'MBA', school: 'Business School' },
      ],
    };

    const { request, display } = buildSummaryContext(payload);
    expect(request.highestEducation?.labels).toEqual(['Master of Science', 'MBA']);
    expect(request.highestEducation?.readingLevel).toBe('Graduate level');
    expect(display.educationLabels).toEqual(['Master of Science', 'MBA']);
    expect(display.readingLevel).toBe('Graduate level');
  });

  it('falls back to 8th grade reading level when no education exists', () => {
    const payload: ResumePayload = {
      ...basePayload,
      education: [],
    };

    const { request, display } = buildSummaryContext(payload);
    expect(request.highestEducation).toBeUndefined();
    expect(request.readingLevel).toBe('8th grade');
    expect(display.educationLabels).toEqual([]);
    expect(display.readingLevel).toBe('8th grade');
  });

  it('returns contact context with uppercase state', () => {
    const payload: ResumePayload = {
      ...basePayload,
      city: 'Austin',
      state: 'tx',
    };

    const { request } = buildSummaryContext(payload);
    expect(request.contactContext).toEqual({ city: 'Austin', state: 'TX' });
  });
});
