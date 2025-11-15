"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";

export interface CollapsibleGuideSectionProps {
  id: string;
  title: string;
  summary?: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
}

export function CollapsibleGuideSection({ id, title, summary, children, defaultOpen = false }: CollapsibleGuideSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <section className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4 text-sm text-slate-700 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h3 className="text-base font-semibold text-slate-900">{title}</h3>
          {summary ? <div className="text-sm text-slate-600 [&>ul]:mt-1 [&>ul]:space-y-1">{summary}</div> : null}
        </div>
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className="inline-flex items-center gap-1 rounded-full border border-transparent px-3 py-1 text-sm font-semibold text-brand-primary transition hover:bg-brand-primary/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2"
          aria-expanded={isOpen}
          aria-controls={id}
        >
          {isOpen ? "Hide details" : "Show details"}
          <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`} aria-hidden />
        </button>
      </div>
      <div id={id} aria-hidden={!isOpen} hidden={!isOpen} className="mt-4 space-y-4">
        {children}
      </div>
    </section>
  );
}

export default CollapsibleGuideSection;
