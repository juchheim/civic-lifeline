'use client';

import { useEffect, useMemo, useState } from 'react';
import { downloadPdf, type TemplateName } from '@/lib/resume/download-pdf';
import type { ResumePayload } from '@/lib/resume/types';
import { TEMPLATES } from '@/resume/shared/templates';

const STORAGE_KEY = 'resume.draft';
const EXPERIENCE_LIMIT = 20;
const EDUCATION_LIMIT = 10;
const MAX_BULLETS = 8;

type ExperienceEntry = NonNullable<ResumePayload['experience']>[number];
type EducationEntry = NonNullable<ResumePayload['education']>[number];

const DEFAULT_PAYLOAD: ResumePayload = {
  name: '',
  email: '',
  summary: '',
  skills: [],
  experience: [],
  education: [],
};

export function ResumeBuilderSection() {
  const [payload, setPayload] = useState<ResumePayload>(DEFAULT_PAYLOAD);
  const [template, setTemplate] = useState<TemplateName>('classic');
  const [status, setStatus] = useState<string | null>(null);
  const [skillsInput, setSkillsInput] = useState<string>('');
  const [bulletsInputs, setBulletsInputs] = useState<Record<string, string>>({});

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as ResumePayload;
        setPayload({ ...DEFAULT_PAYLOAD, ...parsed });
        setSkillsInput((parsed.skills ?? []).join(', '));
        // Initialize bullets inputs from stored experience entries
        const bulletsState: Record<string, string> = {};
        (parsed.experience ?? []).forEach((exp, idx) => {
          if (exp.bullets) {
            bulletsState[`exp-${idx}`] = exp.bullets.join('\n');
          }
        });
        setBulletsInputs(bulletsState);
      }
    } catch {
      // ignore corrupted storage
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const timer = window.setTimeout(() => {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    }, 600);
    return () => window.clearTimeout(timer);
  }, [payload]);

  // Sync skills input when payload changes externally (e.g., reset), but only if it differs
  // Don't sync during active typing - only on external changes like reset or load
  useEffect(() => {
    const serialized = (payload.skills ?? []).join(', ');
    // Only update if the serialized version doesn't match and it's not just whitespace differences
    if (serialized !== skillsInput && serialized.replace(/\s*,\s*/g, ', ') !== skillsInput.replace(/\s*,\s*/g, ', ')) {
      setSkillsInput(serialized);
    }
  }, [payload.skills]); // eslint-disable-line react-hooks/exhaustive-deps

  const hasRequiredFields = useMemo(() => payload.name.trim() && payload.email.trim(), [payload]);
  const experience = payload.experience ?? [];
  const education = payload.education ?? [];

  const addExperience = () => {
    setPayload(prev => {
      const current = prev.experience ?? [];
      if (current.length >= EXPERIENCE_LIMIT) return prev;
      return {
        ...prev,
        experience: [...current, createExperienceEntry()],
      };
    });
    // Initialize bullets input for new entry
    const newIndex = experience.length;
    setBulletsInputs(prev => ({ ...prev, [`exp-${newIndex}`]: '' }));
  };

  const removeExperience = (index: number) => {
    setPayload(prev => {
      const current = [...(prev.experience ?? [])];
      current.splice(index, 1);
      return {
        ...prev,
        experience: current,
      };
    });
    // Clean up bullets input state for removed entry
    const key = `exp-${index}`;
    setBulletsInputs(prev => {
      const updated = { ...prev };
      delete updated[key];
      // Shift keys for entries after removed one
      const newState: Record<string, string> = {};
      Object.keys(prev).forEach(k => {
        if (k.startsWith('exp-')) {
          const idx = parseInt(k.split('-')[1], 10);
          if (idx < index) {
            newState[k] = prev[k];
          } else if (idx > index) {
            newState[`exp-${idx - 1}`] = prev[k];
          }
        } else {
          newState[k] = prev[k];
        }
      });
      return newState;
    });
  };

  const updateExperienceField = (index: number, field: keyof ExperienceEntry, value: string) =>
    setPayload(prev => {
      const current = [...(prev.experience ?? [])];
      const entry: ExperienceEntry = { ...createExperienceEntry(), ...(current[index] ?? {}) };

      if (field === 'bullets') {
        // Store raw input value to preserve newlines during typing
        const key = `exp-${index}`;
        setBulletsInputs(prev => ({ ...prev, [key]: value }));
        
        // Parse bullets from input (split on newlines, trim each line, filter empty)
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
        // Preserve spaces during typing; only validate empty fields
        // Skip 'years' field since it's been removed
        if (field === 'years') {
          delete entry.years;
        } else if (!value.trim() && field !== 'title' && field !== 'company') {
          delete entry[field];
        } else {
          // Store the value as-is to preserve spaces (title/company can have spaces)
          (entry as Record<keyof ExperienceEntry, unknown>)[field] = value;
        }
      }

      current[index] = entry;
      return {
        ...prev,
        experience: current,
      };
    });

  const addEducation = () =>
    setPayload(prev => {
      const current = prev.education ?? [];
      if (current.length >= EDUCATION_LIMIT) return prev;
      return {
        ...prev,
        education: [...current, createEducationEntry()],
      };
    });

  const removeEducation = (index: number) =>
    setPayload(prev => {
      const current = [...(prev.education ?? [])];
      current.splice(index, 1);
      return {
        ...prev,
        education: current,
      };
    });

  const updateEducationField = (index: number, field: keyof EducationEntry, value: string) =>
    setPayload(prev => {
      const current = [...(prev.education ?? [])];
      const entry: EducationEntry = { ...createEducationEntry(), ...(current[index] ?? {}) };

      // Preserve spaces during typing (degree and school can have spaces)
      if (!value.trim() && field === 'graduationYear') {
        delete entry[field];
      } else {
        // Store the value as-is to preserve spaces
        (entry as Record<keyof EducationEntry, unknown>)[field] = value;
      }

      current[index] = entry;
      return {
        ...prev,
        education: current,
      };
    });

  const buildSubmissionPayload = (draft: ResumePayload): ResumePayload => {
    const skills = (draft.skills ?? []).map(skill => skill.trim()).filter(Boolean);
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
      ...draft,
      skills,
      experience: experienceEntries,
      education: educationEntries,
    };
  };

  const handleGenerate = async () => {
    if (!hasRequiredFields) {
      setStatus('Please add your name and email first.');
      return;
    }
    setStatus('Generating PDF...');
    try {
      await downloadPdf(buildSubmissionPayload(payload), template);
      setStatus('PDF downloaded to your device.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate PDF.';
      setStatus(message);
    }
  };

  const handleReset = () => {
    setPayload(DEFAULT_PAYLOAD);
    setSkillsInput('');
    setStatus('Cleared the draft.');
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  };

  return (
    <section id="resume-builder" className="mt-10 flex flex-col gap-6 rounded border bg-white p-4 shadow-sm">
      <header>
        <h2 className="text-2xl font-semibold">Build Your Resume</h2>
        <p className="text-sm text-neutral-500">
          Fill in the essentials, pick a template, and generate a print-ready PDF. Your draft saves locally to this browser.
        </p>
      </header>

      <div className="flex flex-col gap-4">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Template</span>
          <select
            className="rounded border border-neutral-300 px-3 py-2 text-sm"
            value={template}
            onChange={event => setTemplate(event.target.value as TemplateName)}
          >
            {TEMPLATES.map(option => (
              <option key={option} value={option}>
                {option[0].toUpperCase() + option.slice(1)}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Name</span>
          <input
            className="rounded border border-neutral-300 px-3 py-2 text-sm"
            value={payload.name}
            onChange={event => setPayload(prev => ({ ...prev, name: event.target.value }))}
            placeholder="Jane Doe"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Email</span>
          <input
            className="rounded border border-neutral-300 px-3 py-2 text-sm"
            value={payload.email}
            onChange={event => setPayload(prev => ({ ...prev, email: event.target.value }))}
            placeholder="jane@example.com"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Summary</span>
          <textarea
            className="h-32 rounded border border-neutral-300 px-3 py-2 text-sm"
            value={payload.summary ?? ''}
            onChange={event => setPayload(prev => ({ ...prev, summary: event.target.value }))}
            placeholder="Highlight your skills, experience, and mission."
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Skills (comma separated)</span>
          <input
            type="text"
            className="rounded border border-neutral-300 px-3 py-2 text-sm"
            value={skillsInput}
            onChange={event => {
              const rawValue = event.target.value;
              // Always preserve the raw input value to allow commas and spaces
              setSkillsInput(rawValue);
              // Parse skills from input (split on comma, trim whitespace) for payload
              // But keep raw input for display
              const skills = rawValue
                .split(',')
                .map(skill => skill.trim())
                .filter(Boolean);
              setPayload(prev => ({
                ...prev,
                skills,
              }));
            }}
            onBlur={() => {
              // Normalize on blur: remove trailing commas, ensure clean format
              const cleaned = skillsInput
                .split(',')
                .map(skill => skill.trim())
                .filter(Boolean)
                .join(', ');
              if (cleaned !== skillsInput && cleaned) {
                setSkillsInput(cleaned);
                const skills = cleaned.split(',').map(s => s.trim()).filter(Boolean);
                setPayload(prev => ({
                  ...prev,
                  skills,
                }));
              }
            }}
            placeholder="React, Node.js, Machine Learning"
          />
        </label>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Experience</h3>
          <button
            type="button"
            className="rounded border border-neutral-300 px-3 py-1 text-sm font-medium disabled:opacity-50"
            onClick={addExperience}
            disabled={experience.length >= EXPERIENCE_LIMIT}
          >
            Add Experience
          </button>
        </div>

        {experience.length === 0 && (
          <p className="text-sm text-neutral-500">Add your most recent roles, including accomplishments and timeline.</p>
        )}

        {experience.map((entry, index) => (
          <div key={index} className="flex flex-col gap-3 rounded border border-neutral-200 p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Experience #{index + 1}</span>
              <button
                type="button"
                className="text-sm text-neutral-500 hover:text-neutral-800"
                onClick={() => removeExperience(index)}
              >
                Remove
              </button>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium uppercase tracking-wide text-neutral-500">Title</span>
                <input
                  type="text"
                  className="rounded border border-neutral-300 px-3 py-2 text-sm"
                  value={entry.title ?? ''}
                  onChange={event => updateExperienceField(index, 'title', event.target.value)}
                  placeholder="Community Outreach Coordinator"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium uppercase tracking-wide text-neutral-500">Company</span>
                <input
                  type="text"
                  className="rounded border border-neutral-300 px-3 py-2 text-sm"
                  value={entry.company ?? ''}
                  onChange={event => updateExperienceField(index, 'company', event.target.value)}
                  placeholder="City of Jackson"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium uppercase tracking-wide text-neutral-500">Start Date</span>
                <input
                  type="text"
                  className="rounded border border-neutral-300 px-3 py-2 text-sm"
                  value={entry.startDate ?? ''}
                  onChange={event => updateExperienceField(index, 'startDate', event.target.value)}
                  placeholder="2021-06"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium uppercase tracking-wide text-neutral-500">End Date</span>
                <input
                  type="text"
                  className="rounded border border-neutral-300 px-3 py-2 text-sm"
                  value={entry.endDate ?? ''}
                  onChange={event => updateExperienceField(index, 'endDate', event.target.value)}
                  placeholder="present"
                />
              </label>
              <label className="md:col-span-2 flex flex-col gap-1">
                <span className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                  Bullets (one per line, max {MAX_BULLETS})
                </span>
                <textarea
                  className="h-32 rounded border border-neutral-300 px-3 py-2 text-sm"
                  value={bulletsInputs[`exp-${index}`] ?? (entry.bullets ?? []).join('\n')}
                  onChange={event => updateExperienceField(index, 'bullets', event.target.value)}
                  placeholder={'Coordinate volunteer recruitment\nShip weekly jobs newsletter'}
                  onBlur={() => {
                    // Sync bullets input when user leaves field
                    const key = `exp-${index}`;
                    const currentValue = bulletsInputs[key];
                    if (currentValue !== undefined) {
                      const bullets = currentValue
                        .split('\n')
                        .map(bullet => bullet.trim())
                        .filter(Boolean)
                        .slice(0, MAX_BULLETS);
                      const normalized = bullets.join('\n');
                      if (normalized !== currentValue) {
                        setBulletsInputs(prev => ({ ...prev, [key]: normalized }));
                      }
                    }
                  }}
                />
                <span className="text-xs text-neutral-500">
                  Keep each bullet concise and action-oriented. Lines beyond the first {MAX_BULLETS} are ignored.
                </span>
              </label>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Education</h3>
          <button
            type="button"
            className="rounded border border-neutral-300 px-3 py-1 text-sm font-medium disabled:opacity-50"
            onClick={addEducation}
            disabled={education.length >= EDUCATION_LIMIT}
          >
            Add Education
          </button>
        </div>

        {education.length === 0 && (
          <p className="text-sm text-neutral-500">Share your most relevant schooling, certificates, or training.</p>
        )}

        {education.map((entry, index) => (
          <div key={index} className="flex flex-col gap-3 rounded border border-neutral-200 p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Education #{index + 1}</span>
              <button
                type="button"
                className="text-sm text-neutral-500 hover:text-neutral-800"
                onClick={() => removeEducation(index)}
              >
                Remove
              </button>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium uppercase tracking-wide text-neutral-500">Degree</span>
                <input
                  type="text"
                  className="rounded border border-neutral-300 px-3 py-2 text-sm"
                  value={entry.degree ?? ''}
                  onChange={event => updateEducationField(index, 'degree', event.target.value)}
                  placeholder="B.A. Social Work"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium uppercase tracking-wide text-neutral-500">School</span>
                <input
                  type="text"
                  className="rounded border border-neutral-300 px-3 py-2 text-sm"
                  value={entry.school ?? ''}
                  onChange={event => updateEducationField(index, 'school', event.target.value)}
                  placeholder="Jackson State University"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                  Graduation Year (optional)
                </span>
                <input
                  className="rounded border border-neutral-300 px-3 py-2 text-sm"
                  value={entry.graduationYear ?? ''}
                  onChange={event => updateEducationField(index, 'graduationYear', event.target.value)}
                  placeholder="2022"
                />
              </label>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-2 md:flex-row md:items-center">
        <button
          type="button"
          className="rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:bg-neutral-500"
          onClick={handleGenerate}
          disabled={!hasRequiredFields}
        >
          Generate PDF
        </button>
        <button
          type="button"
          className="rounded border border-neutral-300 px-4 py-2 text-sm font-medium"
          onClick={handleReset}
        >
          Reset Draft
        </button>
        {status && <p className="text-sm text-neutral-600 md:ml-4">{status}</p>}
      </div>
    </section>
  );
}

function createExperienceEntry(): ExperienceEntry {
  return {
    title: '',
    company: '',
  };
}

function createEducationEntry(): EducationEntry {
  return {
    degree: '',
    school: '',
  };
}

function normalizeTimeline(value?: string) {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed.toLowerCase() === 'present' ? 'present' : trimmed;
}
