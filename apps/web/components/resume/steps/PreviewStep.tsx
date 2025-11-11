import { WIZARD_STEPS, type StepKey } from '../constants';

type PreviewStepProps = {
  stepCompletion: Record<StepKey, boolean>;
  previewUrl: string | null;
  onGoToStep: (stepIndex: number) => void;
};

export function PreviewStep({ stepCompletion, previewUrl, onGoToStep }: PreviewStepProps) {
  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
        <p className="text-lg text-neutral-700">
          Almost done! Use the checklist below to make sure everything is ready. You can jump back to any step.
        </p>
      </div>
      <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {WIZARD_STEPS.slice(0, -1).map((step, index) => {
          if (step.key === 'preview') return null;
          const isComplete = stepCompletion[step.key];
          return (
            <li key={step.key} className="h-full">
              <button
                type="button"
                onClick={() => onGoToStep(index)}
                className={`flex h-full w-full items-center justify-between rounded-lg border px-4 py-3 text-left transition hover:shadow-sm focus:outline-none focus:ring-4 focus:ring-brand-primary/30 ${
                  isComplete ? 'border-brand-primary bg-brand-primary/5 text-brand-primary' : 'border-neutral-200 bg-white text-neutral-700'
                }`}
              >
                <div>
                  <span className="text-base font-semibold">{step.title}</span>
                  <p className="text-sm">{step.description}</p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-sm font-semibold ${
                    isComplete ? 'bg-brand-primary text-white' : 'bg-neutral-200 text-neutral-600'
                  }`}
                >
                  {isComplete ? 'Ready' : 'Needs attention'}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      {previewUrl && (
        <div className="rounded-lg border border-brand-primary/20 bg-brand-primary/5 p-4 text-neutral-800">
          <p className="text-base font-semibold">Your latest preview is ready.</p>
          <p className="mt-1 text-sm">
            Open the preview to double-check layout or use the download button below to save the PDF.
          </p>
        </div>
      )}
    </div>
  );
}
