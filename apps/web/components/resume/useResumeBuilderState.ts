import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { rewriteSummary } from '@/lib/resume/rewrite-summary';
import type { ResumePayload } from '@/lib/resume/types';
import { formatPhoneNumber, normalizeSkillLabel } from '@/lib/resume/utils/format';
import { buildTimelineValue, normalizeTimeline, splitTimeline } from '@/lib/resume/utils/timeline';
import { buildResumeFilename } from '@/resume/shared/filename';
import { TEMPLATES, type TemplateName } from '@/resume/shared/templates';

import {
  createDefaultPayload,
  DEFAULT_TEMPLATE,
  EDUCATION_LIMIT,
  EXPERIENCE_LIMIT,
  MAX_BULLETS,
  MAX_SKILLS,
  SUMMARY_MIN_CHARS,
  STORAGE_KEY,
  STORAGE_VERSION,
  WIZARD_STEPS,
  type StepKey,
} from './constants';

type SummaryStatus = { kind: 'success' | 'error'; message: string } | null;

type ExperienceEntry = NonNullable<ResumePayload['experience']>[number];
type EducationEntry = NonNullable<ResumePayload['education']>[number];
type TimelineDraft = {
  startMonth: string;
  startYear: string;
  endMonth: string;
  endYear: string;
  endPresent: boolean;
};

const createExperienceEntry = (): ExperienceEntry => ({
  title: '',
  company: '',
});

const createEducationEntry = (): EducationEntry => ({
  degree: '',
  school: '',
});

const createTimelineDraft = (): TimelineDraft => ({
  startMonth: '',
  startYear: '',
  endMonth: '',
  endYear: '',
  endPresent: false,
});

export function useResumeBuilderState() {
  const [payload, setPayload] = useState<ResumePayload>(() => createDefaultPayload());
  const [template, setTemplate] = useState<TemplateName>(DEFAULT_TEMPLATE);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [status, setStatus] = useState<string | null>(null);
  const [skillDraft, setSkillDraft] = useState<string>('');
  const [bulletsInputs, setBulletsInputs] = useState<string[]>([]);
  const [timelineInputs, setTimelineInputs] = useState<TimelineDraft[]>([]);
  const [isSummaryRewriting, setIsSummaryRewriting] = useState(false);
  const [summaryStatus, setSummaryStatus] = useState<SummaryStatus>(null);
  const [summaryComparison, setSummaryComparison] = useState<{ original: string; suggestion: string } | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const previewWindowRef = useRef<Window | null>(null);

  const activeStep = WIZARD_STEPS[currentStepIndex];

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
        normalized.summary = '';
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

  const hasRequiredContact = useMemo(() => {
    const name = payload.name.trim();
    const email = payload.email.trim();
    const phone = (payload.phone ?? '').trim();
    const location = (payload.location ?? '').trim();
    
    // Check all fields are present
    if (!name || !email || !phone || !location) return false;
    
    // Check minimum lengths
    if (name.length < 2) return false;
    if (location.length < 2) return false;
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return false;
    
    // Validate phone has enough digits
    const phoneDigits = phone.replace(/\D/g, '');
    if (phoneDigits.length < 7) return false;
    
    return true;
  }, [payload]);

  const summaryComplete = useMemo(() => {
    const summary = (payload.summary ?? '').trim();
    if (summary.length < SUMMARY_MIN_CHARS) return false;
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

  const downloadFilename = useMemo(
    () => buildResumeFilename(payload.name, template),
    [payload.name, template],
  );

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

  const handleRewriteSummary = useCallback(async () => {
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
  }, [payload]);

  const handleAcceptSummarySuggestion = useCallback((suggestion: string) => {
    setPayload(prev => ({ ...prev, summary: suggestion }));
    setSummaryComparison(null);
    setSummaryStatus({ kind: 'success', message: 'Summary updated with the AI suggestion.' });
  }, []);

  const handleKeepOriginalSummary = useCallback((original: string) => {
    setPayload(prev => ({ ...prev, summary: original }));
    setSummaryComparison(null);
    setSummaryStatus({ kind: 'success', message: 'Kept your original summary.' });
  }, []);

  const clearSummaryFeedback = useCallback(() => {
    setSummaryStatus(null);
    setSummaryComparison(null);
  }, []);

  const addExperience = useCallback(() => {
    setPayload(prev => {
      const current = prev.experience ?? [];
      if (current.length >= EXPERIENCE_LIMIT) return prev;
      return {
        ...prev,
        experience: [...current, createExperienceEntry()],
      };
    });
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
  }, [experience.length]);

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

  const updateEducationField = useCallback((index: number, field: keyof EducationEntry, value: string) => {
    setPayload(prev => {
      const current = [...(prev.education ?? [])];
      const entry: EducationEntry = { ...createEducationEntry(), ...(current[index] ?? {}) };

      if (!value.trim() && field === 'graduationYear') {
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
  }, []);

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

  const buildSubmissionPayload = useCallback(
    (draft: ResumePayload): ResumePayload => {
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
    },
    [],
  );

  const handleGenerate = useCallback(async () => {
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

      setStatus(null);
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
  }, [buildSubmissionPayload, canPreview, currentStepIndex, payload, persistDraft, skillDraft, template]);

  const handleReset = useCallback(() => {
    setPayload(createDefaultPayload());
    setTemplate(DEFAULT_TEMPLATE);
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
  }, []);

  return {
    // state
    payload,
    setPayload,
    template,
    setTemplate,
    currentStepIndex,
    status,
    skillDraft,
    setSkillDraft,
    bulletsInputs,
    timelineInputs,
    isSummaryRewriting,
    summaryStatus,
    summaryComparison,
    isPreviewLoading,
    previewUrl,
    previewWindowRef,
    // derived
    activeStep,
    hasRequiredContact,
    summaryComplete,
    canPreview,
    stepCompletion,
    progressPercent,
    isFirstStep,
    isLastStep,
    nextStepLabel,
    isActiveStepComplete,
    skillValues,
    experience,
    education,
    canRewriteSummary,
    downloadFilename,
    // actions
    addSkill,
    removeSkill,
    handleSkillDraftCommit,
    handleNextStep,
    handlePreviousStep,
    handleGoToStep,
    handleRewriteSummary,
    handleAcceptSummarySuggestion,
    handleKeepOriginalSummary,
    clearSummaryFeedback,
    addExperience,
    removeExperience,
    moveExperience,
    updateExperienceField,
    addEducation,
    removeEducation,
    moveEducation,
    updateEducationField,
    updateTimelineInput,
    handleGenerate,
    handleReset,
  };
}
