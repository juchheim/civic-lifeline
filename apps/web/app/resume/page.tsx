import { ResumeBuilderSection } from "@/components/resume/ResumeBuilderSection";

export default function ResumePage() {
  return (
    <div className="space-y-8">
      <header className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-3xl font-bold text-slate-900">Resume Builder</h1>
        <p className="mt-3 text-base text-slate-600">
          Follow the guided steps to build a polished resume. Your draft saves automatically in this browser so you can
          pick up where you left off.
        </p>
      </header>
      <ResumeBuilderSection />
    </div>
  );
}
