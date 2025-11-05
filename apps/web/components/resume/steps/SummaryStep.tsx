import { useMemo } from 'react';

import { diffWords } from '@/lib/resume/utils/diff';


type SummaryStatus = { kind: 'success' | 'error'; message: string } | null;

type SummaryComparison = { original: string; suggestion: string } | null;

type SummaryStepProps = {
  summary: string;
  onChangeSummary: (value: string) => void;
  summaryHelpId: string;
  isSummaryRewriting: boolean;
  canRewriteSummary: boolean;
  onRewriteSummary: () => void;
  summaryStatus: SummaryStatus;
  onClearFeedback: () => void;
  comparison: SummaryComparison;
  onAcceptSuggestion: (suggestion: string) => void;
  onKeepOriginal: (original: string) => void;
};

export function SummaryStep({
  summary,
  onChangeSummary,
  summaryHelpId,
  isSummaryRewriting,
  canRewriteSummary,
  onRewriteSummary,
  summaryStatus,
  onClearFeedback,
  comparison,
  onAcceptSuggestion,
  onKeepOriginal,
}: SummaryStepProps) {
  const charCount = summary.length;
  const minChars = 12;
  const maxChars = 800;
  
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-4 md:flex-row md:flex-wrap md:items-start md:justify-between">
        <div className="flex-1 hidden md:block">
          <p id={summaryHelpId} className="text-lg text-neutral-600">
            Use this space to tell employers what you bring to the job.
          </p>
          <p className="mt-2 text-sm text-neutral-500">
            Example: Store clerk with 2 years helping customers. Skilled in cash handling and restocking. Looking for full-time retail work.
          </p>
        </div>
        <button
          type="button"
          className="rounded-full bg-neutral-900 px-4 py-2 text-sm font-semibold uppercase tracking-wide text-white transition hover:bg-neutral-800 focus:outline-none focus:ring-4 focus:ring-neutral-300 disabled:cursor-not-allowed disabled:bg-neutral-400 md:flex-shrink-0"
          onClick={onRewriteSummary}
          disabled={isSummaryRewriting || !canRewriteSummary}
          title="Let the assistant polish your summary"
        >
          {isSummaryRewriting ? 'Rewriting…' : 'Rewrite with AI'}
        </button>
      </div>
      <div className="relative">
        <textarea
          className="h-48 w-full rounded-lg border-2 border-neutral-300 px-4 py-3 text-base text-neutral-900 shadow-sm transition focus:border-civic-green focus:outline-none focus:ring-4 focus:ring-civic-green/30"
          value={summary}
          onChange={event => {
            onClearFeedback();
            onChangeSummary(event.target.value);
          }}
          placeholder=""
          aria-busy={isSummaryRewriting}
          aria-describedby={summaryHelpId}
          maxLength={maxChars}
          title="Write 2-3 sentences about your experience"
          spellCheck="true"
        />
        <div className="mt-1 text-xs text-neutral-500">
          {charCount < minChars ? (
            <span className="text-amber-600">{charCount} characters (need {minChars - charCount} more)</span>
          ) : (
            <span>{charCount} of {maxChars}</span>
          )}
        </div>
      </div>
      {summaryStatus && (
        <span
          className={`text-sm ${summaryStatus.kind === 'error' ? 'text-red-600' : 'text-neutral-700'}`}
          role="status"
          aria-live="polite"
        >
          {summaryStatus.message}
        </span>
      )}
      <p className="text-xs text-neutral-500">
        Write 2-3 sentences. Don&apos;t use &quot;I&quot; or &quot;my&quot;. Start sentences with your job or skill.
      </p>
      {comparison && (
        <SummaryReview
          original={comparison.original}
          suggestion={comparison.suggestion}
          onKeep={() => onKeepOriginal(comparison.original)}
          onAccept={() => onAcceptSuggestion(comparison.suggestion)}
        />
      )}
    </div>
  );
}

function SummaryReview({
  original,
  suggestion,
  onAccept,
  onKeep,
}: {
  original: string;
  suggestion: string;
  onAccept: () => void;
  onKeep: () => void;
}) {
  const diff = useMemo(() => diffWords(original, suggestion), [original, suggestion]);

  const originalNodes = useMemo(
    () =>
      diff.map((segment, index) => {
        if (segment.type === 'added') {
          return null;
        }
        if (segment.type === 'removed') {
          return (
            <span key={`orig-${index}`} className="bg-yellow-100 line-through decoration-2 decoration-yellow-500">
              {segment.value}
            </span>
          );
        }
        return <span key={`orig-${index}`}>{segment.value}</span>;
      }),
    [diff],
  );

  const suggestionNodes = useMemo(
    () =>
      diff.map((segment, index) => {
        if (segment.type === 'removed') {
          return null;
        }
        if (segment.type === 'added') {
          return (
            <span key={`new-${index}`} className="rounded bg-green-100 px-0.5 text-neutral-900">
              {segment.value}
            </span>
          );
        }
        return <span key={`new-${index}`}>{segment.value}</span>;
      }),
    [diff],
  );

  return (
    <div className="mt-3 rounded border border-neutral-200 bg-white p-3 shadow-sm">
      <div className="flex flex-col gap-4 md:flex-row">
        <div className="flex-1">
          <h4 className="text-sm font-semibold text-neutral-700">Current summary</h4>
          <p className="mt-1 whitespace-pre-wrap text-sm text-neutral-700">{originalNodes}</p>
        </div>
        <div className="flex-1">
          <h4 className="text-sm font-semibold text-neutral-700">AI suggestion</h4>
          <p className="mt-1 whitespace-pre-wrap text-sm text-neutral-700">{suggestionNodes}</p>
        </div>
      </div>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:justify-end">
        <button
          type="button"
          className="rounded border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-700 transition hover:border-neutral-500 hover:text-neutral-900"
          onClick={onKeep}
        >
          Keep original
        </button>
        <button
          type="button"
          className="rounded bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-neutral-800"
          onClick={onAccept}
        >
          Use AI suggestion
        </button>
      </div>
    </div>
  );
}
