import { useCallback, useEffect } from 'react';
import type { Dispatch, MutableRefObject, SetStateAction } from 'react';

import { formatPhoneNumber } from '@/lib/resume/utils/format';
import { splitTimeline } from '@/lib/resume/utils/timeline';
import type { ResumePayload } from '@/lib/resume/types';
import type { TemplateName } from '@/resume/shared/templates';
import { TEMPLATES } from '@/resume/shared/templates';

import {
  createDefaultPayload,
  STORAGE_KEY,
  STORAGE_VERSION,
  WIZARD_STEPS,
  type StepKey,
} from '../constants';
import type { TimelineDraft } from './types';

type UsePersistedResumeDraftOptions = {
  payload: ResumePayload;
  template: TemplateName | null;
  currentStepIndex: number;
  maxStepReached: number;
  hasUserEditedSummary: boolean;
  setPayload: Dispatch<SetStateAction<ResumePayload>>;
  setTemplate: Dispatch<SetStateAction<TemplateName | null>>;
  setCurrentStepIndex: Dispatch<SetStateAction<number>>;
  setMaxStepReached: Dispatch<SetStateAction<number>>;
  setSkillDraft: Dispatch<SetStateAction<string>>;
  setBulletsInputs: Dispatch<SetStateAction<string[]>>;
  setTimelineInputs: Dispatch<SetStateAction<TimelineDraft[]>>;
  setHasUserEditedSummary: Dispatch<SetStateAction<boolean>>;
  setSummaryGenerationError: Dispatch<SetStateAction<string | null>>;
  setIsSummaryGenerating: Dispatch<SetStateAction<boolean>>;
  setLastAttemptedSummaryHash: Dispatch<SetStateAction<string | null>>;
  setPreviewUrl: Dispatch<SetStateAction<string | null>>;
  setPreviewSignature: Dispatch<SetStateAction<string | null>>;
  setIsPreviewLoading: Dispatch<SetStateAction<boolean>>;
  previewWindowRef: MutableRefObject<Window | null>;
  setStatus: Dispatch<SetStateAction<string | null>>;
};

