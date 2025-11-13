import type { ResumePayload } from '@/lib/resume/types';

export type ExperienceEntry = NonNullable<ResumePayload['experience']>[number];
export type EducationEntry = NonNullable<ResumePayload['education']>[number];

export type TimelineDraft = {
  startMonth: string;
  startYear: string;
  endMonth: string;
  endYear: string;
  endPresent: boolean;
};
