import { useCallback, useMemo } from 'react';
import type { Dispatch, SetStateAction } from 'react';

import type { ResumePayload } from '@/lib/resume/types';
import type { TemplateName } from '@/resume/shared/templates';

import {
  PREVIEW_UNLOCK_STEP_INDEX,
  SUMMARY_MIN_CHARS,
  WIZARD_STEPS,
  type StepKey,
} from '../constants';

type UseWizardNavigationOptions = {
  payload: ResumePayload;
  template: TemplateName | null;
  currentStepIndex: number;
  setCurrentStepIndex: Dispatch<SetStateAction<number>>;
  maxStepReached: number;
  setMaxStepReached: Dispatch<SetStateAction<number>>;
  persistDraft: (
    draft: ResumePayload,
    draftTemplate: TemplateName | null,
    stepIndex: number,
    maxStepIndex?: number,
  ) => void;
  setStatus: Dispatch<SetStateAction<string | null>>;
};

export function useWizardNavigation({
  payload,
  template,
  currentStepIndex,
  setCurrentStepIndex,
  maxStepReached,
  setMaxStepReached,
  persistDraft,
  setStatus,
}: UseWizardNavigationOptions) {
  const activeStep = WIZARD_STEPS[currentStepIndex];
  const hasUnlockedPreviewStep = PREVIEW_UNLOCK_STEP_INDEX >= 0 && maxStepReached >= PREVIEW_UNLOCK_STEP_INDEX;

  const hasRequiredContact = useMemo(() => {
    const name = payload.name.trim();
    const email = payload.email.trim();
    const phone = (payload.phone ?? '').trim();
    const city = (payload.city ?? '').trim();
    const state = (payload.state ?? '').trim();

    if (!name || !email || !phone || !city || !state) return false;
    if (name.length < 2) return false;
    if (city.length < 2) return false;
    if (state.length !== 2) return false;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return false;

    const phoneDigits = phone.replace(/\D/g, '');
    if (phoneDigits.length < 7) return false;

    return true;
  }, [payload]);

  const summaryComplete = useMemo(() => {
    const summary = (payload.summary ?? '').trim();
    return summary.length >= SUMMARY_MIN_CHARS;
  }, [payload.summary]);

  const skillsComplete = useMemo(() => {
    const skills = payload.skills ?? [];
    return skills.length >= 1;
  }, [payload.skills]);

  const canPreview = useMemo(
    () => Boolean(template) && hasRequiredContact && skillsComplete && hasUnlockedPreviewStep,
    [template, hasRequiredContact, skillsComplete, hasUnlockedPreviewStep],
  );

  const stepCompletion = useMemo<Record<StepKey, boolean>>(
    () => ({
      template: Boolean(template),
      contact: hasRequiredContact,
      summary: summaryComplete,
      skills: skillsComplete,
      experience: true,
      education: true,
      preview: canPreview,
    }),
    [canPreview, hasRequiredContact, summaryComplete, skillsComplete, template],
  );

  const progressPercent = useMemo(() => {
    if (WIZARD_STEPS.length <= 1) return 100;
    return Math.round((currentStepIndex / (WIZARD_STEPS.length - 1)) * 100);
  }, [currentStepIndex]);

  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === WIZARD_STEPS.length - 1;
  const nextStepLabel = !isLastStep ? `Next: ${WIZARD_STEPS[currentStepIndex + 1].title}` : 'Next';
  const isActiveStepComplete = stepCompletion[activeStep.key];

  const handleNextStep = useCallback(() => {
    const nextIndex = Math.min(currentStepIndex + 1, WIZARD_STEPS.length - 1);
    const currentKey = WIZARD_STEPS[currentStepIndex]?.key;
    if (currentKey && !stepCompletion[currentKey]) return;
    persistDraft(payload, template, nextIndex, Math.max(maxStepReached, nextIndex));
    setStatus(null);
    setCurrentStepIndex(nextIndex);
    setMaxStepReached(prev => Math.max(prev, nextIndex));
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [
    currentStepIndex,
    maxStepReached,
    payload,
    persistDraft,
    setCurrentStepIndex,
    setMaxStepReached,
    setStatus,
    stepCompletion,
    template,
  ]);

  const handlePreviousStep = useCallback(() => {
    const prevIndex = Math.max(currentStepIndex - 1, 0);
    if (prevIndex === currentStepIndex) return;
    persistDraft(payload, template, prevIndex, maxStepReached);
    setStatus(null);
    setCurrentStepIndex(prevIndex);
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [currentStepIndex, maxStepReached, payload, persistDraft, setCurrentStepIndex, setStatus, template]);

  const handleGoToStep = useCallback(
    (index: number) => {
      if (index < 0 || index >= WIZARD_STEPS.length) return;
      if (index === currentStepIndex) return;
      if (index > maxStepReached) return;
      persistDraft(payload, template, index, maxStepReached);
      setStatus(null);
      setCurrentStepIndex(index);
      if (typeof window !== 'undefined') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    },
    [currentStepIndex, maxStepReached, payload, persistDraft, setCurrentStepIndex, setStatus, template],
  );

  return {
    activeStep,
    hasUnlockedPreviewStep,
    hasRequiredContact,
    summaryComplete,
    skillsComplete,
    canPreview,
    stepCompletion,
    progressPercent,
    isFirstStep,
    isLastStep,
    nextStepLabel,
    isActiveStepComplete,
    handleNextStep,
    handlePreviousStep,
    handleGoToStep,
  };
}
