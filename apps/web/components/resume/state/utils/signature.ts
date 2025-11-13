import type { ResumePayload } from '@/lib/resume/types';
import type { TemplateName } from '@/resume/shared/templates';

export const computePreviewSignature = (
  draft: ResumePayload,
  draftTemplate: TemplateName | null,
) =>
  JSON.stringify({
    template: draftTemplate ?? null,
    payload: draft,
  });
