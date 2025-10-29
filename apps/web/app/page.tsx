import Link from "next/link";
import { ExternalLink } from "lucide-react";

const sections = [
  {
    href: "/food",
    title: "Food Access",
    description: "Search USDA SNAP retailers within a map view and filter by store type.",
  },
  {
    href: "/jobs",
    title: "Jobs & Unemployment",
    description: "Query BLS LAUS unemployment series by county and visualise the trend.",
  },
  {
    href: "/broadband",
    title: "Broadband Coverage",
    description: "Look up FCC NBM broadband summaries by county FIPS code.",
  },
  {
    href: "/housing",
    title: "Housing Support",
    description: "Find nearby HUD housing counselors and fetch Fair Market Rents.",
  },
  {
    href: "/resources",
    title: "Community Resources",
    description: "Browse verified community submissions and inspect moderation status.",
  },
  {
    href: "/submit",
    title: "Submit Resource",
    description: "Add a new community resource and send it to the moderation queue.",
  },
  {
    href: "/moderate",
    title: "Moderation Queue",
    description: "Verify pending resources using phone, site, or email checks.",
  },
];

export default function HomePage() {
  return (
    <div className="space-y-8">
      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Civic Lifeline Test Harness</h1>
        <p className="mt-3 text-sm text-slate-600">
          Use the sections below to manually exercise every available data integration. Each page calls the live API
          routes exposed by this Next.js app so you can validate upstream credentials, caching, and persistence flows.
        </p>
        <p className="mt-3 text-xs text-slate-500">
          Tip: Keep developer tools open to inspect network requests, response headers, and caching behaviour.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {sections.map((section) => (
          <Link
            key={section.href}
            href={section.href}
            className="group flex h-full flex-col justify-between rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-300 hover:shadow-md"
          >
            <div>
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-slate-900">{section.title}</h2>
                <ExternalLink size={16} className="text-slate-400 transition group-hover:text-blue-500" />
              </div>
              <p className="mt-2 text-sm text-slate-600">{section.description}</p>
            </div>
            <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-blue-600">
              Open <span aria-hidden="true">→</span>
            </span>
          </Link>
        ))}
      </section>
    </div>
  );
}
