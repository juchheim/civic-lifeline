import { useCallback, useEffect, useMemo } from 'react';
import type { Dispatch, MutableRefObject, SetStateAction } from 'react';

import type { ResumePayload } from '@/lib/resume/types';
import { formatPhoneNumber, normalizeSkillLabel } from '@/lib/resume/utils/format';
import { buildResumeFilename } from '@/resume/shared/filename';
import type { TemplateName } from '@/resume/shared/templates';

import { DEFAULT_TEMPLATE, MAX_SKILLS } from '../constants';
import { buildSubmissionPayload } from './utils/payload';
import { computePreviewSignature } from './utils/signature';

type PersistDraftFn = (
  draft: ResumePayload,
  draftTemplate: TemplateName | null,
  stepIndex: number,
  maxStepIndex?: number,
) => void;

type UsePreviewControllerOptions = {
  payload: ResumePayload;
  setPayload: Dispatch<SetStateAction<ResumePayload>>;
  template: TemplateName | null;
  skillDraft: string;
  setSkillDraft: Dispatch<SetStateAction<string>>;
  canPreview: boolean;
  hasRequiredContact: boolean;
  skillsComplete: boolean;
  hasUnlockedPreviewStep: boolean;
  persistDraft: PersistDraftFn;
  currentStepIndex: number;
  maxStepReached: number;
  previewUrl: string | null;
  setPreviewUrl: Dispatch<SetStateAction<string | null>>;
  previewSignature: string | null;
  setPreviewSignature: Dispatch<SetStateAction<string | null>>;
  setIsPreviewLoading: Dispatch<SetStateAction<boolean>>;
  setStatus: Dispatch<SetStateAction<string | null>>;
  previewWindowRef: MutableRefObject<Window | null>;
};

export function usePreviewController({
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
}: UsePreviewControllerOptions) {
  const downloadFilename = useMemo(
    () => buildResumeFilename(payload.name, template ?? DEFAULT_TEMPLATE),
    [payload.name, template],
  );

  const normalizedPayloadForSignature = useMemo(
    () => buildSubmissionPayload(payload),
    [payload],
  );

  const currentDraftSignature = useMemo(
    () => computePreviewSignature(normalizedPayloadForSignature, template),
    [normalizedPayloadForSignature, template],
  );

  useEffect(() => {
    if (!previewSignature) return;
    if (previewSignature === currentDraftSignature) return;
    setPreviewUrl(null);
    setPreviewSignature(null);
  }, [currentDraftSignature, previewSignature, setPreviewSignature, setPreviewUrl]);

  const handleGenerate = useCallback(
    async (mode: 'preview' | 'download' = 'preview') => {
      if (!canPreview) {
        if (!template) {
          setStatus('Select a template before previewing.');
        } else if (!hasRequiredContact) {
          setStatus('Please complete your contact details before previewing.');
        } else if (!skillsComplete) {
          setStatus('Add at least one skill before previewing.');
        } else if (!hasUnlockedPreviewStep) {
          setStatus('Keep going—preview unlocks after the Skills step.');
        }
        return null;
      }

      const triggerDownload = (url: string) => {
        if (typeof window === 'undefined') return;
        const link = document.createElement('a');
        link.href = url;
        link.download = downloadFilename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      };

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
      const submissionSignature = computePreviewSignature(submissionPayload, template);

      if (mode === 'download' && previewUrl && previewSignature && previewSignature === submissionSignature) {
        triggerDownload(previewUrl);
        return previewUrl;
      }

      persistDraft(submissionPayload, template, currentStepIndex, maxStepReached);
      setStatus(mode === 'preview' ? 'Generating PDF preview...' : 'Preparing download...');
      setIsPreviewLoading(true);
      if (mode === 'preview') {
        setPreviewUrl(null);
      }

      let openedWindow: Window | null = null;
      if (mode === 'preview' && typeof window !== 'undefined') {
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
        setPreviewSignature(submissionSignature);

        if (mode === 'preview') {
          if (previewWindowRef.current && !previewWindowRef.current.closed) {
            previewWindowRef.current.location.href = absoluteUrl;
          } else if (typeof window !== 'undefined') {
            window.open(absoluteUrl, '_blank');
          }
        } else {
          triggerDownload(absoluteUrl);
        }

        setStatus(null);
        return absoluteUrl;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to generate PDF.';
        setStatus(message);
        if (previewWindowRef.current && !previewWindowRef.current.closed) {
          previewWindowRef.current.close();
        }
        previewWindowRef.current = null;
        return null;
      } finally {
        setIsPreviewLoading(false);
      }
    },
    [
      canPreview,
      currentStepIndex,
      downloadFilename,
      hasRequiredContact,
      skillsComplete,
      hasUnlockedPreviewStep,
      maxStepReached,
      payload,
      persistDraft,
      previewSignature,
      previewUrl,
      skillDraft,
      template,
      setPayload,
      setPreviewSignature,
      setPreviewUrl,
      setSkillDraft,
      setStatus,
      setIsPreviewLoading,
      previewWindowRef,
    ],
  );

  return {
    downloadFilename,
    handleGenerate,
  };
}
