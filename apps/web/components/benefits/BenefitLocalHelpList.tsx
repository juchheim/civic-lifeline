import type { BenefitsLocalHelpResult } from "@cl/types";

interface BenefitLocalHelpListProps {
  items: BenefitsLocalHelpResult[];
  isLoading: boolean;
  errorMessage?: string;
  hasSearched: boolean;
  source?: string | null;
}

export default function BenefitLocalHelpList({ items, isLoading, errorMessage, hasSearched, source }: BenefitLocalHelpListProps) {
  const sampleSource = source?.toLowerCase().includes("sample");

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white/60 px-4 py-3 text-sm text-slate-600 shadow-inner" aria-live="polite">
        Loading programs…
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 shadow-inner" aria-live="assertive">
        {errorMessage}
      </div>
    );
  }

  // Don't show sample data - treat it as no results
  if (hasSearched && (items.length === 0 || sampleSource)) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white/60 px-4 py-3 text-sm text-slate-600 shadow-inner">
        We didn&apos;t find centers for this search. Try another nearby city or talk with a local American Job Center.
      </div>
    );
  }

  if (!items.length) {
    return null;
  }

  return (
    <div className="space-y-3">
      {items.map((item) => {
        const locationLine = [item.address, [item.city, item.state].filter(Boolean).join(", ").trim(), item.postalCode]
          .filter((value) => value && value.trim().length > 0)
          .join(" ")
          .trim();

        return (
          <article
            key={item.id ?? `${item.name}-${item.postalCode ?? ""}`}
            className="space-y-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h4 className="text-base font-semibold text-slate-900">{item.name}</h4>
              {typeof item.distanceMiles === "number" ? (
                <span className="text-sm text-slate-500">{item.distanceMiles.toFixed(1)} miles away</span>
              ) : null}
            </div>
            {item.description ? <p className="text-sm text-slate-600">{item.description}</p> : null}
            <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
              {item.phone ? (
                <a href={`tel:${item.phone}`} className="font-semibold text-brand-primary hover:underline">
                  {item.phone}
                </a>
              ) : null}
              {item.website ? (
                <a href={item.website} target="_blank" rel="noreferrer" className="font-semibold text-brand-primary hover:underline">
                  Visit website
                </a>
              ) : null}
              {locationLine ? <span className="break-words">{locationLine}</span> : null}
            </div>
          </article>
        );
      })}
    </div>
  );
}
