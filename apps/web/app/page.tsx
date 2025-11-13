import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

const baseUrl = process.env.NEXT_PUBLIC_APP_BASE_URL || "https://civiclifeline.org";

export const metadata: Metadata = {
  title: "Home",
  description:
    "Find the help you need with free tools and verified data. Locate SNAP retailers, build resumes, find housing counselors, check utility costs, and view unemployment statistics.",
  openGraph: {
    title: "Civic Lifeline — Essential Resources & Tools",
    description:
      "Free tools and verified public data for food assistance, housing help, job resources, and essential services across the United States.",
    url: "/",
  },
  alternates: {
    canonical: "/",
  },
};

const triageSections = [
  {
    href: "/food",
    title: "Food Help",
    description: "Find stores that take SNAP near you.",
  },
  {
    href: "/resume",
    title: "Resume Help",
    description: "Build a simple resume you can download.",
  },
  {
    href: "/housing-utilities",
    title: "Housing & Bills",
    description: "See fair rent estimates, counselors, and utility information.",
  },
];

const simpleToolLinks = [
  {
    href: "/food",
    label: "Food Help",
    description: "Look up stores that take SNAP nearby.",
  },
  {
    href: "/resume",
    label: "Resume Help",
    description: "Make a job resume step by step.",
  },
  {
    href: "/housing-utilities",
    label: "Housing & Bills",
    description: "Check rent, counselors, and utility help.",
  },
  {
    href: "/stats",
    label: "Local Numbers",
    description: "View job and money numbers for your county.",
  },
  {
    href: "/benefits",
    label: "Benefits Info.",
    description: "See government programs you may qualify for.",
  },
];

const essentialStyles: Record<
  string,
  {
    container: string;
    cta: string;
    title: string;
    description: string;
  }
> = {
  "/food": {
    container: "border-civic-green bg-civic-green shadow-lg shadow-civic-green/20 hover:shadow-xl hover:shadow-civic-green/30",
    cta: "text-white",
    title: "text-white",
    description: "text-white/95",
  },
  "/resume": {
    container: "border-civic-blue bg-civic-blue shadow-lg shadow-civic-blue/20 hover:shadow-xl hover:shadow-civic-blue/30",
    cta: "text-white",
    title: "text-white",
    description: "text-white/95",
  },
  "/housing-utilities": {
    container: "border-amber-600 bg-amber-600 shadow-lg shadow-amber-600/20 hover:shadow-xl hover:shadow-amber-600/30",
    cta: "text-white",
    title: "text-white",
    description: "text-white/95",
  },
};

const highlightPoints = [
  {
    title: "Food help",
    detail: "Find stores near you that take SNAP.",
  },
  {
    title: "Resume help",
    detail: "Make a job resume step by step.",
  },
  {
    title: "Housing & bills",
    detail: "Check rent, find counselors, and see utility info.",
  },
];

