'use client';

import { useCallback, useEffect, useMemo, useRef, useState, useId } from 'react';
import { rewriteSummary } from '@/lib/resume/rewrite-summary';
import type { ResumePayload } from '@/lib/resume/types';
import { TEMPLATES, type TemplateName } from '@/resume/shared/templates';
import { buildResumeFilename } from '@/resume/shared/filename';

const STORAGE_KEY = 'resume.draft';
const STORAGE_VERSION = 2;
const EXPERIENCE_LIMIT = 20;
const EDUCATION_LIMIT = 10;
const MAX_BULLETS = 8;
const SUMMARY_MIN_CHARS = 12;
const MAX_SKILLS = 20;

type StepKey = 'template' | 'contact' | 'summary' | 'skills' | 'experience' | 'education' | 'preview';

const WIZARD_STEPS: Array<{ key: StepKey; title: string; description: string }> = [
  { key: 'template', title: 'Template', description: 'Pick the layout you like.' },
  { key: 'contact', title: 'Contact info', description: 'Share how employers can reach you.' },
  { key: 'summary', title: 'Summary', description: 'Describe your strengths in a few sentences.' },
  { key: 'skills', title: 'Skills', description: 'List the abilities you want to highlight.' },
  { key: 'experience', title: 'Experience', description: 'Add past jobs and what you did.' },
  { key: 'education', title: 'Education', description: 'Show your schooling or training.' },
  { key: 'preview', title: 'Preview', description: 'Check the final resume before downloading.' },
];

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

const DEFAULT_SUMMARY_TEMPLATE =
  'Dedicated [Job Title] with [X] years supporting [Customers/Teams]. Skilled in [Top Strengths]. Ready to bring dependable service to [Target Role].';

const DEFAULT_PAYLOAD: ResumePayload = {
  name: '',
  email: '',
  phone: '',
  location: '',
  summary: DEFAULT_SUMMARY_TEMPLATE,
  skills: [],
  experience: [],
  education: [],
};

const createDefaultPayload = (): ResumePayload => ({
  ...DEFAULT_PAYLOAD,
  skills: [],
  experience: [],
  education: [],
});

