'use client';

import { useEffect, useId } from 'react';
import { Sparkles, ShieldCheck } from 'lucide-react';
import { useResumeBuilderState } from './useResumeBuilderState';
import { WIZARD_STEPS, EXPERIENCE_LIMIT, EDUCATION_LIMIT, MAX_SKILLS } from './constants';
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

const HERO_HIGHLIGHTS = [
  'Guided steps keep you focused—no blank page dread.',
  'Everything saves locally on this device until you preview.',
  'Download a polished PDF with one click when you are ready.',
] as const;

const PREP_ITEMS = [
  { title: 'Work history', detail: 'Job titles, employers, dates, and key wins.' },
  { title: 'Education', detail: 'Schools, certifications, and graduation years.' },
  { title: 'Skills', detail: 'Up to 10 strengths you want to highlight.' },
] as const;

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
    maxStepReached,
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

  // Scroll to top of form when step changes on mobile
  useEffect(() => {
    if (typeof window === 'undefined') return;
    // Only scroll on mobile (< 768px)
    if (window.innerWidth < 768) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [currentStepIndex]);

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
            isComplete={stepCompletion.skills}
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
        return <PreviewStep stepCompletion={stepCompletion} previewUrl={previewUrl} onGoToStep={handleGoToStep} />;
      default:
        return null;
    }
  };

  return (
    <section
      id="resume-builder"
      className="mt-4 overflow-hidden rounded-[2.5rem] border border-slate-200 bg-white shadow-lg shadow-slate-400/10"
    >
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.65fr)_minmax(0,0.6fr)]">
        <div className="flex flex-col gap-8 px-6 py-8 sm:px-10 sm:py-10">
          <header className="space-y-3 sm:space-y-4">
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-brand-primary/25 bg-brand-primary/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.28em] text-brand-primary">
              <Sparkles className="h-4 w-4" />
              Job & Resume Help
            </span>
            <div className="text-slate-900">
              <h1 className="text-3xl font-semibold leading-tight sm:text-[2.5rem]">
                Build your resume with confidence.
              </h1>
            </div>
            <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:gap-3">
              {canPreview && (
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={isPreviewLoading}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-brand-primary px-6 py-3 text-base font-semibold text-white shadow-lg shadow-brand-primary/25 transition hover:bg-brand-primary/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
                  aria-describedby={buttonsHelpId}
                  title="Open a PDF preview in a new tab"
                >
                  {isPreviewLoading ? 'Opening Preview…' : 'Preview Resume'}
                </button>
              )}
              {previewUrl && (
                <a
                  href={previewUrl}
                  download={downloadFilename}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full border-2 border-brand-primary px-6 py-3 text-base font-semibold text-brand-primary transition hover:border-brand-primary/80 hover:text-brand-primary/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2"
                  title="Download the generated PDF"
                >
                  Download PDF
                </a>
              )}
            </div>
          </header>

          <div className="space-y-3">
            <div
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(progressPercent)}
              aria-label="Resume builder progress"
              className="relative h-2 w-full rounded-full bg-slate-200"
            >
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-brand-primary transition-all"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <ol className="flex flex-nowrap gap-1.5 overflow-x-auto pb-1 md:flex-wrap md:gap-2" aria-label="Resume builder steps">
              {WIZARD_STEPS.map((step, index) => {
                const isActive = index === currentStepIndex;
                const isDone = index < maxStepReached;
                const canNavigate = index <= maxStepReached;
                const accent = isActive
                  ? 'border-brand-primary bg-brand-primary text-white shadow-md shadow-brand-primary/30'
                  : isDone
                    ? 'border-brand-primary/50 bg-brand-primary/10 text-brand-primary'
                    : 'border-slate-200 bg-white text-slate-600';
                return (
                  <li key={step.key}>
                    <button
                      type="button"
                      onClick={() => handleGoToStep(index)}
                      disabled={!canNavigate}
                      className={`flex items-center justify-center gap-2 rounded-full border-2 px-4 py-2 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400 ${accent}`}
                      title={canNavigate ? `Go to ${step.title}` : 'Complete previous steps first'}
                      aria-current={isActive ? 'step' : undefined}
                      aria-label={`Step ${index + 1}: ${step.title}`}
                    >
                      <span className="hidden md:inline">{step.title}</span>
                      <span className="inline-flex md:hidden">{index + 1}</span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-2xl font-semibold text-slate-900">{activeStep.title}</h3>
              {activeStep.key === 'skills' && (
                <span className="text-sm font-semibold text-slate-600">
                  {skillValues.length} of {MAX_SKILLS}
                </span>
              )}
            </div>
            {activeStep.description && <p className="text-base text-slate-600">{activeStep.description}</p>}
            {renderStepContent()}
          </div>

          <nav className="sticky bottom-0 z-20 -mx-6 mt-10 border-t border-slate-200 bg-white/95 px-4 py-4 shadow-[0_-18px_35px_rgba(15,23,42,0.08)] backdrop-blur sm:px-6">
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                <button
                  type="button"
                  onClick={handlePreviousStep}
                  disabled={isFirstStep}
                  className="flex-1 rounded-full border-2 border-slate-300 px-5 py-3 text-sm font-semibold text-slate-800 transition hover:border-slate-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400 sm:text-base"
                  title="Go back to the previous step"
                >
                  Back
                </button>
                {!isLastStep && (
                  <button
                    type="button"
                    onClick={handleNextStep}
                    disabled={!isActiveStepComplete}
                    className="flex-1 rounded-full bg-brand-primary px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-primary/30 transition hover:bg-brand-primary/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-brand-primary/40 sm:text-base"
                    title={
                      isActiveStepComplete
                        ? `Continue to ${WIZARD_STEPS[currentStepIndex + 1]?.title ?? 'the next step'}`
                        : 'Complete the required fields to continue'
                    }
                  >
                    <span className="sm:hidden">Next</span>
                    <span className="hidden sm:inline">{nextStepLabel}</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleReset}
                  className="flex-1 rounded-full border-2 border-transparent px-5 py-3 text-sm font-semibold text-brand-primary transition hover:text-brand-primary/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/20 sm:text-base"
                  title="Clear all fields and start over"
                >
                  Reset All
                </button>
              </div>
              {!isLastStep && (
                <p className="text-center text-xs font-medium text-slate-500 sm:hidden">
                  Next: {WIZARD_STEPS[currentStepIndex + 1]?.title ?? 'next step'}
                </p>
              )}
              {(canPreview || previewUrl) && (
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                  {canPreview && (
                    <button
                      type="button"
                      onClick={handleGenerate}
                      disabled={isPreviewLoading}
                      className="flex-1 rounded-full bg-brand-primary px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-primary/30 transition hover:bg-brand-primary/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-brand-primary/40 sm:text-base"
                      aria-describedby={buttonsHelpId}
                      title="Open a PDF preview in a new tab"
                    >
                      {isPreviewLoading ? 'Opening Preview…' : 'Preview Resume'}
                    </button>
                  )}
                  {previewUrl && (
                    <a
                      href={previewUrl}
                      download={downloadFilename}
                      className="inline-flex flex-1 items-center justify-center rounded-full border-2 border-brand-primary px-5 py-3 text-sm font-semibold text-brand-primary transition hover:border-brand-primary/80 hover:text-brand-primary/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 sm:text-base"
                      title="Download the generated PDF"
                    >
                      Download PDF
                    </a>
                  )}
                </div>
              )}
              <div className="hidden text-sm text-slate-600 sm:block">
                <p id={buttonsHelpId}>
                  Preview opens in a new tab. Download saves as <span className="font-mono">{downloadFilename}</span>.
                </p>
                {status && (
                  <p className="mt-1 text-sm text-slate-700" role="status" aria-live="polite">
                    {status}
                  </p>
                )}
              </div>
            </div>
          </nav>
        </div>

        <aside className="flex flex-col gap-6 border-t border-slate-100 bg-info-tint px-6 py-8 text-slate-900 sm:px-10 lg:max-w-[420px] lg:border-l lg:border-t-0 lg:pl-8 lg:ml-auto">
          <div className="space-y-3">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-600">Why it matters</p>
            <ul className="space-y-3 text-base leading-relaxed text-slate-700">
              {HERO_HIGHLIGHTS.map(highlight => (
                <li key={highlight} className="flex items-start gap-3">
                  <span className="mt-2 h-2 w-2 rounded-full bg-brand-accent/70" aria-hidden />
                  <span>{highlight}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-brand-accent/30 bg-white/70 p-5 text-slate-800 shadow-inner shadow-brand-accent/10">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">What you’ll need</p>
            <ul className="mt-3 space-y-2 text-sm leading-relaxed">
              {PREP_ITEMS.map(item => (
                <li key={item.title}>
                  <p className="font-semibold text-slate-900">{item.title}</p>
                  <p className="text-slate-600">{item.detail}</p>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-white/40 bg-white/80 p-5 text-slate-800 shadow-lg shadow-brand-primary/10">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-primary/10 text-brand-primary">
                <ShieldCheck className="h-5 w-5" />
              </span>
              <p className="text-base font-semibold text-slate-900">Privacy first</p>
            </div>
            <p className="mt-3 text-sm text-slate-600">
              The builder runs entirely in your browser. Nothing is stored on Civic Lifeline servers unless you open a preview.
            </p>
            <p className="mt-2 text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
              Need help? hello@civiclifeline.org
            </p>
          </div>
        </aside>
      </div>
    </section>
  );
}
