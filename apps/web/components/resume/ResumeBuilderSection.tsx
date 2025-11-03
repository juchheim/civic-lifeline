'use client';

import { useEffect, useId } from 'react';
import { useResumeBuilderState } from './useResumeBuilderState';
import { WIZARD_STEPS, EXPERIENCE_LIMIT, EDUCATION_LIMIT } from './constants';
import { TemplateStep } from './steps/TemplateStep';
import { ContactStep } from './steps/ContactStep';
import { SummaryStep } from './steps/SummaryStep';
import { SkillsStep } from './steps/SkillsStep';
import { ExperienceStep } from './steps/ExperienceStep';
import { EducationStep } from './steps/EducationStep';
import { PreviewStep } from './steps/PreviewStep';

const MONTH_OPTIONS = [
  { value: '01', label: 'Jan' },
  { value: '02', label: 'Feb' },
  { value: '03', label: 'Mar' },
  { value: '04', label: 'Apr' },
  { value: '05', label: 'May' },
  { value: '06', label: 'Jun' },
  { value: '07', label: 'Jul' },
  { value: '08', label: 'Aug' },
  { value: '09', label: 'Sep' },
  { value: '10', label: 'Oct' },
  { value: '11', label: 'Nov' },
  { value: '12', label: 'Dec' },
] as const;

const YEAR_RANGE = 60;
const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: YEAR_RANGE }, (_, index) => String(CURRENT_YEAR + 1 - index));