export default function HomePage() {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Civic Lifeline",
    description:
      "Free tools and verified public data for food assistance, housing help, job resources, and essential services across the United States.",
    url: baseUrl,
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${baseUrl}/api/geocode/suggest?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
    mainEntity: {
      "@type": "ItemList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Food Help",
          description: "Find stores near you that take SNAP benefits.",
          url: `${baseUrl}/food`,
        },
        {
          "@type": "ListItem",
          position: 2,
          name: "Resume Help",
          description: "Make a simple resume you can download right away.",
          url: `${baseUrl}/resume`,
        },
        {
          "@type": "ListItem",
          position: 3,
          name: "Housing & Bills",
          description: "See rent estimates, housing counselors, and utility information.",
          url: `${baseUrl}/housing-utilities`,
        },
        {
          "@type": "ListItem",
          position: 4,
          name: "Local Numbers",
          description: "View local job and money numbers from trusted public data.",
          url: `${baseUrl}/stats`,
        },
      ],
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <div className="mx-auto my-4 max-w-[85rem] overflow-hidden rounded-[2.5rem] border border-slate-200 bg-white/95 px-4 py-8 shadow-xl shadow-slate-400/10 backdrop-blur sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1fr)] lg:gap-12">
          <div className="flex flex-col gap-8 rounded-3xl bg-civic-blue px-6 py-7 text-white shadow-lg shadow-civic-blue/20 sm:px-8 lg:px-10">
            <div className="space-y-4">
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-white/80">Civic Lifeline</p>
              <h2 className="text-4xl font-semibold leading-[1.15] sm:text-[2.75rem]">
                Get help with food, jobs, and housing.
              </h2>
              <p className="max-w-xl text-base text-white/85 sm:text-lg">
                Civic Lifeline brings together trusted public data so you can make a plan. Pick what you need help with
                and we&apos;ll send you to a simple tool. No account, no fees, and we don&apos;t save your personal
                details.
              </p>
            </div>
            <ul className="space-y-3">
              {highlightPoints.map((point) => (
                <li key={point.title} className="flex items-start gap-3">
                  <span className="mt-1.5 h-3 w-3 shrink-0 rounded-full bg-civic-green" aria-hidden />
                  <div>
                    <p className="text-base font-semibold text-white">{point.title}</p>
                    <p className="text-base text-white/80">{point.detail}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <div className="flex flex-col gap-8">
            <div className="space-y-4">
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-civic-blue">Start here</p>
              <h1 className="text-3xl font-semibold text-slate-900 sm:text-[2.2rem]">
                What kind of help do you need today?
              </h1>
              <p className="text-sm text-slate-600 sm:text-base">
                Pick one option so we can guide you right to the tool you need.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {triageSections.map((section) => {
                const styles = essentialStyles[section.href] ?? essentialStyles["/food"];
                return (
                  <Link
                    key={section.href}
                    href={section.href}
                    className={`group relative flex h-full flex-col gap-4 rounded-2xl border p-6 text-left transition-all hover:scale-[1.02] ${styles.container}`}
                  >
                    <div className="flex flex-col gap-2">
                      <h3 className={`text-xl font-semibold leading-tight ${styles.title}`}>{section.title}</h3>
                      <p className={`text-sm leading-relaxed ${styles.description}`}>{section.description}</p>
                    </div>
                    <div className="mt-auto flex items-center justify-end">
                      <div
                        className={`flex h-12 w-12 items-center justify-center rounded-full bg-white/20 transition-all group-hover:bg-white/30 group-hover:translate-x-1 ${styles.cta}`}
                      >
                        <ArrowRight className={`h-6 w-6 ${styles.cta}`} />
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
            <div className="space-y-3 text-sm text-slate-600">
              <div className="flex items-start gap-3">
                <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-sm bg-civic-blue" aria-hidden />
                <p>
                  Not sure what government help you might get?{" "}
                  <Link
                    href="/benefits"
                    className="inline-flex items-center gap-2 font-semibold text-civic-blue underline decoration-civic-blue/30 underline-offset-4"
                  >
                    See Benefits &amp; Programs
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </p>
              </div>
              <div className="flex items-start gap-3">
                <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-sm bg-civic-blue" aria-hidden />
                <p>
                  Want to see local job and money numbers?{" "}
                  <Link
                    href="/stats"
                    className="inline-flex items-center gap-2 font-semibold text-civic-blue underline decoration-civic-blue/30 underline-offset-4"
                  >
                    View local numbers
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <section className="mx-auto mb-12 mt-8 max-w-[85rem] px-4 sm:px-6 lg:px-8">
        <div className="rounded-[2rem] border border-slate-200 bg-white/95 px-6 py-8 shadow-lg shadow-slate-400/10 sm:px-8 lg:px-12">
          <div className="space-y-3 text-left sm:max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-civic-blue">
              Simple tools
            </p>
            <h2 className="text-2xl font-semibold text-slate-900 sm:text-3xl">Use these buttons to jump right in.</h2>
            <p className="text-sm text-slate-600 sm:text-base">
              Prefer a simple list? Tap one of the tools below to go straight to that page.
            </p>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            {simpleToolLinks.map((tool) => (
              <Link
                key={tool.href}
                href={tool.href}
                className="group flex h-full flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-civic-blue/30 hover:shadow-md"
              >
                <div className="space-y-2">
                  <p className="text-base font-semibold text-slate-900">{tool.label}</p>
                  <p className="text-sm text-slate-600">{tool.description}</p>
                </div>
                <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-civic-blue">
                  Go to {tool.label}
                  <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
