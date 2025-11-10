'use client';

import { useEffect, useId, useState, useTransition } from 'react';
import { Sparkles, ShieldCheck, ChevronDown, ChevronUp, ArrowRightCircle } from 'lucide-react';
import type { TemplateName } from '@/resume/shared/templates';
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
  const [templateError, setTemplateError] = useState<string | null>(null);
  const [isHelpPanelOpen, setIsHelpPanelOpen] = useState(false);
  const [shouldAnimateNext, setShouldAnimateNext] = useState(false);
  const [isAdvancingStep, startAdvancingStep] = useTransition();
  const contactHelpId = useId();
  const summaryHelpId = useId();
  const skillsHelpId = useId();
  const experienceHelpId = useId();
  const buttonsHelpId = useId();
  const templateErrorId = useId();
  const mobileHelpPanelId = useId();

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

useEffect(() => {
  if (activeStep.key !== 'template' && templateError) {
    setTemplateError(null);
  }
}, [activeStep.key, templateError]);

  const isTemplateStep = activeStep.key === 'template';
  const stepEyebrow = `Step ${currentStepIndex + 1} of ${WIZARD_STEPS.length} — ${activeStep.title}`;
  const isNextDisabled = !isActiveStepComplete || isAdvancingStep;
  const shouldUseNativeDisabled = !isTemplateStep && isNextDisabled;
  const showNextButton = !isLastStep;

  const previewDescriptionId = activeStep.key === 'preview' ? buttonsHelpId : undefined;

  const handleTemplateSelect = (nextTemplate: TemplateName) => {
    setTemplate(nextTemplate);
    setTemplateError(null);
  };

  const handleAdvanceAttempt = () => {
    if (isNextDisabled) {
      if (isTemplateStep) {
        setTemplateError('Select a template to continue.');
      }
      return;
    }
    if (isTemplateStep) {
      setTemplateError(null);
    }
    startAdvancingStep(() => {
      handleNextStep();
    });
  };

const toggleHelpPanel = () => setIsHelpPanelOpen(prev => !prev);

