import type { EducationEntry, ExperienceEntry, TimelineDraft } from '../types';

export const createExperienceEntry = (): ExperienceEntry => ({
  title: '',
  company: '',
});

export const createEducationEntry = (): EducationEntry => ({
  degree: '',
  school: '',
});

export const createTimelineDraft = (): TimelineDraft => ({
  startMonth: '',
  startYear: '',
  endMonth: '',
  endYear: '',
  endPresent: false,
});
