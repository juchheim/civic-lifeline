import type { TemplateName } from '@/resume/shared/templates';
import type { ResumePayload } from './types';

export type { TemplateName } from '@/resume/shared/templates';

export async function downloadPdf(payload: ResumePayload, template: TemplateName) {
  if (typeof window === 'undefined') {
    throw new Error('downloadPdf must run in the browser');
  }

  const rawBase = process.env.NEXT_PUBLIC_RESUME_API_URL ?? '';
  const baseUrl = rawBase.endsWith('/') ? rawBase.slice(0, -1) : rawBase;
  const target = `${baseUrl}/api/pdf?template=${encodeURIComponent(template)}`;

  const res = await fetch(target, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const message = await safeErrorMessage(res);
    throw new Error(message ?? `PDF generation failed (${res.status})`);
  }

  const blob = await res.blob();
  if (blob.size < 1024) {
    throw new Error('PDF looks suspiciously small (< 1KB)');
  }

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `resume-${template}.pdf`;
  anchor.rel = 'noopener';
  anchor.click();
  URL.revokeObjectURL(url);
}

async function safeErrorMessage(res: Response) {
  try {
    const data = await res.json();
    if (typeof data?.error === 'string') return data.error;
  } catch {
    // ignore parse errors
  }
  return undefined;
}
