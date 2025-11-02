'use client';

import { useCallback, useEffect, useMemo, useState, useId } from 'react';
import { rewriteSummary } from '@/lib/resume/rewrite-summary';
import type { ResumePayload } from '@/lib/resume/types';
import { TEMPLATES, type TemplateName } from '@/resume/shared/templates';
import { buildResumeFilename } from '@/resume/shared/filename';

const STORAGE_KEY = 'resume.draft';
const EXPERIENCE_LIMIT = 20;
const EDUCATION_LIMIT = 10;
const MAX_BULLETS = 8;
const SUMMARY_MIN_CHARS = 12;
const MAX_SKILLS = 20;

type ExperienceEntry = NonNullable<ResumePayload['experience']>[number];
type EducationEntry = NonNullable<ResumePayload['education']>[number];
type TimelineDraft = {
  startMonth: string;
  startYear: string;
  endMonth: string;
  endYear: string;
  endPresent: boolean;
};
type DiffSegment = {
  type: 'added' | 'removed' | 'unchanged';
  value: string;
};

const TEMPLATE_DETAILS: Record<TemplateName, { label: string; description: string }> = {
  classic: {
    label: 'Classic',
    description: 'Serif, column-free layout. Best for traditional employers and ATS scans.',
  },
  modern: {
    label: 'Modern',
    description: 'Clean sans-serif with bold headings and accent colour for section titles.',
  },
  minimal: {
    label: 'Minimal',
    description: 'Monospaced typography with generous spacing for tech-forward teams.',
  },
};

const MONTH_OPTIONS = [
  { value: '01', label: 'Jan' },
  { value: '02', label: 'Feb' },
  { value: '03', label: 'Mar' },
  { value: '04', label: 'Apr' },
  { value: '05', label: 'May' },
  { value: '06', label: 'Jun' },
  { value: '07', label: 'Jul' },
  { value: '08', label: 'Aug' },
  { value: '09', label: 'Sep' },
  { value: '10', label: 'Oct' },
  { value: '11', label: 'Nov' },
  { value: '12', label: 'Dec' },
] as const;

const MONTH_NAME_LOOKUP: Record<string, string> = {
  january: '01',
  jan: '01',
  february: '02',
  feb: '02',
  march: '03',
  mar: '03',
  april: '04',
  apr: '04',
  may: '05',
  june: '06',
  jun: '06',
  july: '07',
  jul: '07',
  august: '08',
  aug: '08',
  september: '09',
  sep: '09',
  october: '10',
  oct: '10',
  november: '11',
  nov: '11',
  december: '12',
  dec: '12',
};

const YEAR_RANGE = 60;
const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: YEAR_RANGE }, (_, index) => String(CURRENT_YEAR + 1 - index));

const SKILL_SUGGESTIONS = [
  'Customer Service',
  'Cash Handling',
  'POS/Register',
  'Returns & Exchanges',
  'Food Safety',
  'Cleaning & Sanitizing',
  'Stocking',
  'Teamwork',
  'Punctuality',
  'Basic Computer Skills',
] as const;

const DEFAULT_PAYLOAD: ResumePayload = {
  name: '',
  email: '',
  phone: '',
  location: '',
  summary: '',
  skills: [],
  experience: [],
  education: [],
};

