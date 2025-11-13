import { useCallback, useState } from 'react';

import type { ResumePayload } from '@/lib/resume/types';
import { normalizeSkillLabel } from '@/lib/resume/utils/format';
import { buildTimelineValue } from '@/lib/resume/utils/timeline';

import {
  createDefaultPayload,
  EDUCATION_LIMIT,
  EXPERIENCE_LIMIT,
  MAX_BULLETS,
  MAX_SKILLS,
} from '../constants';
import type { EducationEntry, ExperienceEntry, TimelineDraft } from './types';
import { createEducationEntry, createExperienceEntry, createTimelineDraft } from './utils/factories';

export function useResumeDraft() {
  const [payload, setPayload] = useState<ResumePayload>(() => createDefaultPayload());
  const [skillDraft, setSkillDraft] = useState<string>('');
  const [bulletsInputs, setBulletsInputs] = useState<string[]>([]);
  const [timelineInputs, setTimelineInputs] = useState<TimelineDraft[]>([]);

  const addSkill = useCallback(
    (raw: string) => {
      const normalized = normalizeSkillLabel(raw);
      if (!normalized) return;
      setPayload(prev => {
        const existing = prev.skills ?? [];
        if (existing.some(skill => skill.toLowerCase() === normalized.toLowerCase()) || existing.length >= MAX_SKILLS) {
          return prev;
        }
        return {
          ...prev,
          skills: [...existing, normalized],
        };
      });
      setSkillDraft('');
    },
    [],
  );

  const removeSkill = useCallback((skill: string) => {
    setPayload(prev => {
      const existing = prev.skills ?? [];
      return {
        ...prev,
        skills: existing.filter(item => item !== skill),
      };
    });
  }, []);

  const handleSkillDraftCommit = useCallback(() => {
    if (!skillDraft.trim()) return;
    addSkill(skillDraft);
  }, [addSkill, skillDraft]);

  const experienceCount = (payload.experience ?? []).length;

  const addExperience = useCallback(() => {
    const currentLength = experienceCount;
    setPayload(prev => {
      const current = prev.experience ?? [];
      if (current.length >= EXPERIENCE_LIMIT) return prev;
      return {
        ...prev,
        experience: [...current, createExperienceEntry()],
      };
    });
    if (currentLength >= EXPERIENCE_LIMIT) return;
    setBulletsInputs(prev => {
      const next = [...prev];
      next[currentLength] = '';
      return next;
    });
    setTimelineInputs(prev => {
      const next = [...prev];
      next[currentLength] = createTimelineDraft();
      return next;
    });
  }, [experienceCount]);

  const removeExperience = useCallback((index: number) => {
    setPayload(prev => {
      const current = [...(prev.experience ?? [])];
      current.splice(index, 1);
      return {
        ...prev,
        experience: current,
      };
    });
    setBulletsInputs(prev => prev.filter((_, idx) => idx !== index));
    setTimelineInputs(prev => prev.filter((_, idx) => idx !== index));
  }, []);

  const moveExperience = useCallback((index: number, offset: number) => {
    setPayload(prev => {
      const current = [...(prev.experience ?? [])];
      const target = index + offset;
      if (target < 0 || target >= current.length) return prev;
      const [entry] = current.splice(index, 1);
      current.splice(target, 0, entry);
      return {
        ...prev,
        experience: current,
      };
    });
    setBulletsInputs(prev => {
      const next = [...prev];
      const [value] = next.splice(index, 1);
      next.splice(index + offset, 0, value ?? '');
      return next;
    });
    setTimelineInputs(prev => {
      const next = [...prev];
      const [draft] = next.splice(index, 1);
      next.splice(index + offset, 0, draft ?? createTimelineDraft());
      return next;
    });
  }, []);

  const updateExperienceField = useCallback(
    (index: number, field: keyof ExperienceEntry, value: string) => {
      setPayload(prev => {
        const current = [...(prev.experience ?? [])];
        const entry: ExperienceEntry = { ...createExperienceEntry(), ...(current[index] ?? {}) };

        if (field === 'bullets') {
          setBulletsInputs(prevBullets => {
            const next = [...prevBullets];
            next[index] = value;
            return next;
          });

          const bullets = value
            .split('\n')
            .map(bullet => bullet.trim())
            .filter(Boolean)
            .slice(0, MAX_BULLETS);
          if (bullets.length) {
            entry.bullets = bullets;
          } else {
            delete entry.bullets;
          }
        } else {
          if (field === 'years') {
            delete entry.years;
          } else if (!value.trim() && field !== 'title' && field !== 'company') {
            delete entry[field];
          } else {
            (entry as Record<keyof ExperienceEntry, unknown>)[field] = value;
          }
        }

        current[index] = entry;
        return {
          ...prev,
          experience: current,
        };
      });
    },
    [],
  );

  const addEducation = useCallback(() => {
    setPayload(prev => {
      const current = prev.education ?? [];
      if (current.length >= EDUCATION_LIMIT) return prev;
      return {
        ...prev,
        education: [...current, createEducationEntry()],
      };
    });
  }, []);

  const removeEducation = useCallback((index: number) => {
    setPayload(prev => {
      const current = [...(prev.education ?? [])];
      current.splice(index, 1);
      return {
        ...prev,
        education: current,
      };
    });
  }, []);

  const moveEducation = useCallback((index: number, offset: number) => {
    setPayload(prev => {
      const current = [...(prev.education ?? [])];
      const target = index + offset;
      if (target < 0 || target >= current.length) return prev;
      const [entry] = current.splice(index, 1);
      current.splice(target, 0, entry);
      return {
        ...prev,
        education: current,
      };
    });
  }, []);

  const updateEducationField = useCallback(
    (index: number, field: keyof EducationEntry, value: string) => {
      setPayload(prev => {
        const current = [...(prev.education ?? [])];
        const entry: EducationEntry = { ...createEducationEntry(), ...(current[index] ?? {}) };

        if (!value.trim()) {
          delete entry[field];
        } else {
          (entry as Record<keyof EducationEntry, unknown>)[field] = value;
        }

        current[index] = entry;
        return {
          ...prev,
          education: current,
        };
      });
    },
    [],
  );

  const updateTimelineInput = useCallback(
    (index: number, section: 'start' | 'end', part: 'month' | 'year' | 'present', value: string | boolean) => {
      const currentDraft = timelineInputs[index] ?? createTimelineDraft();
      const updatedDraft: TimelineDraft = { ...currentDraft };

      if (section === 'start') {
        if (part === 'month' && typeof value === 'string') updatedDraft.startMonth = value;
        if (part === 'year' && typeof value === 'string') updatedDraft.startYear = value;
      } else {
        if (part === 'present' && typeof value === 'boolean') {
          updatedDraft.endPresent = value;
          if (value) {
            updatedDraft.endMonth = '';
            updatedDraft.endYear = '';
          }
        }
        if (part === 'month' && typeof value === 'string') updatedDraft.endMonth = value;
        if (part === 'year' && typeof value === 'string') updatedDraft.endYear = value;
      }

      setTimelineInputs(prev => {
        const next = [...prev];
        next[index] = updatedDraft;
        return next;
      });

      setPayload(prev => {
        const current = [...(prev.experience ?? [])];
        const entry: ExperienceEntry = { ...createExperienceEntry(), ...(current[index] ?? {}) };

        if (section === 'start') {
          const nextValue = buildTimelineValue({ year: updatedDraft.startYear, month: updatedDraft.startMonth });
          if (nextValue) {
            entry.startDate = nextValue;
          } else {
            delete entry.startDate;
          }
        } else if (updatedDraft.endPresent) {
          entry.endDate = 'present';
        } else {
          const nextValue = buildTimelineValue({ year: updatedDraft.endYear, month: updatedDraft.endMonth });
          if (nextValue) {
            entry.endDate = nextValue;
          } else {
            delete entry.endDate;
          }
        }

        current[index] = entry;
        return {
          ...prev,
          experience: current,
        };
      });
    },
    [timelineInputs],
  );

  return {
    payload,
    setPayload,
    skillDraft,
    setSkillDraft,
    bulletsInputs,
    setBulletsInputs,
    timelineInputs,
    setTimelineInputs,
    addSkill,
    removeSkill,
    handleSkillDraftCommit,
    addExperience,
    removeExperience,
    moveExperience,
    updateExperienceField,
    addEducation,
    removeEducation,
    moveEducation,
    updateEducationField,
    updateTimelineInput,
  };
}
