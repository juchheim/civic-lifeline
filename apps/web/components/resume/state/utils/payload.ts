import type { ResumePayload } from '@/lib/resume/types';
import { formatPhoneNumber, normalizeSkillLabel } from '@/lib/resume/utils/format';
import { normalizeTimeline } from '@/lib/resume/utils/timeline';

import { MAX_BULLETS, MAX_SKILLS } from '../../constants';
import type { EducationEntry, ExperienceEntry } from '../types';

export const buildSubmissionPayload = (draft: ResumePayload): ResumePayload => {
  const name = draft.name.trim();
  const email = draft.email.trim();
  const phone = formatPhoneNumber(draft.phone ?? '');
  const city = (draft.city ?? '').trim();
  const state = (draft.state ?? '').trim().toUpperCase();
  const location = city && state ? `${city}, ${state}` : '';
  const summary = draft.summary?.trim();

  const normalizedSkillsInput = (draft.skills ?? [])
    .map(skill => normalizeSkillLabel(skill))
    .filter(Boolean) as string[];

  const skills: string[] = [];
  const seenSkills = new Set<string>();
  for (const skill of normalizedSkillsInput) {
    const key = skill.toLowerCase();
    if (seenSkills.has(key)) continue;
    seenSkills.add(key);
    if (skills.length < MAX_SKILLS) {
      skills.push(skill);
    }
  }

  const experienceEntries = (draft.experience ?? [])
    .map(original => {
      const normalized: ExperienceEntry = {
        title: original.title?.trim() ?? '',
        company: original.company?.trim() ?? '',
      };

      const startDate = normalizeTimeline(original.startDate);
      const endDate = normalizeTimeline(original.endDate);
      const bullets = original.bullets
        ?.map(bullet => bullet.trim())
        .filter(Boolean)
        .slice(0, MAX_BULLETS);

      if (startDate) normalized.startDate = startDate;
      if (endDate) normalized.endDate = endDate;
      if (bullets?.length) normalized.bullets = bullets;

      return normalized;
    })
    .filter(entry => entry.title && entry.company);

  const educationEntries = (draft.education ?? [])
    .map(original => {
      const normalized: EducationEntry = {
        degree: original.degree?.trim() ?? '',
        school: original.school?.trim() ?? '',
      };
      const graduationYear = original.graduationYear?.trim();
      if (graduationYear) {
        normalized.graduationYear = graduationYear;
      }
      return normalized;
    })
    .filter(entry => entry.degree && entry.school);

  return {
    name,
    email,
    phone,
    city,
    state,
    location,
    summary: summary || '',
    skills,
    experience: experienceEntries,
    education: educationEntries,
  };
};
