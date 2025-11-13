import { useRef, useState } from 'react';

import type { TemplateName } from '@/resume/shared/templates';
import {
  usePersistedResumeDraft,
  usePreviewController,
  useResumeDraft,
  useSummaryController,
  useWizardNavigation,
} from './state';

export function useResumeBuilderState() {
  const {
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
  } = useResumeDraft();
  const [template, setTemplate] = useState<TemplateName | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [maxStepReached, setMaxStepReached] = useState(0);
  const [status, setStatus] = useState<string | null>(null);
  const [isSummaryGenerating, setIsSummaryGenerating] = useState(false);
  const [summaryGenerationError, setSummaryGenerationError] = useState<string | null>(null);
  const [lastAttemptedSummaryHash, setLastAttemptedSummaryHash] = useState<string | null>(null);
  const [hasUserEditedSummary, setHasUserEditedSummary] = useState(false);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewSignature, setPreviewSignature] = useState<string | null>(null);
  const previewWindowRef = useRef<Window | null>(null);
  const [shouldPromptSummaryRegenerate, setShouldPromptSummaryRegenerate] = useState(false);
  const [lastPromptedSummaryHash, setLastPromptedSummaryHash] = useState<string | null>(null);

  const { persistDraft, handleReset } = usePersistedResumeDraft({
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
  });

  const {
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
  } = useWizardNavigation({
    payload,
    template,
    currentStepIndex,
    setCurrentStepIndex,
    maxStepReached,
    setMaxStepReached,
    persistDraft,
    setStatus,
  });
  const skillValues = payload.skills ?? [];
  const experience = payload.experience ?? [];
  const education = payload.education ?? [];

  const {
    summaryDetails,
    hasSummaryContextSignal,
    handleUpdateSummary,
    generateSummaryFromProfile,
    handlePromptedSummaryRegenerate,
    dismissSummaryRegeneratePrompt,
  } = useSummaryController({
    payload,
    setPayload,
    activeStepKey: activeStep.key,
    hasUserEditedSummary,
    setHasUserEditedSummary,
    isSummaryGenerating,
    setIsSummaryGenerating,
    summaryGenerationError,
    setSummaryGenerationError,
    shouldPromptSummaryRegenerate,
    setShouldPromptSummaryRegenerate,
    lastAttemptedSummaryHash,
    setLastAttemptedSummaryHash,
    lastPromptedSummaryHash,
    setLastPromptedSummaryHash,
  });



  const { downloadFilename, handleGenerate } = usePreviewController({
    payload,
    setPayload,
    template,
    skillDraft,
    setSkillDraft,
    canPreview,
    hasRequiredContact,
    skillsComplete,
    hasUnlockedPreviewStep,
    persistDraft,
    currentStepIndex,
    maxStepReached,
    previewUrl,
    setPreviewUrl,
    previewSignature,
    setPreviewSignature,
    setIsPreviewLoading,
    setStatus,
    previewWindowRef,
  });

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
    isSummaryGenerating,
    summaryGenerationError,
    summaryDetails,
    hasSummaryContextSignal,
    shouldPromptSummaryRegenerate,
    isPreviewLoading,
    previewUrl,
    previewWindowRef,
    // derived
    activeStep,
    hasRequiredContact,
    hasUnlockedPreviewStep,
    summaryComplete,
    skillsComplete,
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
    downloadFilename,
    // actions
    addSkill,
    removeSkill,
    handleSkillDraftCommit,
    handleNextStep,
    handlePreviousStep,
    handleGoToStep,
    handleUpdateSummary,
    generateSummaryFromProfile,
    handlePromptedSummaryRegenerate,
    dismissSummaryRegeneratePrompt,
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
    maxStepReached,
  };
}
