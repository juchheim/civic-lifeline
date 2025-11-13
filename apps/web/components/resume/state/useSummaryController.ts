import { useCallback, useEffect, useMemo } from 'react';
import type { Dispatch, SetStateAction } from 'react';

import { rewriteSummary } from '@/lib/resume/rewrite-summary';
import { buildSummaryContext, hashSummaryContext } from '@/lib/resume/summary-context';
import type { ResumePayload } from '@/lib/resume/types';

import type { StepKey } from '../constants';

type UseSummaryControllerOptions = {
  payload: ResumePayload;
  setPayload: Dispatch<SetStateAction<ResumePayload>>;
  activeStepKey: StepKey;
  hasUserEditedSummary: boolean;
  setHasUserEditedSummary: Dispatch<SetStateAction<boolean>>;
  isSummaryGenerating: boolean;
  setIsSummaryGenerating: Dispatch<SetStateAction<boolean>>;
  summaryGenerationError: string | null;
  setSummaryGenerationError: Dispatch<SetStateAction<string | null>>;
  shouldPromptSummaryRegenerate: boolean;
  setShouldPromptSummaryRegenerate: Dispatch<SetStateAction<boolean>>;
  lastAttemptedSummaryHash: string | null;
  setLastAttemptedSummaryHash: Dispatch<SetStateAction<string | null>>;
  lastPromptedSummaryHash: string | null;
  setLastPromptedSummaryHash: Dispatch<SetStateAction<string | null>>;
};

export function useSummaryController({
  payload,
  setPayload,
  activeStepKey,
  hasUserEditedSummary,
  setHasUserEditedSummary,
  isSummaryGenerating,
  setIsSummaryGenerating,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  summaryGenerationError,
  setSummaryGenerationError,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  shouldPromptSummaryRegenerate,
  setShouldPromptSummaryRegenerate,
  lastAttemptedSummaryHash,
  setLastAttemptedSummaryHash,
  lastPromptedSummaryHash,
  setLastPromptedSummaryHash,
}: UseSummaryControllerOptions) {
  const summaryContext = useMemo(() => buildSummaryContext(payload), [payload]);
  const summaryContextHash = useMemo(() => hashSummaryContext(summaryContext.request), [summaryContext]);
  const summaryHasContent = Boolean((payload.summary ?? '').trim());
  const summaryDetails = summaryContext.display;
  const hasSummaryContextSignal = useMemo(
    () =>
      Boolean(
        summaryContext.request.recentRole?.title ||
          summaryContext.request.recentRole?.employer ||
          summaryContext.request.recentRole?.tenureLabel ||
          summaryContext.request.topSkills.length ||
          summaryContext.request.highestEducation,
      ),
    [summaryContext.request],
  );

  const clearSummaryGenerationError = useCallback(() => {
    setSummaryGenerationError(null);
  }, [setSummaryGenerationError]);

  const handleUpdateSummary = useCallback(
    (value: string) => {
      setHasUserEditedSummary(true);
      clearSummaryGenerationError();
      setPayload(prev => ({ ...prev, summary: value }));
    },
    [clearSummaryGenerationError, setHasUserEditedSummary, setPayload],
  );

  const generateSummaryFromProfile = useCallback(async () => {
    if (isSummaryGenerating) return false;
    setLastAttemptedSummaryHash(summaryContextHash);
    if (!hasSummaryContextSignal) {
      setSummaryGenerationError('Add a recent role, skills, or education before generating a summary.');
      return false;
    }
    setIsSummaryGenerating(true);
    setSummaryGenerationError(null);
    try {
      const aiSummary = await rewriteSummary(summaryContext.request);
      setPayload(prev => ({ ...prev, summary: aiSummary }));
      setHasUserEditedSummary(false);
      setShouldPromptSummaryRegenerate(false);
      setLastPromptedSummaryHash(summaryContextHash);
      return true;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'We could not generate your summary. Please try again.';
      setSummaryGenerationError(message);
      return false;
    } finally {
      setIsSummaryGenerating(false);
    }
  }, [
    hasSummaryContextSignal,
    isSummaryGenerating,
    setHasUserEditedSummary,
    setIsSummaryGenerating,
    setLastAttemptedSummaryHash,
    setLastPromptedSummaryHash,
    setPayload,
    setShouldPromptSummaryRegenerate,
    setSummaryGenerationError,
    summaryContext.request,
    summaryContextHash,
  ]);

  const handlePromptedSummaryRegenerate = useCallback(async () => {
    const success = await generateSummaryFromProfile();
    if (success) {
      setShouldPromptSummaryRegenerate(false);
      setLastPromptedSummaryHash(summaryContextHash);
    }
  }, [generateSummaryFromProfile, setLastPromptedSummaryHash, setShouldPromptSummaryRegenerate, summaryContextHash]);

  const dismissSummaryRegeneratePrompt = useCallback(() => {
    setShouldPromptSummaryRegenerate(false);
    setLastPromptedSummaryHash(summaryContextHash);
  }, [setLastPromptedSummaryHash, setShouldPromptSummaryRegenerate, summaryContextHash]);

  const shouldAutoGenerateSummary =
    activeStepKey === 'summary' &&
    summaryContextHash !== lastAttemptedSummaryHash &&
    !isSummaryGenerating &&
    !hasUserEditedSummary &&
    !summaryHasContent;

  useEffect(() => {
    if (!shouldAutoGenerateSummary) return;
    let cancelled = false;
    const run = async () => {
      try {
        await generateSummaryFromProfile();
      } catch {
        // handled inside generateSummaryFromProfile
      }
      if (cancelled) return;
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [generateSummaryFromProfile, shouldAutoGenerateSummary]);

  useEffect(() => {
    if (activeStepKey !== 'summary') return;
    if (!hasSummaryContextSignal) return;
    if (isSummaryGenerating) return;
    if (!summaryHasContent) return;
    if (summaryContextHash === lastAttemptedSummaryHash) return;
    if (lastPromptedSummaryHash === summaryContextHash) return;
    setShouldPromptSummaryRegenerate(true);
    setLastPromptedSummaryHash(summaryContextHash);
  }, [
    activeStepKey,
    hasSummaryContextSignal,
    isSummaryGenerating,
    summaryHasContent,
    summaryContextHash,
    lastAttemptedSummaryHash,
    lastPromptedSummaryHash,
    setLastPromptedSummaryHash,
    setShouldPromptSummaryRegenerate,
  ]);

  useEffect(() => {
    if (activeStepKey !== 'summary') {
      setShouldPromptSummaryRegenerate(false);
    }
  }, [activeStepKey, setShouldPromptSummaryRegenerate]);

  return {
    summaryDetails,
    hasSummaryContextSignal,
    handleUpdateSummary,
    generateSummaryFromProfile,
    handlePromptedSummaryRegenerate,
    dismissSummaryRegeneratePrompt,
  };
}
