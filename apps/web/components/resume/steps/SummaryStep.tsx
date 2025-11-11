import type { SummaryDisplayContext } from '@/lib/resume/summary-context';

type SummaryStepProps = {
  summary: string;
  onChangeSummary: (value: string) => void;
  summaryHelpId: string;
  isSummaryGenerating: boolean;
  generationError: string | null;
  onRegenerate: () => void;
  contextDetails: SummaryDisplayContext;
  hasContext: boolean;
  showRegeneratePrompt: boolean;
  onConfirmRegeneratePrompt: () => void | Promise<void>;
  onDismissRegeneratePrompt: () => void | Promise<void>;
};

export function SummaryStep({
  summary,
  onChangeSummary,
  summaryHelpId,
  isSummaryGenerating,
  generationError,
  onRegenerate,
  contextDetails,
  hasContext,
  showRegeneratePrompt,
  onConfirmRegeneratePrompt,
  onDismissRegeneratePrompt,
}: SummaryStepProps) {
  const charCount = summary.length;
  const minChars = 12;
  const maxChars = 800;
  const trimmedSummary = summary.trim();
  const showBlockingLoader = isSummaryGenerating && !trimmedSummary && !generationError;
  const regenerateDisabled = isSummaryGenerating || !hasContext;
  const contextExplanation = buildContextExplanation(contextDetails, hasContext);

  if (showBlockingLoader) {
    return (
      <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm" role="status" aria-live="polite">
        <p className="text-base font-semibold text-neutral-900">Hang tight—your summary is on the way.</p>
        <p className="mt-2 text-sm text-neutral-600">
          We&apos;re sending your latest job details, top skills, and education to our assistant. This typically takes
          about 15 seconds.
        </p>
        <p className="mt-2 text-sm text-neutral-500">
          You&apos;ll see a draft based on your most recent role, how long you were there, and the skills you highlighted.
          You can edit or regenerate it once it appears.
        </p>
        <div className="mt-4 flex items-center gap-2 text-sm text-neutral-500">
          <span className="h-3 w-3 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-900" aria-hidden />
          <span>Crafting your summary…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {showRegeneratePrompt && !isSummaryGenerating && (
        <div
          className="rounded-lg border border-brand-primary/40 bg-brand-primary/5 px-4 py-3 text-sm text-slate-800"
          role="alert"
          aria-live="polite"
        >
          <p className="font-semibold text-brand-primary">We noticed you updated your resume details.</p>
          <p className="mt-1 text-slate-700">
            Do you want to refresh the summary so it reflects your latest skills or experience?
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-full bg-brand-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-primary/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2"
              onClick={() => void onConfirmRegeneratePrompt()}
              disabled={isSummaryGenerating}
            >
              Regenerate now
            </button>
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
              onClick={() => void onDismissRegeneratePrompt()}
              disabled={isSummaryGenerating}
            >
              Keep current summary
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-4 md:flex-row md:flex-wrap md:items-start md:justify-between">
        <div className="flex-1">
          <p id={summaryHelpId} className="text-sm text-neutral-500">
            Example: Store clerk with 2 years helping customers. Skilled in cash handling and restocking. Looking for
            full-time retail work.
          </p>
        </div>
        <button
          type="button"
          className="inline-flex items-center justify-center rounded-full bg-brand-primary px-5 py-2 text-xs font-semibold uppercase tracking-wide text-white shadow-sm transition hover:bg-brand-primary/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-brand-primary/40 md:flex-shrink-0"
          onClick={onRegenerate}
          disabled={regenerateDisabled}
          title={
            hasContext
              ? isSummaryGenerating
                ? 'Generating a new draft...'
                : 'Create a fresh AI summary'
              : 'Add a job, skills, or education before generating a summary'
          }
        >
          {isSummaryGenerating ? 'Generating…' : 'Regenerate summary'}
        </button>
      </div>

      {!hasContext && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900" role="note">
          Add at least one job, a few skills, or an education entry so we can create a draft automatically. You can still
          type your own summary below.
        </p>
      )}

      {contextExplanation && (
        <div className="rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-700">
          <p>{contextExplanation}</p>
          <p className="mt-1 text-xs text-neutral-500">
            Reading level: {contextDetails.readingLevel || '8th grade'}.
          </p>
        </div>
      )}

      {generationError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900" role="alert">
          <p>{generationError}</p>
          <button
            type="button"
            className="mt-2 inline-flex items-center gap-1 rounded border border-red-300 px-3 py-1 text-xs font-semibold text-red-900 transition hover:border-red-400"
            onClick={onRegenerate}
            disabled={isSummaryGenerating}
          >
            Try again
          </button>
        </div>
      )}

      <div className="relative">
        <textarea
          className="min-h-[7.5rem] w-full rounded-lg border-2 border-neutral-300 px-4 py-3 text-base text-neutral-900 shadow-sm transition focus:border-civic-green focus:outline-none focus:ring-4 focus:ring-civic-green/30 disabled:bg-neutral-100"
          value={summary}
          onChange={event => onChangeSummary(event.target.value)}
          placeholder=""
          aria-busy={isSummaryGenerating}
          aria-describedby={summaryHelpId}
          maxLength={maxChars}
          title="Write 2-3 sentences about your experience"
          spellCheck="true"
          disabled={isSummaryGenerating}
        />
        <div className="mt-1 text-xs text-neutral-500">
          {charCount < minChars ? (
            <span className="text-amber-600">
              {charCount} characters (need {minChars - charCount} more)
            </span>
          ) : (
            <span>
              {charCount} of {maxChars}
            </span>
          )}
        </div>
      </div>

      <p className="text-xs text-neutral-500">
        Write 2-3 sentences. Don&apos;t use &quot;I&quot; or &quot;my&quot;. Start sentences with your job or skill. Feel free to
        rewrite anything the assistant suggested.
      </p>
    </div>
  );
}

function buildContextExplanation(details: SummaryDisplayContext, hasContext: boolean) {
  if (!hasContext) return null;
  const parts: string[] = [];
  if (details.roleTitle || details.roleEmployer) {
    const roleBits = [
      details.roleTitle ? `as ${details.roleTitle}` : null,
      details.roleEmployer ? `at ${details.roleEmployer}` : null,
    ]
      .filter(Boolean)
      .join(' ');
    const tenure = details.tenureLabel ? ` for about ${details.tenureLabel}` : '';
    parts.push(`your recent role ${roleBits}${tenure}`.trim());
  }
  if (details.skills.length) {
    parts.push(`your top skills (${details.skills.join(', ')})`);
  }
  if (details.educationLabels.length) {
    parts.push(`your ${details.educationLabels.join(', ')}`);
  } else {
    parts.push('an 8th grade reading level so it stays easy to read');
  }

  if (!parts.length) {
    return 'We generated this summary using the information from your earlier steps. You can edit or replace anything you like.';
  }

  const listed = formatList(parts);
  return `We generated this summary using ${listed}. Feel free to edit or regenerate it anytime.`;
}

function formatList(items: string[]) {
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  const allButLast = items.slice(0, -1).join(', ');
  const last = items[items.length - 1];
  return `${allButLast}, and ${last}`;
}