export function ResumeBuilderSection() {
  const [payload, setPayload] = useState<ResumePayload>(DEFAULT_PAYLOAD);
  const [template, setTemplate] = useState<TemplateName>('classic');
  const [status, setStatus] = useState<string | null>(null);
  const [skillDraft, setSkillDraft] = useState<string>('');
  const [bulletsInputs, setBulletsInputs] = useState<string[]>([]);
  const [timelineInputs, setTimelineInputs] = useState<TimelineDraft[]>([]);
  const [isSummaryRewriting, setIsSummaryRewriting] = useState(false);
  const [summaryStatus, setSummaryStatus] = useState<{ kind: 'success' | 'error'; message: string } | null>(null);
  const [summaryComparison, setSummaryComparison] = useState<{ original: string; suggestion: string } | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const contactHelpId = useId();
  const summaryHelpId = useId();
  const skillsHelpId = useId();
  const experienceHelpId = useId();
  const buttonsHelpId = useId();

  useEffect(() => {
    if (!previewUrl) return;
    if (typeof window === 'undefined') return;
    try {
      window.open(previewUrl, '_blank', 'noopener,noreferrer');
    } catch {
      // no-op: status messaging will guide user
    }
  }, [previewUrl]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as ResumePayload;
        const normalized: ResumePayload = {
          ...DEFAULT_PAYLOAD,
          ...parsed,
        };
        if (parsed.phone) {
          normalized.phone = formatPhoneNumber(parsed.phone);
        }
        setPayload(normalized);
        setSkillDraft('');
        // Initialize bullets inputs from stored experience entries
        const bulletsState: string[] = [];
        (parsed.experience ?? []).forEach((exp, idx) => {
          bulletsState[idx] = exp.bullets ? exp.bullets.join('\n') : '';
        });
        setBulletsInputs(bulletsState);
        const timelineState: TimelineDraft[] = [];
        (parsed.experience ?? []).forEach((exp, idx) => {
          const startParts = splitTimeline(exp.startDate);
          const endParts = splitTimeline(exp.endDate);
          timelineState[idx] = {
            startMonth: startParts.month,
            startYear: startParts.year,
            endMonth: endParts.month,
            endYear: endParts.year,
            endPresent: endParts.isPresent,
          };
        });
        setTimelineInputs(timelineState);
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

  const hasRequiredFields = useMemo(
    () => payload.name.trim() && payload.email.trim() && payload.phone?.trim() && payload.location?.trim(),
    [payload],
  );
  const skillValues = payload.skills ?? [];
  const skillCount = skillValues.length;
  const experience = payload.experience ?? [];
  const education = payload.education ?? [];
  const canRewriteSummary = useMemo(
    () => (payload.summary ?? '').trim().length >= SUMMARY_MIN_CHARS,
    [payload.summary],
  );
  const downloadFilename = useMemo(() => buildResumeFilename(payload.name, template), [payload.name, template]);

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
    [setPayload],
  );

  const removeSkill = useCallback(
    (skill: string) => {
      setPayload(prev => {
        const existing = prev.skills ?? [];
        return {
          ...prev,
          skills: existing.filter(item => item !== skill),
        };
      });
    },
    [setPayload],
  );

  const handleSkillDraftCommit = useCallback(() => {
    if (!skillDraft.trim()) return;
    addSkill(skillDraft);
  }, [addSkill, skillDraft]);

  const handleRewriteSummary = async () => {
    const draft = (payload.summary ?? '').trim();
    if (!draft) {
      setSummaryStatus({ kind: 'error', message: 'Add a few notes so the assistant has something to rewrite.' });
      return;
    }
    if (draft.length < SUMMARY_MIN_CHARS) {
      setSummaryStatus({
        kind: 'error',
        message: `Add a bit more detail (at least ${SUMMARY_MIN_CHARS} characters) so we have something to polish.`,
      });
      return;
    }

    setSummaryComparison(null);
    setSummaryStatus({ kind: 'success', message: 'Polishing your summary...' });
    setIsSummaryRewriting(true);

    const skills = (payload.skills ?? []).map(skill => skill.trim()).filter(Boolean).slice(0, 12);
    const experienceForAi = (payload.experience ?? [])
      .map(entry => {
        const title = entry.title?.trim();
        const company = entry.company?.trim();
        const bullets = (entry.bullets ?? []).map(bullet => bullet.trim()).filter(Boolean).slice(0, 2);
        if (!title && !company && bullets.length === 0) return null;
        return {
          ...(title ? { title } : {}),
          ...(company ? { company } : {}),
          ...(bullets.length ? { bullets } : {}),
        };
      })
      .filter((entry): entry is { title?: string; company?: string; bullets?: string[] } => entry !== null)
      .slice(0, 3);

    try {
      const rewritten = await rewriteSummary({
        summary: draft,
        name: payload.name.trim() || undefined,
        skills,
        experience: experienceForAi.length ? experienceForAi : undefined,
      });
      const cleanedRewrite = rewritten.trim();
      if (!cleanedRewrite || cleanedRewrite === draft) {
        setSummaryComparison(null);
        setSummaryStatus({ kind: 'success', message: 'The assistant kept your summary as-is.' });
        setPayload(prev => ({ ...prev, summary: draft }));
      } else {
        setSummaryComparison({ original: draft, suggestion: cleanedRewrite });
        setSummaryStatus({ kind: 'success', message: 'Review the AI suggestion below.' });
        setPayload(prev => ({ ...prev, summary: draft }));
      }
    } catch (error) {
      setSummaryStatus({
        kind: 'error',
        message: error instanceof Error ? error.message : 'Something went wrong while rewriting.',
      });
    } finally {
      setIsSummaryRewriting(false);
    }
  };

  const handleAcceptSummarySuggestion = (suggestion: string) => {
    setPayload(prev => ({ ...prev, summary: suggestion }));
    setSummaryComparison(null);
    setSummaryStatus({ kind: 'success', message: 'Summary updated with the AI suggestion.' });
  };

  const handleKeepOriginalSummary = (original: string) => {
    setPayload(prev => ({ ...prev, summary: original }));
    setSummaryComparison(null);
    setSummaryStatus({ kind: 'success', message: 'Kept your original summary.' });
  };

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
    setBulletsInputs(prev => {
      const next = [...prev];
      next[newIndex] = '';
      return next;
    });
    setTimelineInputs(prev => {
      const next = [...prev];
      next[newIndex] = createTimelineDraft();
      return next;
    });
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
    setBulletsInputs(prev => prev.filter((_, idx) => idx !== index));
    setTimelineInputs(prev => prev.filter((_, idx) => idx !== index));
  };

  const moveExperience = (index: number, offset: number) => {
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
  };

  const updateExperienceField = (index: number, field: keyof ExperienceEntry, value: string) =>
    setPayload(prev => {
      const current = [...(prev.experience ?? [])];
      const entry: ExperienceEntry = { ...createExperienceEntry(), ...(current[index] ?? {}) };

      if (field === 'bullets') {
        // Store raw input value to preserve newlines during typing
        setBulletsInputs(prev => {
          const next = [...prev];
          next[index] = value;
          return next;
        });

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

  const moveEducation = (index: number, offset: number) =>
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

  const updateTimelineInput = useCallback(
    (index: number, section: 'start' | 'end', part: 'month' | 'year' | 'present', value: string | boolean) => {
      const previousDraft = timelineInputs[index] ?? createTimelineDraft();
      const updatedDraft: TimelineDraft = { ...previousDraft };

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
        } else {
          if (updatedDraft.endPresent) {
            entry.endDate = 'present';
          } else {
            const nextValue = buildTimelineValue({ year: updatedDraft.endYear, month: updatedDraft.endMonth });
            if (nextValue) {
              entry.endDate = nextValue;
            } else {
              delete entry.endDate;
            }
          }
        }

        current[index] = entry;
        return {
          ...prev,
          experience: current,
        };
      });
    },
    [setPayload, timelineInputs],
  );

  const buildSubmissionPayload = (draft: ResumePayload): ResumePayload => {
    const name = draft.name.trim();
    const email = draft.email.trim();
    const phone = formatPhoneNumber(draft.phone ?? '');
    const location = draft.location?.trim() ?? '';
    const summary = draft.summary?.trim();

    const normalizedSkillsInput = (draft.skills ?? []).map(skill => normalizeSkillLabel(skill)).filter(Boolean);
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
      ...draft,
      name,
      email,
      phone,
      location,
      ...(summary ? { summary } : { summary: undefined }),
      skills,
      experience: experienceEntries,
      education: educationEntries,
    };
  };

  const handleGenerate = async () => {
    if (!hasRequiredFields) {
      setStatus('Please add your contact information (name, email, phone, location) first.');
      return;
    }

    let draftForSubmit = payload;
    const draftSkill = normalizeSkillLabel(skillDraft);
    if (draftSkill) {
      const existing = payload.skills ?? [];
      if (!existing.some(skill => skill.toLowerCase() === draftSkill.toLowerCase()) && existing.length < MAX_SKILLS) {
        const updated = {
          ...payload,
          skills: [...existing, draftSkill],
        };
        setPayload(updated);
        draftForSubmit = updated;
      }
      setSkillDraft('');
    }

    const formattedPhone = formatPhoneNumber(draftForSubmit.phone ?? '');
    if (formattedPhone !== (draftForSubmit.phone ?? '')) {
      const updated = {
        ...draftForSubmit,
        phone: formattedPhone,
      };
      setPayload(updated);
      draftForSubmit = updated;
    }

    const submissionPayload = buildSubmissionPayload(draftForSubmit);
    setStatus('Generating PDF preview...');
    setIsPreviewLoading(true);
    setPreviewUrl(null);

    try {
      const response = await fetch(`/api/pdf?template=${template}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submissionPayload),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        const message =
          typeof data.details === 'string'
            ? data.details
            : typeof data.error === 'string'
              ? data.error
              : `Failed to generate PDF (${response.status})`;
        throw new Error(message);
      }

      const data = (await response.json()) as { previewUrl: string };
      const absoluteUrl =
        typeof window !== 'undefined'
          ? new URL(data.previewUrl, window.location.origin).toString()
          : data.previewUrl;
      setPreviewUrl(absoluteUrl);
      setStatus('Preview opened in a new tab. Use the download button if you need a copy.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate PDF.';
      setStatus(message);
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const handleReset = () => {
    setPayload(DEFAULT_PAYLOAD);
    setSkillDraft('');
    setBulletsInputs([]);
    setTimelineInputs([]);
    setStatus('Cleared the draft.');
    setSummaryStatus(null);
    setIsSummaryRewriting(false);
    setSummaryComparison(null);
    setPreviewUrl(null);
    setIsPreviewLoading(false);
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

      <div className="flex flex-col gap-8">
        <div>
          <h3 className="text-base font-semibold">Choose a template</h3>
          <p className="mt-1 text-sm text-neutral-500">
            Each template keeps your details the same. Pick the style that fits your audience.
          </p>
          <div
            role="radiogroup"
            aria-label="Resume template"
            className="mt-3 grid gap-3 md:grid-cols-3"
          >
            {TEMPLATES.map(option => {
              const detail = TEMPLATE_DETAILS[option];
              const isSelected = template === option;
              return (
                <button
                  key={option}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  onClick={() => setTemplate(option)}
                  className={`rounded-lg border px-4 py-3 text-left transition-colors focus:outline-none focus:ring-2 focus:ring-neutral-500/40 ${
                    isSelected
                      ? 'border-neutral-900 bg-neutral-900/5 shadow-sm'
                      : 'border-neutral-200 hover:border-neutral-400'
                  }`}
                >
                  <div className="flex flex-col gap-3">
                    <div>
                      <span className="text-sm font-semibold text-neutral-900">{detail.label}</span>
                      <p className="mt-1 text-sm text-neutral-600">{detail.description}</p>
                    </div>
                    <TemplatePreview template={option} />
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <h3 className="text-base font-semibold">Contact</h3>
          <p id={contactHelpId} className="mt-1 text-sm text-neutral-500">
            We only use this info to build the PDF. It never leaves your browser.
          </p>
          <div className="mt-3 grid gap-4 md:grid-cols-2">
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium">Name</span>
              <input
                className="rounded border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none focus:ring-2 focus:ring-neutral-500/20"
                value={payload.name}
                onChange={event => setPayload(prev => ({ ...prev, name: event.target.value }))}
                placeholder="James Johnson"
                autoComplete="name"
                aria-describedby={contactHelpId}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium">Email</span>
              <input
                className="rounded border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none focus:ring-2 focus:ring-neutral-500/20"
                value={payload.email}
                onChange={event => setPayload(prev => ({ ...prev, email: event.target.value }))}
                placeholder="james.johnson@example.com"
                autoComplete="email"
                inputMode="email"
                aria-describedby={contactHelpId}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium">Phone</span>
              <input
                className="rounded border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none focus:ring-2 focus:ring-neutral-500/20"
                value={payload.phone ?? ''}
                onChange={event => setPayload(prev => ({ ...prev, phone: event.target.value }))}
                onBlur={() =>
                  setPayload(prev => ({
                    ...prev,
                    phone: formatPhoneNumber(prev.phone ?? ''),
                  }))
                }
                placeholder="(555) 123-4567"
                autoComplete="tel"
                inputMode="tel"
                aria-describedby={contactHelpId}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium">Location</span>
              <input
                className="rounded border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none focus:ring-2 focus:ring-neutral-500/20"
                value={payload.location ?? ''}
                onChange={event => setPayload(prev => ({ ...prev, location: event.target.value }))}
                placeholder="Greenwood, MS"
                autoComplete="address-level2"
                aria-describedby={contactHelpId}
              />
              <span className="text-xs text-neutral-500">Include your city and state so employers know you are nearby.</span>
            </label>
          </div>
        </div>

        <div>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold">Summary</h3>
              <p id={summaryHelpId} className="mt-1 text-sm text-neutral-500">
                Write 2-3 sentences about your experience, strengths, and the role you want.
              </p>
            </div>
            <button
              type="button"
              className="text-xs font-semibold uppercase tracking-wide text-neutral-600 underline-offset-4 hover:underline disabled:cursor-not-allowed disabled:text-neutral-400"
              onClick={handleRewriteSummary}
              disabled={isSummaryRewriting || !canRewriteSummary}
            >
              {isSummaryRewriting ? 'Rewriting...' : 'Rewrite with AI'}
            </button>
          </div>
          <textarea
            className="mt-3 h-36 w-full rounded border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none focus:ring-2 focus:ring-neutral-500/20"
            value={payload.summary ?? ''}
            onChange={event => {
              setSummaryStatus(null);
              setSummaryComparison(null);
              setPayload(prev => ({ ...prev, summary: event.target.value }));
            }}
            placeholder="Reliable customer-service worker with 3+ years handling cash, helping shoppers, and keeping the checkout running smoothly. Looking for a full-time cashier or customer service associate role with steady hours."
            aria-busy={isSummaryRewriting}
            aria-describedby={summaryHelpId}
            maxLength={800}
          />
          {summaryStatus && (
            <span
              className={`mt-2 block text-xs ${summaryStatus.kind === 'error' ? 'text-red-600' : 'text-neutral-600'}`}
              role="status"
              aria-live="polite"
            >
              {summaryStatus.message}
            </span>
          )}
          <p className="mt-2 text-xs text-neutral-500">Tip: Mention your years of experience, key strengths, and the job you are targeting.</p>
          {summaryComparison && (
            <SummaryReview
              original={summaryComparison.original}
              suggestion={summaryComparison.suggestion}
              onKeep={() => handleKeepOriginalSummary(summaryComparison.original)}
              onAccept={() => handleAcceptSummarySuggestion(summaryComparison.suggestion)}
            />
          )}
        </div>

        <div>
          <h3 className="text-base font-semibold">Skills</h3>
          <p id={skillsHelpId} className="mt-1 text-sm text-neutral-500">
            Add short phrases such as Cash Handling or POS/Register. Press Enter after each skill.
          </p>
          <div
            className={`mt-3 flex flex-wrap items-center gap-2 rounded border px-2 py-2 ${
              skillCount ? 'border-neutral-300 bg-white' : 'border-dashed border-neutral-300 bg-neutral-50'
            }`}
          >
            {skillValues.map(skill => (
              <span
                key={skill}
                className="group inline-flex items-center gap-1 rounded-full bg-neutral-200 px-3 py-1 text-sm text-neutral-800"
              >
                {skill}
                <button
                  type="button"
                  className="rounded-full bg-neutral-300 px-1 text-xs font-semibold text-neutral-700 transition hover:bg-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-500/40"
                  onClick={() => removeSkill(skill)}
                  aria-label={`Remove skill ${skill}`}
                >
                  <span aria-hidden="true">&times;</span>
                </button>
              </span>
            ))}
            <input
              type="text"
              className="flex-1 min-w-[140px] border-none bg-transparent px-2 py-1 text-sm focus:outline-none focus:ring-0 disabled:cursor-not-allowed"
              value={skillDraft}
              onChange={event => {
                const value = event.target.value;
                if (value.includes(',')) {
                  const parts = value.split(',');
                  parts.slice(0, -1).forEach(part => addSkill(part));
                  setSkillDraft(parts[parts.length - 1] ?? '');
                } else {
                  setSkillDraft(value);
                }
              }}
              onKeyDown={event => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  handleSkillDraftCommit();
                } else if (event.key === 'Tab' && skillDraft.trim()) {
                  handleSkillDraftCommit();
                } else if (event.key === 'Backspace' && !skillDraft.trim() && skillCount) {
                  event.preventDefault();
                  const lastSkill = skillValues[skillValues.length - 1];
                  if (lastSkill) removeSkill(lastSkill);
                }
              }}
              onBlur={() => handleSkillDraftCommit()}
              placeholder={skillCount ? 'Add another skill' : 'Add a skill'}
              aria-describedby={skillsHelpId}
              disabled={skillCount >= MAX_SKILLS}
            />
          </div>
          <p className="mt-1 text-xs text-neutral-500">
            Up to {MAX_SKILLS} skills. Choose the ones that match job postings you are applying to.
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {SKILL_SUGGESTIONS.map(suggestion => {
              const hasSkill = skillValues.some(skill => skill.toLowerCase() === suggestion.toLowerCase());
              return (
                <button
                  key={suggestion}
                  type="button"
                  className="rounded-full border border-neutral-300 px-3 py-1 text-xs font-medium text-neutral-700 transition hover:border-neutral-500 hover:text-neutral-900 disabled:cursor-not-allowed disabled:border-neutral-200 disabled:text-neutral-400"
                  onClick={() => addSkill(suggestion)}
                  disabled={hasSkill || skillCount >= MAX_SKILLS}
                >
                  {suggestion}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold">Experience</h3>
              <span className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                {experience.length}/{EXPERIENCE_LIMIT}
              </span>
            </div>
            <p id={experienceHelpId} className="text-sm text-neutral-500">
              Add your roles with the most recent first. Use numbers or outcomes to show impact.
            </p>
          </div>
          <button
            type="button"
            className="self-start rounded border border-neutral-300 px-3 py-1 text-sm font-medium transition hover:border-neutral-500 hover:text-neutral-900 disabled:cursor-not-allowed disabled:border-neutral-200 disabled:text-neutral-400 md:self-auto"
            onClick={addExperience}
            disabled={experience.length >= EXPERIENCE_LIMIT}
            aria-describedby={experienceHelpId}
          >
            Add Experience
          </button>
        </div>

        {experience.length === 0 && (
          <p className="rounded border border-dashed border-neutral-300 bg-neutral-50 p-3 text-sm text-neutral-500">
            Start with your latest job. Think about money handled, customers helped, speed, safety, or any way you made work smoother.
          </p>
        )}

        {experience.map((entry, index) => {
          const timelineDraft = timelineInputs[index] ?? createTimelineDraft();
          return (
            <div key={`experience-${index}`} className="flex flex-col gap-3 rounded border border-neutral-200 p-3 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-medium">Experience #{index + 1}</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="flex h-8 w-8 items-center justify-center rounded border border-neutral-300 text-sm text-neutral-600 transition hover:border-neutral-500 hover:text-neutral-900 disabled:cursor-not-allowed disabled:border-neutral-200 disabled:text-neutral-300"
                    onClick={() => moveExperience(index, -1)}
                    disabled={index === 0}
                    aria-label="Move experience up"
                  >
                    <span aria-hidden="true">&uarr;</span>
                  </button>
                  <button
                    type="button"
                    className="flex h-8 w-8 items-center justify-center rounded border border-neutral-300 text-sm text-neutral-600 transition hover:border-neutral-500 hover:text-neutral-900 disabled:cursor-not-allowed disabled:border-neutral-200 disabled:text-neutral-300"
                    onClick={() => moveExperience(index, 1)}
                    disabled={index === experience.length - 1}
                    aria-label="Move experience down"
                  >
                    <span aria-hidden="true">&darr;</span>
                  </button>
                  <button
                    type="button"
                    className="rounded border border-transparent px-3 py-1 text-sm text-neutral-500 transition hover:border-neutral-300 hover:text-neutral-800"
                    onClick={() => removeExperience(index)}
                  >
                    Remove
                  </button>
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <label className="flex flex-col gap-1">
                  <span className="text-xs font-medium uppercase tracking-wide text-neutral-500">Title</span>
                  <input
                    type="text"
                    className="rounded border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none focus:ring-2 focus:ring-neutral-500/20"
                    value={entry.title ?? ''}
                    onChange={event => updateExperienceField(index, 'title', event.target.value)}
                    placeholder="Cashier"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-xs font-medium uppercase tracking-wide text-neutral-500">Company</span>
                  <input
                    type="text"
                    className="rounded border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none focus:ring-2 focus:ring-neutral-500/20"
                    value={entry.company ?? ''}
                    onChange={event => updateExperienceField(index, 'company', event.target.value)}
                    placeholder="Walmart, Greenwood, MS"
                  />
                </label>
                <fieldset className="flex flex-col gap-1">
                  <span className="text-xs font-medium uppercase tracking-wide text-neutral-500">Start Date</span>
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={timelineDraft.startMonth}
                      onChange={event => updateTimelineInput(index, 'start', 'month', event.target.value)}
                      className="rounded border border-neutral-300 px-2 py-2 text-sm focus:border-neutral-500 focus:outline-none focus:ring-2 focus:ring-neutral-500/20"
                    >
                      <option value="">Month</option>
                      {MONTH_OPTIONS.map(option => (
                        <option key={`start-month-${option.value}`} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <select
                      value={timelineDraft.startYear}
                      onChange={event => updateTimelineInput(index, 'start', 'year', event.target.value)}
                      className="rounded border border-neutral-300 px-2 py-2 text-sm focus:border-neutral-500 focus:outline-none focus:ring-2 focus:ring-neutral-500/20"
                    >
                      <option value="">Year</option>
                      {YEAR_OPTIONS.map(year => (
                        <option key={`start-year-${year}`} value={year}>
                          {year}
                        </option>
                      ))}
                    </select>
                  </div>
                </fieldset>
                <fieldset className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium uppercase tracking-wide text-neutral-500">End Date</span>
                    <label className="flex items-center gap-1 text-[11px] font-medium text-neutral-600">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border border-neutral-300 text-neutral-900 focus:border-neutral-500 focus:outline-none focus:ring-2 focus:ring-neutral-500/30"
                        checked={timelineDraft.endPresent}
                        onChange={event => updateTimelineInput(index, 'end', 'present', event.target.checked)}
                      />
                      Present
                    </label>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={timelineDraft.endMonth}
                      onChange={event => updateTimelineInput(index, 'end', 'month', event.target.value)}
                      disabled={timelineDraft.endPresent}
                      className={`rounded border px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-500/20 ${
                        timelineDraft.endPresent
                          ? 'border-neutral-200 bg-neutral-100 text-neutral-400'
                          : 'border-neutral-300 focus:border-neutral-500'
                      }`}
                    >
                      <option value="">Month</option>
                      {MONTH_OPTIONS.map(option => (
                        <option key={`end-month-${option.value}`} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <select
                      value={timelineDraft.endYear}
                      onChange={event => updateTimelineInput(index, 'end', 'year', event.target.value)}
                      disabled={timelineDraft.endPresent}
                      className={`rounded border px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-500/20 ${
                        timelineDraft.endPresent
                          ? 'border-neutral-200 bg-neutral-100 text-neutral-400'
                          : 'border-neutral-300 focus:border-neutral-500'
                      }`}
                    >
                      <option value="">Year</option>
                      {YEAR_OPTIONS.map(year => (
                        <option key={`end-year-${year}`} value={year}>
                          {year}
                        </option>
                      ))}
                    </select>
                  </div>
                </fieldset>
                <label className="md:col-span-2 flex flex-col gap-1">
                  <span className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                    Bullets (one per line, max {MAX_BULLETS})
                  </span>
                  <textarea
                    className="h-32 rounded border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none focus:ring-2 focus:ring-neutral-500/20"
                    value={bulletsInputs[index] ?? (entry.bullets ?? []).join('\n')}
                    onChange={event => updateExperienceField(index, 'bullets', event.target.value)}
                    placeholder={'Balanced the cash drawer with 0-1 errors per shift\nHelped 80+ shoppers daily by solving checkout issues quickly\nTrained 2 new cashiers on POS steps and safety rules'}
                    onBlur={() => {
                      const currentValue = bulletsInputs[index];
                      if (currentValue !== undefined) {
                        const bullets = currentValue
                          .split('\n')
                          .map(bullet => bullet.trim())
                          .filter(Boolean)
                          .slice(0, MAX_BULLETS);
                        const normalized = bullets.join('\n');
                        if (normalized !== currentValue) {
                          setBulletsInputs(prev => {
                            const next = [...prev];
                            next[index] = normalized;
                            return next;
                          });
                        }
                      }
                    }}
                  />
                  <span className="text-xs text-neutral-500">
                    Lead with an action verb and the result (speed, accuracy, customers, savings). Only the first {MAX_BULLETS} bullets will appear in the PDF.
                  </span>
                </label>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold">Education</h3>
              <span className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                {education.length}/{EDUCATION_LIMIT}
              </span>
            </div>
            <p className="text-sm text-neutral-500">
              Include diplomas, GED, certificates, or training programs that support your next role.
            </p>
          </div>
          <button
            type="button"
            className="self-start rounded border border-neutral-300 px-3 py-1 text-sm font-medium transition hover:border-neutral-500 hover:text-neutral-900 disabled:cursor-not-allowed disabled:border-neutral-200 disabled:text-neutral-400 md:self-auto"
            onClick={addEducation}
            disabled={education.length >= EDUCATION_LIMIT}
          >
            Add Education
          </button>
        </div>

        {education.length === 0 && (
          <p className="rounded border border-dashed border-neutral-300 bg-neutral-50 p-3 text-sm text-neutral-500">
            Share your highest level of schooling or any certifications like ServSafe, forklift training, or customer service certificates.
          </p>
        )}

        {education.map((entry, index) => (
          <div key={`education-${index}`} className="flex flex-col gap-3 rounded border border-neutral-200 p-3 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-medium">Education #{index + 1}</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="flex h-8 w-8 items-center justify-center rounded border border-neutral-300 text-sm text-neutral-600 transition hover:border-neutral-500 hover:text-neutral-900 disabled:cursor-not-allowed disabled:border-neutral-200 disabled:text-neutral-300"
                  onClick={() => moveEducation(index, -1)}
                  disabled={index === 0}
                  aria-label="Move education up"
                >
                  <span aria-hidden="true">&uarr;</span>
                </button>
                <button
                  type="button"
                  className="flex h-8 w-8 items-center justify-center rounded border border-neutral-300 text-sm text-neutral-600 transition hover:border-neutral-500 hover:text-neutral-900 disabled:cursor-not-allowed disabled:border-neutral-200 disabled:text-neutral-300"
                  onClick={() => moveEducation(index, 1)}
                  disabled={index === education.length - 1}
                  aria-label="Move education down"
                >
                  <span aria-hidden="true">&darr;</span>
                </button>
                <button
                  type="button"
                  className="rounded border border-transparent px-3 py-1 text-sm text-neutral-500 transition hover:border-neutral-300 hover:text-neutral-800"
                  onClick={() => removeEducation(index)}
                >
                  Remove
                </button>
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium uppercase tracking-wide text-neutral-500">Degree or Program</span>
                <input
                  type="text"
                  className="rounded border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none focus:ring-2 focus:ring-neutral-500/20"
                  value={entry.degree ?? ''}
                  onChange={event => updateEducationField(index, 'degree', event.target.value)}
                  placeholder="High School Diploma"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium uppercase tracking-wide text-neutral-500">School</span>
                <input
                  type="text"
                  className="rounded border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none focus:ring-2 focus:ring-neutral-500/20"
                  value={entry.school ?? ''}
                  onChange={event => updateEducationField(index, 'school', event.target.value)}
                  placeholder="Greenwood High School"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                  Graduation Year (optional)
                </span>
                <input
                  className="rounded border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none focus:ring-2 focus:ring-neutral-500/20"
                  value={entry.graduationYear ?? ''}
                  onChange={event => updateEducationField(index, 'graduationYear', event.target.value)}
                  placeholder="2020"
                />
              </label>
            </div>
          </div>
        ))}
      </div>

      <div className="sticky bottom-0 z-10 -mx-4 mt-2 flex flex-col gap-3 border-t border-neutral-200 bg-white/95 px-4 py-4 backdrop-blur md:static md:-mx-0 md:flex-row md:items-center md:border-none md:bg-transparent md:px-0 md:py-0">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-3">
          <button
            type="button"
            className="w-full rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:bg-neutral-500 md:w-auto"
            onClick={handleGenerate}
            disabled={!hasRequiredFields || isPreviewLoading}
            aria-describedby={buttonsHelpId}
          >
            {isPreviewLoading ? 'Generating…' : 'Preview PDF'}
          </button>
          {previewUrl && (
            <a
              href={previewUrl}
              download={downloadFilename}
              className="inline-flex w-full items-center justify-center rounded border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 transition hover:border-neutral-500 hover:text-neutral-900 md:w-auto"
            >
              Download PDF
            </a>
          )}
          <button
            type="button"
            className="w-full rounded border border-neutral-300 px-4 py-2 text-sm font-medium transition hover:border-neutral-500 hover:text-neutral-900 md:w-auto"
            onClick={handleReset}
          >
            Reset Draft
          </button>
        </div>
        <div className="flex flex-col gap-1 md:ml-4 md:flex-1 md:flex-row md:items-center md:justify-between">
          <p id={buttonsHelpId} className="text-xs text-neutral-500 md:text-sm">
            Preview opens in a new tab. Download saves as <span className="font-mono">{downloadFilename}</span>.
          </p>
          {status && (
            <p className="text-sm text-neutral-600" role="status" aria-live="polite">
              {status}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

function TemplatePreview({ template }: { template: TemplateName }) {
  const accentClass = template === 'modern' ? 'bg-blue-500' : template === 'minimal' ? 'bg-neutral-900' : 'bg-neutral-700';
  const accentLightClass =
    template === 'modern' ? 'bg-blue-200' : template === 'minimal' ? 'bg-neutral-300' : 'bg-neutral-300';
  const bulletClass = template === 'minimal' ? 'bg-neutral-800' : template === 'modern' ? 'bg-blue-300' : 'bg-neutral-400';

  return (
    <div className="flex flex-col gap-2 rounded border border-neutral-200 bg-white p-3">
      <div className={`h-2 w-2/3 rounded ${accentClass}`} />
      <div className="flex flex-col gap-1">
        <div className={`h-2 w-full rounded ${accentLightClass}`} />
        <div className={`h-2 w-4/6 rounded ${accentLightClass}`} />
      </div>
      <div className="flex flex-col gap-1 pt-1">
        <div className={`h-1.5 w-full rounded ${bulletClass}`} />
        <div className={`h-1.5 w-11/12 rounded ${bulletClass}`} />
        <div className={`h-1.5 w-10/12 rounded ${bulletClass}`} />
      </div>
    </div>
  );
}

function SummaryReview({
  original,
  suggestion,
  onAccept,
  onKeep,
}: {
  original: string;
  suggestion: string;
  onAccept: () => void;
  onKeep: () => void;
}) {
  const diff = useMemo(() => diffWords(original, suggestion), [original, suggestion]);

  const originalNodes = useMemo(
    () =>
      diff.map((segment, index) => {
        if (segment.type === 'added') {
          return null;
        }
        if (segment.type === 'removed') {
          return (
            <span key={`orig-${index}`} className="bg-yellow-100 line-through decoration-2 decoration-yellow-500">
              {segment.value}
            </span>
          );
        }
        return <span key={`orig-${index}`}>{segment.value}</span>;
      }),
    [diff],
  );

  const suggestionNodes = useMemo(
    () =>
      diff.map((segment, index) => {
        if (segment.type === 'removed') {
          return null;
        }
        if (segment.type === 'added') {
          return (
            <span key={`new-${index}`} className="rounded bg-green-100 px-0.5 text-neutral-900">
              {segment.value}
            </span>
          );
        }
        return <span key={`new-${index}`}>{segment.value}</span>;
      }),
    [diff],
  );

  return (
    <div className="mt-3 rounded border border-neutral-200 bg-white p-3 shadow-sm">
      <div className="flex flex-col gap-4 md:flex-row">
        <div className="flex-1">
          <h4 className="text-sm font-semibold text-neutral-700">Current summary</h4>
          <p className="mt-1 whitespace-pre-wrap text-sm text-neutral-700">{originalNodes}</p>
        </div>
        <div className="flex-1">
          <h4 className="text-sm font-semibold text-neutral-700">AI suggestion</h4>
          <p className="mt-1 whitespace-pre-wrap text-sm text-neutral-700">{suggestionNodes}</p>
        </div>
      </div>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:justify-end">
        <button
          type="button"
          className="rounded border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-700 transition hover:border-neutral-500 hover:text-neutral-900"
          onClick={onKeep}
        >
          Keep original
        </button>
        <button
          type="button"
          className="rounded bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-neutral-800"
          onClick={onAccept}
        >
          Use AI suggestion
        </button>
      </div>
    </div>
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

function createTimelineDraft(): TimelineDraft {
  return {
    startMonth: '',
    startYear: '',
    endMonth: '',
    endYear: '',
    endPresent: false,
  };
}

function buildTimelineValue({ year, month }: { year?: string; month?: string }) {
  const normalizedYear = year?.trim();
  const normalizedMonth = month?.trim();
  if (!normalizedYear) return undefined;
  if (normalizedMonth) {
    return `${normalizedYear}-${normalizedMonth}`;
  }
  return normalizedYear;
}

function splitTimeline(value?: string): { month: string; year: string; isPresent: boolean } {
  if (!value) {
    return { month: '', year: '', isPresent: false };
  }
  const normalized = normalizeTimeline(value);
  if (!normalized) {
    return { month: '', year: '', isPresent: false };
  }
  if (normalized === 'present') {
    return { month: '', year: '', isPresent: true };
  }
  const match = normalized.match(/^(\d{4})(?:-(\d{2}))?$/);
  if (match) {
    return {
      year: match[1],
      month: match[2] ?? '',
      isPresent: false,
    };
  }
  return { month: '', year: '', isPresent: false };
}

function normalizeTimeline(value?: string) {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const lower = trimmed.toLowerCase();
  if (lower === 'present') return 'present';
  if (/^\d{4}$/.test(trimmed)) return trimmed;
  const yearMonthMatch = trimmed.match(/^(\d{4})-(\d{2})$/);
  if (yearMonthMatch) {
    return `${yearMonthMatch[1]}-${yearMonthMatch[2]}`;
  }
  const yearMonthDayMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (yearMonthDayMatch) {
    return `${yearMonthDayMatch[1]}-${yearMonthDayMatch[2]}`;
  }
  const monthYear = parseMonthYear(trimmed);
  if (monthYear) {
    return monthYear;
  }
  return trimmed;
}

function parseMonthYear(value: string) {
  const match = value.match(/^([A-Za-z]+)\s+(\d{4})$/);
  if (!match) return undefined;
  const month = MONTH_NAME_LOOKUP[match[1].toLowerCase()];
  if (!month) return undefined;
  return `${match[2]}-${month}`;
}

function normalizeSkillLabel(label: string) {
  const collapsed = label.replace(/\s+/g, ' ').trim();
  if (!collapsed) return '';
  return collapsed
    .split(' ')
    .map(segment =>
      segment
        .split(/([/-])/)
        .map(chunk => {
          if (chunk === '/' || chunk === '-') return chunk;
          if (!chunk) return '';
          if (/^[A-Z0-9]+$/.test(chunk)) return chunk.toUpperCase();
          return chunk.charAt(0).toUpperCase() + chunk.slice(1).toLowerCase();
        })
        .join(''),
    )
    .join(' ');
}

function formatPhoneNumber(value: string | undefined): string {
  if (!value) return '';
  const trimmed = value.trim();
  if (!trimmed) return '';
  const digits = trimmed.replace(/\D+/g, '');
  if (digits.length === 11 && digits.startsWith('1')) {
    const area = digits.slice(1, 4);
    const prefix = digits.slice(4, 7);
    const line = digits.slice(7);
    return `+1 (${area}) ${prefix}-${line}`;
  }
  if (digits.length === 10) {
    const area = digits.slice(0, 3);
    const prefix = digits.slice(3, 6);
    const line = digits.slice(6);
    return `(${area}) ${prefix}-${line}`;
  }
  if (digits.length === 7) {
    const prefix = digits.slice(0, 3);
    const line = digits.slice(3);
    return `${prefix}-${line}`;
  }
  return trimmed;
}

function diffWords(original: string, revised: string): DiffSegment[] {
  const a = tokenizeForDiff(original);
  const b = tokenizeForDiff(revised);
  const m = a.length;
  const n = b.length;
  const lcs: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = m - 1; i >= 0; i -= 1) {
    for (let j = n - 1; j >= 0; j -= 1) {
      if (a[i] === b[j]) {
        lcs[i][j] = lcs[i + 1][j + 1] + 1;
      } else {
        lcs[i][j] = Math.max(lcs[i + 1][j], lcs[i][j + 1]);
      }
    }
  }

  const segments: DiffSegment[] = [];
  let i = 0;
  let j = 0;
  while (i < m && j < n) {
    if (a[i] === b[j]) {
      segments.push({ type: 'unchanged', value: b[j] });
      i += 1;
      j += 1;
    } else if (lcs[i + 1][j] >= lcs[i][j + 1]) {
      segments.push({ type: 'removed', value: a[i] });
      i += 1;
    } else {
      segments.push({ type: 'added', value: b[j] });
      j += 1;
    }
  }

  while (i < m) {
    segments.push({ type: 'removed', value: a[i] });
    i += 1;
  }

  while (j < n) {
    segments.push({ type: 'added', value: b[j] });
    j += 1;
  }

  return mergeSegments(segments);
}

function mergeSegments(segments: DiffSegment[]): DiffSegment[] {
  const merged: DiffSegment[] = [];
  for (const segment of segments) {
    if (!segment.value) continue;
    const previous = merged[merged.length - 1];
    if (previous && previous.type === segment.type) {
      previous.value += segment.value;
    } else {
      merged.push({ ...segment });
    }
  }
  return merged;
}

function tokenizeForDiff(text: string): string[] {
  return text.match(/\s+|\S+/g) ?? [];
}
