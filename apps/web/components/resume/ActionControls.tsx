import type { ReactNode } from 'react';

type ActionControlsProps = {
  canPreview: boolean;
  isPreviewLoading: boolean;
  onGenerate: () => void;
  previewUrl: string | null;
  downloadFilename: string;
  buttonsHelpId: string;
  status: string | null;
  onReset: () => void;
  leadingActions?: ReactNode;
};

export function ActionControls({
  canPreview,
  isPreviewLoading,
  onGenerate,
  previewUrl,
  downloadFilename,
  buttonsHelpId,
  status,
  onReset,
  leadingActions,
}: ActionControlsProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3 pb-1 md:flex-nowrap md:pb-0">
        {leadingActions}
        <button
          type="button"
          onClick={onGenerate}
          disabled={!canPreview || isPreviewLoading}
          className="flex-shrink-0 rounded-full bg-emerald-600 px-6 py-3 text-base font-semibold text-white whitespace-nowrap shadow-sm transition hover:bg-emerald-700 focus:outline-none focus:ring-4 focus:ring-emerald-200 disabled:cursor-not-allowed disabled:bg-emerald-200 disabled:text-emerald-700"
          aria-describedby={buttonsHelpId}
          title="Open a PDF preview in a new tab"
        >
          {isPreviewLoading ? 'Opening Preview…' : 'Preview Resume'}
        </button>
        {previewUrl && (
          <a
            href={previewUrl}
            download={downloadFilename}
            className="inline-flex flex-shrink-0 items-center justify-center rounded-full border-2 border-emerald-600 px-6 py-3 text-base font-semibold text-emerald-700 whitespace-nowrap transition hover:border-emerald-700 hover:text-emerald-900 focus:outline-none focus:ring-4 focus:ring-emerald-200"
            title="Download the generated PDF"
          >
            Download PDF
          </a>
        )}
        <button
          type="button"
          onClick={onReset}
          className="flex-shrink-0 rounded-full border-2 border-neutral-300 px-6 py-3 text-base font-semibold text-neutral-700 whitespace-nowrap transition hover:border-neutral-500 hover:text-neutral-900 focus:outline-none focus:ring-4 focus:ring-neutral-300"
          title="Clear all fields and start over"
        >
          Reset All
        </button>
      </div>
      <div className="text-sm text-neutral-600">
        <p id={buttonsHelpId}>
          Preview opens in a new tab. Download saves as <span className="font-mono">{downloadFilename}</span>.
        </p>
        {status && (
          <p className="mt-1 text-sm text-neutral-700" role="status" aria-live="polite">
            {status}
          </p>
        )}
      </div>
    </div>
  );
}
