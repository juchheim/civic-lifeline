import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ExternalLink } from "lucide-react";

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

const sections = [
  {
    href: "/food",
    title: "Food Access",
    description: "Find stores that take SNAP on a map.",
  },
  {
    href: "/resume",
    title: "Resume Builder",
    description: "Make a resume quickly with easy guidance.",
  },
  {
    href: "/housing-utilities",
    title: "Housing/Utilities",
    description: "Check fair rent, locate counselors, and find info on utilities.",
  },
  {
    href: "/stats",
    title: "Stats — Unemployment",
    description: "See unemployment numbers by county.",
  },
  {
    href: "/coming-soon",
    title: "Coming Soon",
    description: "New tools and features are on the way.",
  },
];

const priorityRoutes = new Set(["/food", "/resume", "/housing-utilities"]);
const essentialSections = sections.filter((section) => priorityRoutes.has(section.href));
const exploratorySections = sections.filter((section) => !priorityRoutes.has(section.href));

const essentialStyles: Record<
  string,
  {
    container: string;
    cta: string;
    badge: string;
    title: string;
    description: string;
    icon: string;
  }
> = {
  "/food": {
    container: "border-civic-green bg-civic-green shadow-lg shadow-civic-green/20 hover:shadow-xl hover:shadow-civic-green/30",
    cta: "text-white",
    badge: "bg-civic-green text-white",
    title: "text-white",
    description: "text-white/95",
    icon: "text-white/90",
  },
  "/resume": {
    container: "border-civic-blue bg-civic-blue shadow-lg shadow-civic-blue/20 hover:shadow-xl hover:shadow-civic-blue/30",
    cta: "text-white",
    badge: "bg-civic-blue text-white",
    title: "text-white",
    description: "text-white/95",
    icon: "text-white/90",
  },
  "/housing-utilities": {
    container: "border-amber-600 bg-amber-600 shadow-lg shadow-amber-600/20 hover:shadow-xl hover:shadow-amber-600/30",
    cta: "text-white",
    badge: "bg-amber-600 text-white",
    title: "text-white",
    description: "text-white/95",
    icon: "text-white/90",
  },
};

const highlightPoints = [
  {
    title: "Food Finder",
    detail: "See stores near you that take SNAP, choose the kind you want, and plan a low-cost trip.",
  },
  {
    title: "Resume Builder",
    detail: "Enter your details and download a ready-to-use resume.",
  },
  {
    title: "Housing Information",
    detail: "Price housing, find counselors, and get utility data.",
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
          name: "Food Access",
          description: "Find stores that accept SNAP benefits on an interactive map",
          url: `${baseUrl}/food`,
        },
        {
          "@type": "ListItem",
          position: 2,
          name: "Resume Builder",
          description: "Create professional resumes with guided steps and AI assistance",
          url: `${baseUrl}/resume`,
        },
        {
          "@type": "ListItem",
          position: 3,
          name: "Housing & Utilities",
          description: "Find housing counselors, fair market rent data, and utility information",
          url: `${baseUrl}/housing-utilities`,
        },
        {
          "@type": "ListItem",
          position: 4,
          name: "Unemployment Statistics",
          description: "View county-level unemployment trends and economic indicators",
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
            <h1 className="text-4xl font-semibold leading-[1.15] sm:text-[2.75rem]">
              Find the help you need to stay positive and in charge of your life.
            </h1>
            <p className="max-w-xl text-base text-white/85 sm:text-lg">
              Locate food choices. Make a strong resume. Know the facts about local housing and find help.
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
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-civic-blue">Pick the help you need.</p>
            <h2 className="text-3xl font-semibold text-slate-900">What kind of help do you need today?</h2>
            <p className="text-sm text-slate-600">
              Our tools are simple. Click the one that fits what you need.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {essentialSections.map((section) => {
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
                    <div className={`flex h-12 w-12 items-center justify-center rounded-full bg-white/20 transition-all group-hover:bg-white/30 group-hover:translate-x-1 ${styles.cta}`}>
                      <ArrowRight className={`h-6 w-6 ${styles.cta}`} />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {exploratorySections.map((section) => (
              <Link
                key={section.href}
                href={section.href}
                className="group flex h-full flex-col gap-3 rounded-2xl border border-slate-200/80 bg-slate-50/80 p-5 text-left shadow-inner shadow-white transition hover:border-civic-blue/30 hover:bg-white"
              >
                <div className="flex items-center justify-between gap-3 opacity-80 group-hover:opacity-100">
                  <h3 className="text-lg font-semibold text-slate-700">{section.title}</h3>
                  <ExternalLink className="h-4 w-4 text-slate-300 transition group-hover:text-civic-blue" />
                </div>
                <p className="text-sm text-slate-500">{section.description}</p>
                <span className="inline-flex items-center gap-2 text-sm font-semibold text-civic-blue/80">
                  Open {section.title}
                  <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                </span>
                <span className="block rounded-full border border-dashed border-slate-300 px-3 py-1 text-center text-xs font-semibold text-slate-500">
                  Data tools
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
    </>
  );
}