export function ResumeBuilderSection() {
  const [payload, setPayload] = useState<ResumePayload>(() => createDefaultPayload());
  const [template, setTemplate] = useState<TemplateName>('classic');
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [status, setStatus] = useState<string | null>(null);
  const [skillDraft, setSkillDraft] = useState<string>('');
  const [bulletsInputs, setBulletsInputs] = useState<string[]>([]);
  const [timelineInputs, setTimelineInputs] = useState<TimelineDraft[]>([]);
  const [isSummaryRewriting, setIsSummaryRewriting] = useState(false);
  const [summaryStatus, setSummaryStatus] = useState<{ kind: 'success' | 'error'; message: string } | null>(null);
  const [summaryComparison, setSummaryComparison] = useState<{ original: string; suggestion: string } | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const previewWindowRef = useRef<Window | null>(null);
  const contactHelpId = useId();
  const summaryHelpId = useId();
  const skillsHelpId = useId();
  const experienceHelpId = useId();
  const buttonsHelpId = useId();

  const activeStep = WIZARD_STEPS[currentStepIndex];

  useEffect(() => {
    if (!summaryComparison) return;
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    // Ensure the AI rewrite diff is not hidden behind the bottom overlay.
    const scrollHeight = document.documentElement.scrollHeight || document.body.scrollHeight || 0;
    window.scrollTo({ top: scrollHeight, behavior: 'smooth' });
  }, [summaryComparison]);

  const persistDraft = useCallback(
    (draft: ResumePayload, draftTemplate: TemplateName, stepIndex: number) => {
      if (typeof window === 'undefined') return;
      const safeIndex = Math.min(Math.max(stepIndex, 0), WIZARD_STEPS.length - 1);
      const record = {
        version: STORAGE_VERSION,
        payload: draft,
        template: draftTemplate,
        step: WIZARD_STEPS[safeIndex]?.key ?? 'template',
      };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
    },
    [],
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as unknown;

      let storedPayload: ResumePayload | null = null;
      let storedTemplate: TemplateName | null = null;
      let storedStep: StepKey | null = null;

      if (parsed && typeof parsed === 'object' && parsed !== null && 'payload' in parsed) {
        const record = parsed as {
          payload?: ResumePayload;
          template?: TemplateName;
          step?: StepKey;
        };
        if (record.payload && typeof record.payload === 'object') {
          storedPayload = {
            ...createDefaultPayload(),
            ...record.payload,
          };
        }
        if (record.template && (TEMPLATES as ReadonlyArray<string>).includes(record.template)) {
          storedTemplate = record.template;
        }
        if (record.step && WIZARD_STEPS.some(step => step.key === record.step)) {
          storedStep = record.step;
        }
      } else if (parsed && typeof parsed === 'object' && parsed !== null) {
        storedPayload = {
          ...createDefaultPayload(),
          ...(parsed as ResumePayload),
        };
      }

      if (!storedPayload) return;

      const normalized: ResumePayload = {
        ...createDefaultPayload(),
        ...storedPayload,
      };
      if (normalized.phone) {
        normalized.phone = formatPhoneNumber(normalized.phone);
      }
      if (!normalized.summary) {
        normalized.summary = DEFAULT_SUMMARY_TEMPLATE;
      }

      setPayload(normalized);
      setSkillDraft('');

      const bulletsState: string[] = [];
      (normalized.experience ?? []).forEach((exp, idx) => {
        bulletsState[idx] = exp?.bullets ? exp.bullets.join('\n') : '';
      });
      setBulletsInputs(bulletsState);

      const timelineState: TimelineDraft[] = [];
      (normalized.experience ?? []).forEach((exp, idx) => {
        const startParts = splitTimeline(exp?.startDate);
        const endParts = splitTimeline(exp?.endDate);
        timelineState[idx] = {
          startMonth: startParts.month,
          startYear: startParts.year,
          endMonth: endParts.month,
          endYear: endParts.year,
          endPresent: endParts.isPresent,
        };
      });
      setTimelineInputs(timelineState);

      if (storedTemplate) {
        setTemplate(storedTemplate);
      }
      if (storedStep) {
        const index = WIZARD_STEPS.findIndex(step => step.key === storedStep);
        if (index >= 0) {
          setCurrentStepIndex(index);
        }
      }
    } catch {
      // ignore corrupted storage
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const timer = window.setTimeout(() => {
      persistDraft(payload, template, currentStepIndex);
    }, 600);
    return () => window.clearTimeout(timer);
  }, [payload, template, currentStepIndex, persistDraft]);

  const hasRequiredContact = useMemo(
    () =>
      Boolean(
        payload.name.trim() &&
          payload.email.trim() &&
          (payload.phone ?? '').trim() &&
          (payload.location ?? '').trim(),
      ),
    [payload],
  );
  const summaryComplete = useMemo(() => {
    const summary = (payload.summary ?? '').trim();
    if (summary.length < SUMMARY_MIN_CHARS) return false;
    if (summary === DEFAULT_SUMMARY_TEMPLATE.trim()) return false;
    return true;
  }, [payload.summary]);
  const canPreview = hasRequiredContact && summaryComplete;
  const stepCompletion = useMemo<Record<StepKey, boolean>>(
    () => ({
      template: true,
      contact: hasRequiredContact,
      summary: summaryComplete,
      skills: true,
      experience: true,
      education: true,
      preview: canPreview,
    }),
    [canPreview, hasRequiredContact, summaryComplete],
  );
  const progressPercent = useMemo(() => {
    if (WIZARD_STEPS.length <= 1) return 100;
    return Math.round((currentStepIndex / (WIZARD_STEPS.length - 1)) * 100);
  }, [currentStepIndex]);
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === WIZARD_STEPS.length - 1;
  const nextStepLabel = !isLastStep ? `Next: ${WIZARD_STEPS[currentStepIndex + 1].title}` : 'Next';
  const isActiveStepComplete = stepCompletion[activeStep.key];
  const skillValues = payload.skills ?? [];
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

  const handleNextStep = useCallback(() => {
    const nextIndex = Math.min(currentStepIndex + 1, WIZARD_STEPS.length - 1);
    const currentKey = WIZARD_STEPS[currentStepIndex]?.key;
    if (currentKey && !stepCompletion[currentKey]) return;
    persistDraft(payload, template, nextIndex);
    setCurrentStepIndex(nextIndex);
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [currentStepIndex, payload, persistDraft, stepCompletion, template]);

  const handlePreviousStep = useCallback(() => {
    const prevIndex = Math.max(currentStepIndex - 1, 0);
    if (prevIndex === currentStepIndex) return;
    persistDraft(payload, template, prevIndex);
    setCurrentStepIndex(prevIndex);
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [currentStepIndex, payload, persistDraft, template]);

  const handleGoToStep = useCallback(
    (index: number) => {
      if (index < 0 || index >= WIZARD_STEPS.length) return;
      if (index === currentStepIndex) return;
      if (index > currentStepIndex) return;
      persistDraft(payload, template, index);
      setCurrentStepIndex(index);
      if (typeof window !== 'undefined') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    },
    [currentStepIndex, payload, persistDraft, template],
  );

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
    if (!canPreview) {
      setStatus('Please complete your contact details and summary before previewing.');
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
    persistDraft(submissionPayload, template, currentStepIndex);
    setStatus('Generating PDF preview...');
    setIsPreviewLoading(true);
    setPreviewUrl(null);

    let openedWindow: Window | null = null;
    if (typeof window !== 'undefined') {
      openedWindow = window.open('', '_blank');
      if (openedWindow) {
        openedWindow.document.write('<p style="font-family:system-ui; padding:16px;">Generating your resume preview...</p>');
        openedWindow.document.title = 'Generating resume...';
      }
      previewWindowRef.current = openedWindow;
    }

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

      if (previewWindowRef.current && !previewWindowRef.current.closed) {
        previewWindowRef.current.location.href = absoluteUrl;
      } else if (typeof window !== 'undefined') {
        window.open(absoluteUrl, '_blank');
      }

      setStatus('Preview opened in a new tab. Use the download button if you need a copy.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate PDF.';
      setStatus(message);
      if (previewWindowRef.current && !previewWindowRef.current.closed) {
        previewWindowRef.current.close();
      }
      previewWindowRef.current = null;
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const handleReset = () => {
    setPayload(createDefaultPayload());
    setTemplate('classic');
    setCurrentStepIndex(0);
    setSkillDraft('');
    setBulletsInputs([]);
    setTimelineInputs([]);
    setStatus('Cleared the draft.');
    setSummaryStatus(null);
    setIsSummaryRewriting(false);
    setSummaryComparison(null);
    setPreviewUrl(null);
    setIsPreviewLoading(false);
    if (previewWindowRef.current && !previewWindowRef.current.closed) {
      previewWindowRef.current.close();
    }
    previewWindowRef.current = null;
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  };

  const renderStepContent = () => {
    switch (activeStep.key) {
      case 'template':
        return (
          <div className="flex flex-col gap-6">
            <p className="text-lg text-neutral-600">
              Each template keeps your information the same. Choose the look that fits the job you want.
            </p>
            <div
              role="radiogroup"
              aria-label="Resume template"
              className="grid gap-4 md:grid-cols-3"
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
                    className={`rounded-xl border-2 px-5 py-4 text-left shadow-sm transition focus:outline-none focus:ring-4 focus:ring-emerald-200 ${
                      isSelected
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-900'
                        : 'border-neutral-300 bg-white text-neutral-700 hover:border-emerald-400 hover:text-neutral-900'
                    }`}
                    title={`Use the ${detail.label} resume template`}
                  >
                    <div className="flex flex-col gap-4">
                      <div>
                        <span className="text-lg font-semibold text-neutral-900">{detail.label}</span>
                        <p className="mt-2 text-sm text-neutral-600">{detail.description}</p>
                      </div>
                      <TemplatePreview template={option} />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        );
      case 'contact':
        return (
          <div className="flex flex-col gap-6">
            <p id={contactHelpId} className="text-lg text-neutral-600">
              We only use this information to build the PDF. It stays on this device.
            </p>
            <div className="grid gap-5 md:grid-cols-2">
              <label className="flex flex-col gap-2" title="Required field">
                <span className="text-sm font-semibold uppercase tracking-wide text-neutral-900">
                  Name{' '}
                  <abbr title="Required" className="text-lg text-red-600 no-underline">
                    *
                  </abbr>
                </span>
                <input
                  className="rounded-lg border-2 border-neutral-300 px-4 py-3 text-base text-neutral-900 shadow-sm transition focus:border-emerald-600 focus:outline-none focus:ring-4 focus:ring-emerald-200"
                  value={payload.name}
                  onChange={event => setPayload(prev => ({ ...prev, name: event.target.value }))}
                  placeholder="Full name"
                  autoComplete="name"
                  aria-describedby={contactHelpId}
                  required
                />
              </label>
              <label className="flex flex-col gap-2" title="Required field">
                <span className="text-sm font-semibold uppercase tracking-wide text-neutral-900">
                  Email{' '}
                  <abbr title="Required" className="text-lg text-red-600 no-underline">
                    *
                  </abbr>
                </span>
                <input
                  className="rounded-lg border-2 border-neutral-300 px-4 py-3 text-base text-neutral-900 shadow-sm transition focus:border-emerald-600 focus:outline-none focus:ring-4 focus:ring-emerald-200"
                  value={payload.email}
                  onChange={event => setPayload(prev => ({ ...prev, email: event.target.value }))}
                  placeholder="email@example.com"
                  autoComplete="email"
                  inputMode="email"
                  aria-describedby={contactHelpId}
                  required
                />
              </label>
              <label className="flex flex-col gap-2" title="Required field">
                <span className="text-sm font-semibold uppercase tracking-wide text-neutral-900">
                  Phone{' '}
                  <abbr title="Required" className="text-lg text-red-600 no-underline">
                    *
                  </abbr>
                </span>
                <input
                  className="rounded-lg border-2 border-neutral-300 px-4 py-3 text-base text-neutral-900 shadow-sm transition focus:border-emerald-600 focus:outline-none focus:ring-4 focus:ring-emerald-200"
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
                  required
                />
                <span className="text-sm text-neutral-500">Include the area code so employers can call you.</span>
              </label>
              <label className="flex flex-col gap-2" title="Required field">
                <span className="text-sm font-semibold uppercase tracking-wide text-neutral-900">
                  City &amp; State{' '}
                  <abbr title="Required" className="text-lg text-red-600 no-underline">
                    *
                  </abbr>
                </span>
                <input
                  className="rounded-lg border-2 border-neutral-300 px-4 py-3 text-base text-neutral-900 shadow-sm transition focus:border-emerald-600 focus:outline-none focus:ring-4 focus:ring-emerald-200"
                  value={payload.location ?? ''}
                  onChange={event => setPayload(prev => ({ ...prev, location: event.target.value }))}
                  placeholder="City, ST"
                  autoComplete="address-level2"
                  aria-describedby={contactHelpId}
                  required
                />
                <span className="text-sm text-neutral-500">A city and state tells employers you are nearby.</span>
              </label>
            </div>
          </div>
        );
      case 'summary':
        return (
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p id={summaryHelpId} className="text-lg text-neutral-600">
                  Use this space to tell employers what you bring to the job. Replace the bracketed phrases with your details.
                </p>
              </div>
              <button
                type="button"
                className="rounded-full bg-neutral-900 px-4 py-2 text-sm font-semibold uppercase tracking-wide text-white transition hover:bg-neutral-800 focus:outline-none focus:ring-4 focus:ring-neutral-300 disabled:cursor-not-allowed disabled:bg-neutral-400"
                onClick={handleRewriteSummary}
                disabled={isSummaryRewriting || !canRewriteSummary}
                title="Let the assistant polish your summary"
              >
                {isSummaryRewriting ? 'Rewriting…' : 'Rewrite with AI'}
              </button>
            </div>
            <textarea
              className="h-48 w-full rounded-lg border-2 border-neutral-300 px-4 py-3 text-base text-neutral-900 shadow-sm transition focus:border-emerald-600 focus:outline-none focus:ring-4 focus:ring-emerald-200"
              value={payload.summary ?? ''}
              onChange={event => {
                setSummaryStatus(null);
                setSummaryComparison(null);
                setPayload(prev => ({ ...prev, summary: event.target.value }));
              }}
              placeholder={DEFAULT_SUMMARY_TEMPLATE}
              aria-busy={isSummaryRewriting}
              aria-describedby={summaryHelpId}
              maxLength={800}
              title="Write 2-3 sentences about your experience"
            />
            {summaryStatus && (
              <span
                className={`text-sm ${summaryStatus.kind === 'error' ? 'text-red-600' : 'text-neutral-700'}`}
                role="status"
                aria-live="polite"
              >
                {summaryStatus.message}
              </span>
            )}
            <p className="text-sm text-neutral-500">
              Tip: Mention how many years you have worked, the skills you rely on, and the type of job you want next.
            </p>
            {summaryComparison && (
              <SummaryReview
                original={summaryComparison.original}
                suggestion={summaryComparison.suggestion}
                onKeep={() => handleKeepOriginalSummary(summaryComparison.original)}
                onAccept={() => handleAcceptSummarySuggestion(summaryComparison.suggestion)}
              />
            )}
          </div>
        );
      case 'skills':
        return (
          <div className="flex flex-col gap-5">
            <p id={skillsHelpId} className="text-lg text-neutral-600">
              Add short phrases like Cash Handling or Teamwork. Press Enter after each skill or pick from the suggestions.
            </p>
            <div
              className={`flex flex-wrap items-center gap-2 rounded-lg border-2 px-3 py-3 ${
                skillValues.length ? 'border-neutral-300 bg-white' : 'border-dashed border-neutral-300 bg-neutral-50'
              }`}
            >
              {skillValues.map(skill => (
                <span
                  key={skill}
                  className="group inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-sm font-medium text-emerald-900"
                >
                  {skill}
                  <button
                    type="button"
                    className="rounded-full bg-emerald-200 px-2 text-xs font-bold text-emerald-800 transition hover:bg-emerald-300 focus:outline-none focus:ring-4 focus:ring-emerald-200"
                    onClick={() => removeSkill(skill)}
                    aria-label={`Remove skill ${skill}`}
                    title="Remove this skill"
                  >
                    ×
                  </button>
                </span>
              ))}
              <input
                type="text"
                className="min-w-[140px] flex-1 border-none bg-transparent px-2 py-1 text-base text-neutral-900 focus:outline-none focus:ring-0 disabled:cursor-not-allowed"
                value={skillDraft}
                onChange={event => {
                  const value = event.target.value;
                  if (value.includes(',')) {
                    const parts = value.split(',');
                    parts.slice(0, -1).forEach(part => addSkill(part));
                    setSkillDraft(parts[parts.length - 1] ?? '');
                    return;
                  }
                  setSkillDraft(value);
                }}
                onKeyDown={event => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    handleSkillDraftCommit();
                  }
                }}
                placeholder="Type a skill and press Enter"
                aria-describedby={skillsHelpId}
                title="Type a skill and press Enter to add it"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2" aria-label="Suggested skills">
              {SKILL_SUGGESTIONS.map(skill => {
                const alreadyAdded = skillValues.some(
                  existing => existing.toLowerCase() === skill.toLowerCase(),
                );
                return (
                  <button
                    key={skill}
                    type="button"
                    onClick={() => addSkill(skill)}
                    className={`rounded-full px-4 py-2 text-sm font-semibold transition focus:outline-none focus:ring-4 focus:ring-emerald-200 ${
                      alreadyAdded
                        ? 'bg-neutral-200 text-neutral-500'
                        : 'bg-emerald-600 text-white hover:bg-emerald-700'
                    }`}
                    disabled={alreadyAdded}
                    title={alreadyAdded ? 'Skill already added' : `Add ${skill} to your skills`}
                  >
                    {skill}
                  </button>
                );
              })}
            </div>
            <p className="text-sm text-neutral-500">Need ideas? Start with customer service, reliability, or any tools you use every day.</p>
          </div>
        );
      case 'experience':
        return (
          <div className="flex flex-col gap-6" aria-describedby={experienceHelpId}>
            <p id={experienceHelpId} className="text-lg text-neutral-600">
              List your recent jobs or volunteer work. Focus on the tasks that show reliability and people skills.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                className="rounded bg-neutral-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-neutral-800 focus:outline-none focus:ring-4 focus:ring-neutral-300 disabled:cursor-not-allowed"
                onClick={addExperience}
                disabled={experience.length >= EXPERIENCE_LIMIT}
              >
                Add a job
              </button>
              <span className="text-sm text-neutral-500">
                {experience.length
                  ? `You can add up to ${EXPERIENCE_LIMIT - experience.length} more ${experience.length === EXPERIENCE_LIMIT - 1 ? 'role' : 'roles'}.`
                  : 'Start with your most recent role.'}
              </span>
            </div>
            {!experience.length && (
              <div className="rounded-lg border border-dashed border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-600">
                Add your first job to show employers what you have done and how you helped.
              </div>
            )}
            <div className="flex flex-col gap-6">
              {experience.map((entry, index) => {
                const timelineDraft = timelineInputs[index] ?? createTimelineDraft();
                return (
                  <div key={`experience-${index}`} className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200 pb-3">
                      <span className="text-lg font-semibold text-neutral-900">Role {index + 1}</span>
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => moveExperience(index, -1)}
                          className="rounded border border-neutral-300 px-3 py-1 text-sm font-medium text-neutral-700 transition hover:border-neutral-500 hover:text-neutral-900 focus:outline-none focus:ring-4 focus:ring-neutral-200 disabled:cursor-not-allowed disabled:text-neutral-400"
                          disabled={index === 0}
                          title="Move this role up"
                        >
                          Move up
                        </button>
                        <button
                          type="button"
                          onClick={() => moveExperience(index, 1)}
                          className="rounded border border-neutral-300 px-3 py-1 text-sm font-medium text-neutral-700 transition hover:border-neutral-500 hover:text-neutral-900 focus:outline-none focus:ring-4 focus:ring-neutral-200 disabled:cursor-not-allowed disabled:text-neutral-400"
                          disabled={index === experience.length - 1}
                          title="Move this role down"
                        >
                          Move down
                        </button>
                        <button
                          type="button"
                          onClick={() => removeExperience(index)}
                          className="rounded bg-red-600 px-3 py-1 text-sm font-semibold text-white transition hover:bg-red-700 focus:outline-none focus:ring-4 focus:ring-red-200"
                          title="Remove this role"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      <label className="flex flex-col gap-2">
                        <span className="text-xs font-semibold uppercase tracking-wide text-neutral-600">
                          Job Title
                        </span>
                        <input
                          className="rounded border border-neutral-300 px-3 py-2 text-base focus:border-emerald-600 focus:outline-none focus:ring-4 focus:ring-emerald-200"
                          value={entry.title ?? ''}
                          onChange={event => updateExperienceField(index, 'title', event.target.value)}
                          placeholder="Shift Lead"
                        />
                      </label>
                      <label className="flex flex-col gap-2">
                        <span className="text-xs font-semibold uppercase tracking-wide text-neutral-600">
                          Employer
                        </span>
                        <input
                          className="rounded border border-neutral-300 px-3 py-2 text-base focus:border-emerald-600 focus:outline-none focus:ring-4 focus:ring-emerald-200"
                          value={entry.company ?? ''}
                          onChange={event => updateExperienceField(index, 'company', event.target.value)}
                          placeholder="Riverfront Grocery"
                        />
                      </label>
                      <div className="flex flex-col gap-2">
                        <span className="text-xs font-semibold uppercase tracking-wide text-neutral-600">Start date</span>
                        <div className="grid grid-cols-2 gap-2">
                          <select
                            className="rounded border border-neutral-300 px-2 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-4 focus:ring-emerald-200"
                            value={timelineDraft.startMonth}
                            onChange={event => updateTimelineInput(index, 'start', 'month', event.target.value)}
                          >
                            <option value="">Month</option>
                            {MONTH_OPTIONS.map(option => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                          <select
                            className="rounded border border-neutral-300 px-2 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-4 focus:ring-emerald-200"
                            value={timelineDraft.startYear}
                            onChange={event => updateTimelineInput(index, 'start', 'year', event.target.value)}
                          >
                            <option value="">Year</option>
                            {YEAR_OPTIONS.map(year => (
                              <option key={year} value={year}>
                                {year}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2">
                        <span className="text-xs font-semibold uppercase tracking-wide text-neutral-600">End date</span>
                        <div className="grid grid-cols-2 gap-2">
                          <select
                            className="rounded border border-neutral-300 px-2 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-4 focus:ring-emerald-200"
                            value={timelineDraft.endMonth}
                            onChange={event => updateTimelineInput(index, 'end', 'month', event.target.value)}
                            disabled={timelineDraft.endPresent}
                          >
                            <option value="">Month</option>
                            {MONTH_OPTIONS.map(option => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                          <select
                            className="rounded border border-neutral-300 px-2 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-4 focus:ring-emerald-200"
                            value={timelineDraft.endYear}
                            onChange={event => updateTimelineInput(index, 'end', 'year', event.target.value)}
                            disabled={timelineDraft.endPresent}
                          >
                            <option value="">Year</option>
                            {YEAR_OPTIONS.map(year => (
                              <option key={year} value={year}>
                                {year}
                              </option>
                            ))}
                          </select>
                        </div>
                        <label className="flex items-center gap-2 text-sm text-neutral-700">
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-neutral-400 text-emerald-600 focus:ring-emerald-200"
                            checked={timelineDraft.endPresent}
                            onChange={event => updateTimelineInput(index, 'end', 'present', event.target.checked)}
                          />
                          I still work here
                        </label>
                      </div>
                    </div>
                    <label className="mt-4 flex flex-col gap-2">
                      <span className="text-xs font-semibold uppercase tracking-wide text-neutral-600">
                        Key contributions
                      </span>
                      <textarea
                        className="min-h-[140px] rounded border border-neutral-300 px-3 py-2 text-base focus:border-emerald-600 focus:outline-none focus:ring-4 focus:ring-emerald-200"
                        value={bulletsInputs[index] ?? ''}
                        onChange={event => updateExperienceField(index, 'bullets', event.target.value)}
                        placeholder={'Handled 50+ customer purchases each shift\nTrained two new team members'}
                      />
                      <span className="text-xs text-neutral-500">
                        Use short sentences starting with action verbs. One idea per line.
                      </span>
                    </label>
                  </div>
                );
              })}
            </div>
          </div>
        );
      case 'education':
        return (
          <div className="flex flex-col gap-6">
            <p className="text-lg text-neutral-600">
              Share your schooling, certificates, or training programs. Most recent items should go first.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                className="rounded bg-neutral-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-neutral-800 focus:outline-none focus:ring-4 focus:ring-neutral-300 disabled:cursor-not-allowed"
                onClick={addEducation}
                disabled={education.length >= EDUCATION_LIMIT}
              >
                Add education
              </button>
              <span className="text-sm text-neutral-500">
                {education.length
                  ? `You can add ${EDUCATION_LIMIT - education.length} more ${education.length === EDUCATION_LIMIT - 1 ? 'entry' : 'entries'}.`
                  : 'Include diplomas, certificates, or relevant coursework.'}
              </span>
            </div>
            {!education.length && (
              <div className="rounded-lg border border-dashed border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-600">
                Add your highest level of education or any job-ready training.
              </div>
            )}
            <div className="flex flex-col gap-6">
              {education.map((entry, index) => (
                <div key={`education-${index}`} className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200 pb-3">
                    <span className="text-lg font-semibold text-neutral-900">Education {index + 1}</span>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => moveEducation(index, -1)}
                        className="rounded border border-neutral-300 px-3 py-1 text-sm font-medium text-neutral-700 transition hover:border-neutral-500 hover:text-neutral-900 focus:outline-none focus:ring-4 focus:ring-neutral-200 disabled:cursor-not-allowed disabled:text-neutral-400"
                        disabled={index === 0}
                        title="Move this entry up"
                      >
                        Move up
                      </button>
                      <button
                        type="button"
                        onClick={() => moveEducation(index, 1)}
                        className="rounded border border-neutral-300 px-3 py-1 text-sm font-medium text-neutral-700 transition hover:border-neutral-500 hover:text-neutral-900 focus:outline-none focus:ring-4 focus:ring-neutral-200 disabled:cursor-not-allowed disabled:text-neutral-400"
                        disabled={index === education.length - 1}
                        title="Move this entry down"
                      >
                        Move down
                      </button>
                      <button
                        type="button"
                        onClick={() => removeEducation(index)}
                        className="rounded bg-red-600 px-3 py-1 text-sm font-semibold text-white transition hover:bg-red-700 focus:outline-none focus:ring-4 focus:ring-red-200"
                        title="Remove this entry"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <label className="flex flex-col gap-2">
                      <span className="text-xs font-semibold uppercase tracking-wide text-neutral-600">
                        Degree or program
                      </span>
                      <input
                        type="text"
                        className="rounded border border-neutral-300 px-3 py-2 text-base focus:border-emerald-600 focus:outline-none focus:ring-4 focus:ring-emerald-200"
                        value={entry.degree ?? ''}
                        onChange={event => updateEducationField(index, 'degree', event.target.value)}
                        placeholder="High School Diploma"
                      />
                    </label>
                    <label className="flex flex-col gap-2">
                      <span className="text-xs font-semibold uppercase tracking-wide text-neutral-600">School</span>
                      <input
                        type="text"
                        className="rounded border border-neutral-300 px-3 py-2 text-base focus:border-emerald-600 focus:outline-none focus:ring-4 focus:ring-emerald-200"
                        value={entry.school ?? ''}
                        onChange={event => updateEducationField(index, 'school', event.target.value)}
                        placeholder="Greenwood High School"
                      />
                    </label>
                    <label className="flex flex-col gap-2">
                      <span className="text-xs font-semibold uppercase tracking-wide text-neutral-600">
                        Graduation year (optional)
                      </span>
                      <input
                        className="rounded border border-neutral-300 px-3 py-2 text-base focus:border-emerald-600 focus:outline-none focus:ring-4 focus:ring-emerald-200"
                        value={entry.graduationYear ?? ''}
                        onChange={event => updateEducationField(index, 'graduationYear', event.target.value)}
                        placeholder="2022"
                      />
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      case 'preview':
        return (
          <div className="flex flex-col gap-6">
            <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
              <p className="text-lg text-neutral-700">
                Almost done! Use the checklist below to make sure everything is ready. You can jump back to any step.
              </p>
            </div>
            <ul className="flex flex-col gap-3">
              {WIZARD_STEPS.slice(0, -1).map(step => {
                if (step.key === 'preview') return null;
                const isComplete = stepCompletion[step.key];
                return (
                  <li
                    key={step.key}
                    className={`flex items-center justify-between rounded-lg border px-4 py-3 ${
                      isComplete ? 'border-emerald-500 bg-emerald-50 text-emerald-900' : 'border-neutral-200 bg-white text-neutral-700'
                    }`}
                  >
                    <div>
                      <span className="text-base font-semibold">{step.title}</span>
                      <p className="text-sm">{step.description}</p>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-sm font-semibold ${
                        isComplete ? 'bg-emerald-600 text-white' : 'bg-neutral-200 text-neutral-600'
                      }`}
                    >
                      {isComplete ? 'Ready' : 'Needs attention'}
                    </span>
                  </li>
                );
              })}
            </ul>
            {previewUrl && (
              <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-4 text-neutral-800">
                <p className="text-base font-semibold">Your latest preview is ready.</p>
                <p className="mt-1 text-sm">
                  Open the preview to double-check layout or use the download button below to save the PDF.
                </p>
              </div>
            )}
          </div>
        );
      default:
        return null;
    }
  };


return (
  <section
    id="resume-builder"
    className="mt-10 flex flex-col gap-8 rounded-2xl border border-neutral-200 bg-white p-6 shadow-lg"
  >
    <header className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="max-w-2xl">
          <h2 className="text-3xl font-bold text-neutral-900">Build Your Resume</h2>
          <p className="mt-1 text-base text-neutral-600">
            Move through each step in plain language. Your progress saves automatically in this browser.
          </p>
        </div>
        <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={handleGenerate}
            disabled={!canPreview || isPreviewLoading}
            className="rounded-full bg-emerald-600 px-6 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-emerald-700 focus:outline-none focus:ring-4 focus:ring-emerald-200 disabled:cursor-not-allowed disabled:bg-emerald-200 disabled:text-emerald-700"
            aria-describedby={buttonsHelpId}
            title="Open a PDF preview in a new tab"
          >
            {isPreviewLoading ? 'Opening Preview…' : 'Preview Resume'}
          </button>
          {previewUrl && (
            <a
              href={previewUrl}
              download={downloadFilename}
              className="inline-flex items-center justify-center rounded-full border-2 border-emerald-600 px-6 py-3 text-base font-semibold text-emerald-700 transition hover:border-emerald-700 hover:text-emerald-900 focus:outline-none focus:ring-4 focus:ring-emerald-200"
              title="Download the generated PDF"
            >
              Download PDF
            </a>
          )}
        </div>
      </div>
      <div className="flex flex-col gap-3">
        <div className="relative h-2 w-full rounded-full bg-neutral-200" aria-hidden="true">
          <div
            className="h-2 rounded-full bg-emerald-600 transition-all"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <ol className="flex flex-wrap gap-2" aria-label="Resume builder steps">
          {WIZARD_STEPS.map((step, index) => {
            const isActive = index === currentStepIndex;
            const isDone = index < currentStepIndex;
            const canNavigate = index <= currentStepIndex;
            const accent = isActive
              ? 'border-emerald-600 bg-emerald-600 text-white'
              : isDone
                ? 'border-emerald-400 bg-emerald-50 text-emerald-800'
                : 'border-neutral-300 bg-white text-neutral-600';
            return (
              <li key={step.key}>
                <button
                  type="button"
                  onClick={() => handleGoToStep(index)}
                  disabled={!canNavigate}
                  className={`flex items-center gap-2 rounded-full border-2 px-4 py-2 text-sm font-semibold transition focus:outline-none focus:ring-4 focus:ring-emerald-200 disabled:border-neutral-200 disabled:text-neutral-400 ${accent}`}
                  title={canNavigate ? `Go to ${step.title}` : 'Complete previous steps first'}
                  aria-current={isActive ? 'step' : undefined}
                >
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/20 font-bold">
                    {index + 1}
                  </span>
                  <span>{step.title}</span>
                </button>
              </li>
            );
          })}
        </ol>
      </div>
    </header>
    <div className="flex flex-col gap-4">
      <h3 className="text-2xl font-bold text-neutral-900">{activeStep.title}</h3>
      <p className="text-base text-neutral-600">{activeStep.description}</p>
      {renderStepContent()}
    </div>
    <nav className="sticky bottom-0 z-20 -mx-6 mt-8 border-t border-neutral-200 bg-white/95 px-6 py-5 backdrop-blur">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-3 pb-1 md:flex-nowrap md:pb-0">
          <button
            type="button"
            onClick={handlePreviousStep}
            disabled={isFirstStep}
            className="flex-shrink-0 rounded-full border-2 border-neutral-300 px-5 py-3 text-base font-semibold text-neutral-800 whitespace-nowrap transition hover:border-neutral-500 focus:outline-none focus:ring-4 focus:ring-neutral-300 disabled:cursor-not-allowed disabled:border-neutral-200 disabled:text-neutral-400"
            title="Go back to the previous step"
          >
            Back
          </button>
          {!isLastStep && (
            <button
              type="button"
              onClick={handleNextStep}
              disabled={!isActiveStepComplete}
              className="flex-shrink-0 rounded-full bg-neutral-900 px-6 py-3 text-base font-semibold text-white whitespace-nowrap shadow-sm transition hover:bg-neutral-800 focus:outline-none focus:ring-4 focus:ring-neutral-400 disabled:cursor-not-allowed disabled:bg-neutral-400"
              title={isActiveStepComplete ? 'Continue to the next step' : 'Complete the required fields to continue'}
            >
              {nextStepLabel}
            </button>
          )}
          <button
            type="button"
            onClick={handleGenerate}
            disabled={!canPreview || isPreviewLoading}
            className="flex-shrink-0 rounded-full bg-emerald-600 px-6 py-3 text-base font-semibold text-white whitespace-nowrap shadow-sm transition hover:bg-emerald-700 focus:outline-none focus:ring-4 focus:ring-emerald-200 disabled:cursor-not-allowed disabled:bg-emerald-200 disabled:text-emerald-700"
            aria-describedby={buttonsHelpId}
            title="Open a PDF preview in a new tab"
          >
            {isPreviewLoading ? 'Opening Preview…' : 'Preview Resume'}
          </button>
          {previewUrl && (
            <a
              href={previewUrl}
              download={downloadFilename}
              className="inline-flex flex-shrink-0 items-center justify-center rounded-full border-2 border-emerald-600 px-6 py-3 text-base font-semibold text-emerald-700 whitespace-nowrap transition hover:border-emerald-700 hover:text-emerald-900 focus:outline-none focus:ring-4 focus:ring-emerald-200"
              title="Download the generated PDF"
            >
              Download PDF
            </a>
          )}
          <button
            type="button"
            onClick={handleReset}
            className="flex-shrink-0 rounded-full border-2 border-neutral-300 px-6 py-3 text-base font-semibold text-neutral-700 whitespace-nowrap transition hover:border-neutral-500 hover:text-neutral-900 focus:outline-none focus:ring-4 focus:ring-neutral-300"
            title="Clear all fields and start over"
          >
            Reset All
          </button>
        </div>
        <div className="text-sm text-neutral-600">
          <p id={buttonsHelpId}>
            Preview opens in a new tab. Download saves as <span className="font-mono">{downloadFilename}</span>.
          </p>
          {status && (
            <p className="mt-1 text-sm text-neutral-700" role="status" aria-live="polite">
              {status}
            </p>
          )}
        </div>
      </div>
    </nav>
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