useEffect(() => {
  if (!isNextDisabled) {
    setShouldAnimateNext(true);
  } else {
    setShouldAnimateNext(false);
  }
}, [isNextDisabled, currentStepIndex]);

  const progressSection = (
    <div className="space-y-2" aria-live="polite">
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progressPercent)}
        aria-label="Resume builder progress"
        className="relative h-1.5 w-full overflow-hidden rounded-full bg-slate-100"
      >
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-brand-primary transition-[width]"
          style={{ width: `${progressPercent}%` }}
        />
      </div>
      <ol
        className="flex flex-nowrap items-center gap-1 overflow-x-auto pb-1 text-xs font-semibold text-slate-600 sm:flex-wrap sm:gap-2"
        aria-label="Resume builder steps"
      >
        {WIZARD_STEPS.map((step, index) => {
          const isActive = index === currentStepIndex;
          const isDone = index < maxStepReached;
          const canNavigate = index <= maxStepReached;
          const accent = isActive
            ? 'border-slate-900 bg-slate-900 text-white shadow-sm'
            : isDone
              ? 'border-slate-300 bg-white text-slate-700'
              : 'border-slate-200 bg-slate-50 text-slate-400';
          return (
            <li key={step.key}>
              <button
                type="button"
                onClick={() => handleGoToStep(index)}
                disabled={!canNavigate}
                className={`flex items-center justify-center gap-2 rounded-full border px-3 py-1.5 transition focus:outline-none focus-visible:ring-1 focus-visible:ring-slate-400 disabled:cursor-not-allowed ${accent}`}
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
  );

  const stepSection = (
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
  );

  const rightRailPanels = (
    <div className="space-y-5 text-slate-800">
      <section className="rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-sm shadow-slate-200/50">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Why it matters</p>
        <ul className="mt-3 space-y-3 text-sm leading-relaxed text-slate-600">
          {HERO_HIGHLIGHTS.map(highlight => (
            <li key={highlight} className="flex items-start gap-3">
              <span className="mt-1 h-2 w-2 rounded-full bg-slate-300" aria-hidden />
              <span>{highlight}</span>
            </li>
          ))}
        </ul>
      </section>
      <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">What you&apos;ll need</p>
        <ul className="mt-3 space-y-2 text-sm leading-relaxed text-slate-700">
          {PREP_ITEMS.map(item => (
            <li key={item.title}>
              <p className="font-semibold text-slate-900">{item.title}</p>
              <p className="text-slate-600">{item.detail}</p>
            </li>
          ))}
        </ul>
      </section>
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-600">
            <ShieldCheck className="h-5 w-5" aria-hidden="true" />
          </span>
          <p className="text-base font-semibold text-slate-900">Privacy first</p>
        </div>
        <p className="mt-3 text-sm text-slate-600">
          The builder runs entirely in your browser. Nothing is stored on Civic Lifeline servers.
        </p>
      </section>
    </div>
  );

  function renderStepContent() {
    switch (activeStep.key) {
      case 'template':
        return (
          <TemplateStep
            selectedTemplate={template}
            onSelectTemplate={handleTemplateSelect}
            onRequestNext={handleAdvanceAttempt}
            errorMessage={templateError}
            errorId={templateErrorId}
          />
        );
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
  }

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
              Resume Builder
            </span>
            <div className="text-slate-900">
              <h1 className="text-3xl font-semibold leading-tight sm:text-[2.5rem]">
                Build your resume with confidence.
              </h1>
              <p className="mt-3 text-sm font-semibold text-slate-600">{stepEyebrow}</p>
            </div>
            {canPreview && (
              <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:gap-3">
                <button
                  type="button"
                  onClick={() => handleGenerate('preview')}
                  disabled={isPreviewLoading}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-brand-primary px-6 py-3 text-base font-semibold text-white shadow-lg shadow-brand-primary/25 transition hover:bg-brand-primary/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
                  aria-describedby={previewDescriptionId}
                  title="Open a PDF preview in a new tab"
                >
                  {isPreviewLoading ? 'Opening Preview…' : 'Preview Resume'}
                </button>
                <button
                  type="button"
                  onClick={() => handleGenerate('download')}
                  disabled={isPreviewLoading}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full border-2 border-brand-primary px-6 py-3 text-base font-semibold text-brand-primary transition hover:border-brand-primary/80 hover:text-brand-primary/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
                  title="Download the generated PDF"
                >
                  {isPreviewLoading ? 'Preparing Download…' : 'Download PDF'}
                </button>
              </div>
            )}
          </header>

          <div className="flex flex-col gap-5">
            {stepSection}
            {progressSection}
          </div>

          <nav className="sticky bottom-0 z-20 mt-6 border-t border-slate-200 bg-white/95 px-0 py-4 shadow-[0_-18px_35px_rgba(15,23,42,0.08)] backdrop-blur">
            <div className="flex flex-col gap-4">
              {showNextButton ? (
                <div className="flex flex-wrap items-center gap-3 sm:flex-nowrap">
                  <div className="flex w-full justify-start pl-5">
                    <button
                      type="button"
                      onClick={handleAdvanceAttempt}
                      disabled={shouldUseNativeDisabled}
                      aria-disabled={isNextDisabled}
                      className={`w-full min-w-[220px] max-w-[320px] rounded-full px-6 py-3 text-base font-semibold text-white shadow-lg shadow-brand-primary/30 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 ${
                        isNextDisabled
                          ? 'cursor-not-allowed bg-brand-primary/35 text-white/80'
                          : 'bg-brand-primary hover:bg-brand-primary/90'
                      }`}
                      title={
                        isNextDisabled
                          ? isTemplateStep
                            ? 'Select a template to continue'
                            : 'Complete the required fields to continue'
                          : `Continue to ${WIZARD_STEPS[currentStepIndex + 1]?.title ?? 'the next step'}`
                      }
                      aria-label={nextStepLabel}
                    >
                      <span className="flex items-center justify-center gap-3">
                        <span>{isAdvancingStep ? 'Moving…' : nextStepLabel}</span>
                        {!isNextDisabled && shouldAnimateNext && (
                          <ArrowRightCircle className="h-6 w-6 animate-pulse text-white" aria-hidden="true" />
                        )}
                      </span>
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={handlePreviousStep}
                    disabled={isFirstStep}
                    className="inline-flex min-w-[140px] items-center justify-center rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-800 transition hover:border-slate-400 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400 sm:text-base"
                    title="Go back to the previous step"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={handleReset}
                    className="rounded px-5 py-2 text-sm font-semibold text-slate-500 underline-offset-4 whitespace-nowrap transition hover:text-slate-900 hover:underline sm:ml-auto"
                    title="Clear all fields and start over"
                  >
                    Reset All
                  </button>
                </div>
              ) : (
                <div className="flex w-full items-center justify-end gap-3 px-5">
                  <button
                    type="button"
                    onClick={handlePreviousStep}
                    disabled={isFirstStep}
                    className="inline-flex min-w-[140px] items-center justify-center rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-800 transition hover:border-slate-400 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400 sm:text-base"
                    title="Go back to the previous step"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={handleReset}
                    className="rounded px-5 py-2 text-sm font-semibold text-slate-500 underline-offset-4 whitespace-nowrap transition hover:text-slate-900 hover:underline"
                    title="Clear all fields and start over"
                  >
                    Reset All
                  </button>
                </div>
              )}
              {!isLastStep && (
                <p className="pl-5 text-xs font-medium text-slate-500">
                  Next up: {WIZARD_STEPS[currentStepIndex + 1]?.title ?? 'next step'}
                </p>
              )}
              {canPreview && (
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                  <button
                    type="button"
                    onClick={() => handleGenerate('preview')}
                    disabled={isPreviewLoading}
                    className="flex-1 rounded-full bg-brand-primary px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-primary/30 transition hover:bg-brand-primary/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-brand-primary/40 sm:text-base"
                    aria-describedby={previewDescriptionId}
                    title="Open a PDF preview in a new tab"
                  >
                    {isPreviewLoading ? 'Opening Preview…' : 'Preview Resume'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleGenerate('download')}
                    disabled={isPreviewLoading}
                    className="inline-flex flex-1 items-center justify-center rounded-full border-2 border-brand-primary px-5 py-3 text-sm font-semibold text-brand-primary transition hover:border-brand-primary/80 hover:text-brand-primary/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70 sm:text-base"
                    title="Download the generated PDF"
                  >
                    {isPreviewLoading ? 'Preparing Download…' : 'Download PDF'}
                  </button>
                </div>
              )}
              {(activeStep.key === 'preview' || status) && (
                <div className="text-sm text-slate-600">
                  {activeStep.key === 'preview' && (
                    <p id={buttonsHelpId}>
                      Preview opens in a new tab. Download saves as <span className="font-mono">{downloadFilename}</span>.
                    </p>
                  )}
                  {status && (
                    <p className="mt-1 text-sm text-slate-700" role="status" aria-live="polite">
                      {status}
                    </p>
                  )}
                </div>
              )}
            </div>
          </nav>

          <div className="lg:hidden">
            <button
              type="button"
              onClick={toggleHelpPanel}
              aria-expanded={isHelpPanelOpen}
              aria-controls={mobileHelpPanelId}
              className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm shadow-slate-200/60 transition hover:border-slate-300 hover:text-slate-900"
            >
              Builder tips &amp; privacy
              <span className={`transition ${isHelpPanelOpen ? 'text-slate-900' : 'text-slate-500'}`}>
                {isHelpPanelOpen ? <ChevronUp className="h-4 w-4" aria-hidden="true" /> : <ChevronDown className="h-4 w-4" aria-hidden="true" />}
              </span>
            </button>
            <div id={mobileHelpPanelId} className={isHelpPanelOpen ? 'mt-3 block' : 'hidden'}>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm">{rightRailPanels}</div>
            </div>
          </div>
        </div>

        <aside className="hidden lg:flex lg:flex-col lg:gap-6 lg:border-l lg:border-slate-100 lg:px-8 lg:py-10 lg:text-sm">
          {rightRailPanels}
        </aside>
      </div>
    </section>
  );
}