export function ResumeBuilderSection() {
  const {
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
    isSummaryRewriting,
    summaryStatus,
    summaryComparison,
    isPreviewLoading,
    previewUrl,
    activeStep,
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
    canRewriteSummary,
    downloadFilename,
    addSkill,
    removeSkill,
    handleSkillDraftCommit,
    handleNextStep,
    handlePreviousStep,
    handleGoToStep,
    handleRewriteSummary,
    handleAcceptSummarySuggestion,
    handleKeepOriginalSummary,
    clearSummaryFeedback,
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
  } = useResumeBuilderState();
  const contactHelpId = useId();
  const summaryHelpId = useId();
  const skillsHelpId = useId();
  const experienceHelpId = useId();
  const buttonsHelpId = useId();

  useEffect(() => {
    if (!summaryComparison) return;
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    // Ensure the AI rewrite diff is not hidden behind the bottom overlay.
    const scrollHeight = document.documentElement.scrollHeight || document.body.scrollHeight || 0;
    window.scrollTo({ top: scrollHeight, behavior: 'smooth' });
  }, [summaryComparison]);


  const renderStepContent = () => {
    switch (activeStep.key) {
      case 'template':
        return <TemplateStep selectedTemplate={template} onSelectTemplate={setTemplate} />;
      case 'contact':
        return <ContactStep payload={payload} setPayload={setPayload} contactHelpId={contactHelpId} />;
      case 'summary':
        return (
          <SummaryStep
            summary={payload.summary ?? ''}
            onChangeSummary={value => setPayload(prev => ({ ...prev, summary: value }))}
            summaryHelpId={summaryHelpId}
            isSummaryRewriting={isSummaryRewriting}
            canRewriteSummary={canRewriteSummary}
            onRewriteSummary={handleRewriteSummary}
            summaryStatus={summaryStatus}
            onClearFeedback={clearSummaryFeedback}
            comparison={summaryComparison}
            onAcceptSuggestion={handleAcceptSummarySuggestion}
            onKeepOriginal={handleKeepOriginalSummary}
          />
        );
      case 'skills':
        return (
          <SkillsStep
            skills={skillValues}
            skillDraft={skillDraft}
            onChangeDraft={setSkillDraft}
            onCommitDraft={handleSkillDraftCommit}
            onAddSkill={addSkill}
            onRemoveSkill={removeSkill}
            skillsHelpId={skillsHelpId}
          />
        );
      case 'experience':
        return (
          <ExperienceStep
            experience={experience}
            experienceHelpId={experienceHelpId}
            onAddExperience={addExperience}
            onRemoveExperience={removeExperience}
            onMoveExperience={moveExperience}
            onUpdateExperienceField={updateExperienceField}
            timelineDrafts={timelineInputs}
            bulletsInputs={bulletsInputs}
            onUpdateTimelineDraft={updateTimelineInput}
            monthOptions={MONTH_OPTIONS}
            yearOptions={YEAR_OPTIONS}
            experienceLimit={EXPERIENCE_LIMIT}
          />
        );
      case 'education':
        return (
          <EducationStep
            education={education}
            educationLimit={EDUCATION_LIMIT}
            onAddEducation={addEducation}
            onRemoveEducation={removeEducation}
            onMoveEducation={moveEducation}
            onUpdateEducationField={updateEducationField}
          />
        );
      case 'preview':
        return <PreviewStep stepCompletion={stepCompletion} previewUrl={previewUrl} />;
      default:
        return null;
    }
  };


return (
  <section
    id="resume-builder"
    className="mt-10 flex flex-col gap-8 rounded-2xl border border-neutral-200 bg-white p-6 shadow-lg"
  >
    <header className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="max-w-2xl">
          <h2 className="text-3xl font-bold text-neutral-900">Build Your Resume</h2>
          <p className="mt-1 text-base text-neutral-600">
            Follow the guided steps to build a polished resume. Your draft saves automatically in this browser so you can pick up where you left off.
          </p>
        </div>
        <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={handleGenerate}
            disabled={!canPreview || isPreviewLoading}
            className="rounded-full bg-emerald-600 px-6 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-emerald-700 focus:outline-none focus:ring-4 focus:ring-emerald-200 disabled:cursor-not-allowed disabled:bg-emerald-200 disabled:text-emerald-700"
            aria-describedby={buttonsHelpId}
            title="Open a PDF preview in a new tab"
          >
            {isPreviewLoading ? 'Opening Preview…' : 'Preview Resume'}
          </button>
          {previewUrl && (
            <a
              href={previewUrl}
              download={downloadFilename}
              className="inline-flex items-center justify-center rounded-full border-2 border-emerald-600 px-6 py-3 text-base font-semibold text-emerald-700 transition hover:border-emerald-700 hover:text-emerald-900 focus:outline-none focus:ring-4 focus:ring-emerald-200"
              title="Download the generated PDF"
            >
              Download PDF
            </a>
          )}
        </div>
      </div>
      <div className="flex flex-col gap-3">
        <div className="relative h-2 w-full rounded-full bg-neutral-200" aria-hidden="true">
          <div
            className="h-2 rounded-full bg-emerald-600 transition-all"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <ol className="flex flex-wrap gap-2" aria-label="Resume builder steps">
          {WIZARD_STEPS.map((step, index) => {
            const isActive = index === currentStepIndex;
            const isDone = index < currentStepIndex;
            const canNavigate = index <= currentStepIndex;
            const accent = isActive
              ? 'border-emerald-600 bg-emerald-600 text-white'
              : isDone
                ? 'border-emerald-400 bg-emerald-50 text-emerald-800'
                : 'border-neutral-300 bg-white text-neutral-600';
            return (
              <li key={step.key}>
                <button
                  type="button"
                  onClick={() => handleGoToStep(index)}
                  disabled={!canNavigate}
                  className={`flex items-center gap-2 rounded-full border-2 px-4 py-2 text-sm font-semibold transition focus:outline-none focus:ring-4 focus:ring-emerald-200 disabled:border-neutral-200 disabled:text-neutral-400 ${accent}`}
                  title={canNavigate ? `Go to ${step.title}` : 'Complete previous steps first'}
                  aria-current={isActive ? 'step' : undefined}
                >
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/20 font-bold">
                    {index + 1}
                  </span>
                  <span>{step.title}</span>
                </button>
              </li>
            );
          })}
        </ol>
      </div>
    </header>
    <div className="flex flex-col gap-4">
      <h3 className="text-2xl font-bold text-neutral-900">{activeStep.title}</h3>
      <p className="text-base text-neutral-600">{activeStep.description}</p>
      {renderStepContent()}
    </div>
    <nav className="sticky bottom-0 z-20 -mx-6 mt-8 border-t border-neutral-200 bg-white/95 px-6 py-5 backdrop-blur">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-3 pb-1 md:flex-nowrap md:pb-0">
          <button
            type="button"
            onClick={handlePreviousStep}
            disabled={isFirstStep}
            className="flex-shrink-0 rounded-full border-2 border-neutral-300 px-5 py-3 text-base font-semibold text-neutral-800 whitespace-nowrap transition hover:border-neutral-500 focus:outline-none focus:ring-4 focus:ring-neutral-300 disabled:cursor-not-allowed disabled:border-neutral-200 disabled:text-neutral-400"
            title="Go back to the previous step"
          >
            Back
          </button>
          {!isLastStep && (
            <button
              type="button"
              onClick={handleNextStep}
              disabled={!isActiveStepComplete}
              className="flex-shrink-0 rounded-full bg-neutral-900 px-6 py-3 text-base font-semibold text-white whitespace-nowrap shadow-sm transition hover:bg-neutral-800 focus:outline-none focus:ring-4 focus:ring-neutral-400 disabled:cursor-not-allowed disabled:bg-neutral-400"
              title={isActiveStepComplete ? 'Continue to the next step' : 'Complete the required fields to continue'}
            >
              {nextStepLabel}
            </button>
          )}
          <button
            type="button"
            onClick={handleGenerate}
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
            onClick={handleReset}
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
    </nav>
  </section>
);
}