export function usePersistedResumeDraft({
  payload,
  template,
  currentStepIndex,
  maxStepReached,
  hasUserEditedSummary,
  setPayload,
  setTemplate,
  setCurrentStepIndex,
  setMaxStepReached,
  setSkillDraft,
  setBulletsInputs,
  setTimelineInputs,
  setHasUserEditedSummary,
  setSummaryGenerationError,
  setIsSummaryGenerating,
  setLastAttemptedSummaryHash,
  setPreviewUrl,
  setPreviewSignature,
  setIsPreviewLoading,
  previewWindowRef,
  setStatus,
}: UsePersistedResumeDraftOptions) {
  const persistDraft = useCallback(
    (draft: ResumePayload, draftTemplate: TemplateName | null, stepIndex: number, maxStepIndex?: number) => {
      if (typeof window === 'undefined') return;
      const clampIndex = (index: number) => Math.min(Math.max(index, 0), WIZARD_STEPS.length - 1);
      const safeIndex = clampIndex(stepIndex);
      const safeMaxIndex = clampIndex(typeof maxStepIndex === 'number' ? maxStepIndex : stepIndex);
      const record = {
        version: STORAGE_VERSION,
        payload: draft,
        template: draftTemplate ?? null,
        step: WIZARD_STEPS[safeIndex]?.key ?? 'template',
        maxStep: WIZARD_STEPS[safeMaxIndex]?.key ?? WIZARD_STEPS[safeIndex]?.key ?? 'template',
        summaryEdited: hasUserEditedSummary,
      };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
    },
    [hasUserEditedSummary],
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const clearStoredDraft = () => {
      try {
        window.localStorage.removeItem(STORAGE_KEY);
      } catch {
        // ignore
      }
    };
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as unknown;

      if (!parsed || typeof parsed !== 'object' || !('payload' in parsed)) {
        clearStoredDraft();
        return;
      }

      const record = parsed as {
        version?: number;
        payload?: ResumePayload;
        template?: TemplateName;
        step?: StepKey;
        maxStep?: StepKey;
        summaryEdited?: boolean;
      };

      if (typeof record.version !== 'number' || record.version !== STORAGE_VERSION) {
        clearStoredDraft();
        return;
      }

      if (!record.payload || typeof record.payload !== 'object') {
        clearStoredDraft();
        return;
      }

      let storedTemplate: TemplateName | null = null;
      let storedStep: StepKey | null = null;
      let storedMaxStep: StepKey | null = null;

      const normalized: ResumePayload = {
        ...createDefaultPayload(),
        ...record.payload,
      };
      if (normalized.phone) {
        normalized.phone = formatPhoneNumber(normalized.phone);
      }
      if (!normalized.summary) {
        normalized.summary = '';
      }

      if (normalized.location && !normalized.city && !normalized.state) {
        const locationParts = normalized.location.split(',').map(part => part.trim());
        if (locationParts.length >= 2) {
          normalized.city = locationParts[0];
          normalized.state = locationParts[1].toUpperCase().slice(0, 2);
        } else if (locationParts.length === 1) {
          normalized.city = locationParts[0];
        }
      }

      setPayload(normalized);
      setSkillDraft('');
      const storedSummaryEdited = typeof record.summaryEdited === 'boolean' ? record.summaryEdited : null;
      setHasUserEditedSummary(storedSummaryEdited ?? Boolean((normalized.summary ?? '').trim()));

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

      if (record.template && (TEMPLATES as ReadonlyArray<string>).includes(record.template)) {
        storedTemplate = record.template;
      }
      if (storedTemplate) {
        setTemplate(storedTemplate);
      }

      let storedStepIndex: number | null = null;
      if (record.step && WIZARD_STEPS.some(step => step.key === record.step)) {
        storedStep = record.step;
      }
      if (storedStep) {
        const index = WIZARD_STEPS.findIndex(step => step.key === storedStep);
        if (index >= 0) {
          setCurrentStepIndex(index);
          storedStepIndex = index;
        }
      }

      let storedMaxStepIndex: number | null = null;
      if (record.maxStep && WIZARD_STEPS.some(step => step.key === record.maxStep)) {
        storedMaxStep = record.maxStep;
      }
      if (storedMaxStep) {
        const index = WIZARD_STEPS.findIndex(step => step.key === storedMaxStep);
        if (index >= 0) {
          storedMaxStepIndex = index;
        }
      }

      const derivedMaxIndex = Math.max(storedMaxStepIndex ?? -1, storedStepIndex ?? -1, 0);
      setMaxStepReached(derivedMaxIndex);
    } catch {
      clearStoredDraft();
    }
  }, [
    setBulletsInputs,
    setCurrentStepIndex,
    setHasUserEditedSummary,
    setMaxStepReached,
    setPayload,
    setSkillDraft,
    setTemplate,
    setTimelineInputs,
  ]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const timer = window.setTimeout(() => {
      persistDraft(payload, template, currentStepIndex, maxStepReached);
    }, 600);
    return () => window.clearTimeout(timer);
  }, [payload, template, currentStepIndex, maxStepReached, persistDraft]);

  const handleReset = useCallback(() => {
    if (typeof window === 'undefined') return;

    const confirmed = window.confirm(
      'Are you sure you want to delete everything? This cannot be undone.\n\nClick OK to clear all fields and start over, or Cancel to keep your work.',
    );

    if (!confirmed) return;

    setPayload(createDefaultPayload());
    setTemplate(null);
    setCurrentStepIndex(0);
    setMaxStepReached(0);
    setSkillDraft('');
    setBulletsInputs([]);
    setTimelineInputs([]);
    setStatus('Cleared the draft.');
    setSummaryGenerationError(null);
    setIsSummaryGenerating(false);
    setLastAttemptedSummaryHash(null);
    setHasUserEditedSummary(false);
    setPreviewUrl(null);
    setPreviewSignature(null);
    setIsPreviewLoading(false);
    if (previewWindowRef.current && !previewWindowRef.current.closed) {
      previewWindowRef.current.close();
    }
    previewWindowRef.current = null;
    window.localStorage.removeItem(STORAGE_KEY);
  }, [
    previewWindowRef,
    setBulletsInputs,
    setCurrentStepIndex,
    setHasUserEditedSummary,
    setIsPreviewLoading,
    setIsSummaryGenerating,
    setLastAttemptedSummaryHash,
    setMaxStepReached,
    setPayload,
    setPreviewSignature,
    setPreviewUrl,
    setSkillDraft,
    setStatus,
    setSummaryGenerationError,
    setTemplate,
    setTimelineInputs,
  ]);

  return { persistDraft, handleReset };
}
