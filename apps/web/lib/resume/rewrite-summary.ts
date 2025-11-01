import type { SummaryRewriteInput } from '@/resume/server/summary-rewriter';

type RewriteSummaryPayload = SummaryRewriteInput;

export async function rewriteSummary(payload: RewriteSummaryPayload) {
  if (typeof window === 'undefined') {
    throw new Error('rewriteSummary must run in the browser');
  }

  const target = buildEndpoint();
  const res = await fetch(target, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const message = await safeErrorMessage(res);
    throw new Error(message ?? `Summary rewrite failed (${res.status})`);
  }

  const data = await res.json().catch(() => null);
  if (!data || typeof data.summary !== 'string' || !data.summary.trim()) {
    throw new Error('Summary rewrite returned an invalid response');
  }

  return data.summary as string;
}

function buildEndpoint() {
  const rawBase = process.env.NEXT_PUBLIC_RESUME_API_URL ?? '';
  const baseUrl = rawBase.endsWith('/') ? rawBase.slice(0, -1) : rawBase;
  if (!baseUrl) return '/api/resume/summary';
  return `${baseUrl}/api/resume/summary`;
}

async function safeErrorMessage(res: Response) {
  try {
    const data = await res.json();
    if (data && typeof data === 'object') {
      const message =
        (data as any).details ??
        (data as any).error ??
        (data as any).message;
      if (typeof message === 'string') return message;
    }
  } catch {
    // ignore parse errors
  }
  return undefined;
}

// Prompt contract: docs/resume-builder/ai/summary-rewriter.md
