"use client";

import Link from "next/link";
import { createPortal } from "react-dom";
import { useCallback, useEffect, useMemo, useRef, useState, useId, type FormEvent, type ReactNode } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  type BenefitLocalHelpKind,
  type BenefitsLocalHelpRequest,
  type BenefitsLocalHelpResponse,
  type BenefitsHealthCheckRequest,
  type BenefitsHealthCheckResponse,
  type BenefitsHealthCheckBand,
  zBenefitLocalHelpResponse,
  zBenefitsHealthCheckResponse,
} from "@cl/types";
import {
  type BenefitStateSocialSecurityResponse,
  zBenefitStateSocialSecurityResponse,
} from "@cl/types";
import BenefitLocalHelpList from "@/components/benefits/BenefitLocalHelpList";
import { SocialSecurityOfficesPanel } from "@/components/benefits/SocialSecurityOfficesPanel";
import LocationInputWithGeocode, { type LocationInputWithGeocodeHandle } from "@/components/LocationInputWithGeocode";
import type { LocationSelection } from "@/types/location";
import { useBenefitsLocation, type BenefitsLocation } from "./useBenefitsLocation";
import { useUninsuredCoverageStats } from "./useUninsuredCoverageStats";
import type { LucideIcon } from "lucide-react";
import { ChevronDown, HeartPulse, Home, ShieldCheck, Utensils } from "lucide-react";
import { resolveStateCode } from "@/lib/location/stateCodes";

interface BenefitPanelHelpers {
  location: BenefitsLocation | null;
  promptForLocation: () => void;
}

interface BenefitSection {
  id: string;
  label: string;
  description: string;
  pillText: string;
  icon: LucideIcon;
  render: (helpers: BenefitPanelHelpers) => ReactNode;
}

const BENEFIT_SECTIONS: BenefitSection[] = [
  {
    id: "food-money",
    label: "Food and Money Help",
    description: "SNAP, WIC, food boxes, and cash relief.",
    pillText: "Food and cash basics",
    icon: Utensils,
    render: (helpers) => <FoodAndMoneyPanel {...helpers} />,
  },
  {
    id: "health-coverage",
    label: "Health Coverage",
    description: "Medicaid, CHIP, and Marketplace choices.",
    pillText: "Health coverage options",
    icon: HeartPulse,
    render: (helpers) => <HealthCoveragePanel {...helpers} />,
  },
  {
    id: "daily-support",
    label: "Housing, Bills, and Daily Support",
    description: "Rent, utilities, childcare, and daily basics.",
    pillText: "Help with housing and bills",
    icon: Home,
    render: (helpers) => <BillsHousingPanel {...helpers} />,
  },
  {
    id: "security-disability",
    label: "Social Security and Disability",
    description: "SSI, SSDI, survivors, and veterans help.",
    pillText: "Social Security basics",
    icon: ShieldCheck,
    render: (helpers) => <SecurityDisabilityPanel {...helpers} />,
  },
];

const SECTION_IDS = BENEFIT_SECTIONS.map((section) => section.id);
const PRIMARY_SECTION_ID = SECTION_IDS[0] ?? "food-money";

interface PanelGuide {
  helps: string[];
  goodToKnow: string[];
  steps: string[];
  officialLinks: Array<{ label: string; href: string }>;
  relatedLinks: Array<{ label: string; href: string }>;
}

const PANEL_GUIDANCE: Record<BenefitSection["id"], PanelGuide> = {
  "food-money": {
    helps: [
      "Monthly SNAP money you spend with an EBT card.",
      "WIC food for pregnant people, babies, and young kids.",
      "Food pantries, soup kitchens, and mobile meals.",
      "Markets that match SNAP dollars at some farmer markets.",
    ],
    goodToKnow: [
      "Programs look at your income, where you live, and how many people live with you.",
      "Bring ID, proof of address, and pay stubs or benefit letters when you apply.",
      "You apply through your state or county. Civic Lifeline just shares trusted links.",
    ],
    steps: [
      "Type your city or ZIP in the location box so we can look nearby.",
      "Use the buttons to search for food pantries, SNAP helpers, or cash offices.",
      "Use the official SNAP links to read the rules or start an application.",
    ],
    officialLinks: [
      {
        label: "SNAP basics from USDA",
        href: "https://www.fns.usda.gov/snap/supplemental-nutrition-assistance-program",
      },
      {
        label: "Find your state SNAP office",
        href: "https://www.fns.usda.gov/snap/state-directory",
      },
    ],
    relatedLinks: [{ label: "Stores that take SNAP", href: "/food" }],
  },
  "health-coverage": {
    helps: [
      "Medicaid and CHIP for low-cost or free care.",
      "Marketplace plans that may come with monthly savings.",
      "Free help from navigators, assisters, or community health workers.",
      "Checklists of documents to gather before you apply.",
    ],
    goodToKnow: [
      "Health programs review your income, family size, age, and disability status.",
      "Have ID, proof of address, and recent pay stubs or benefit letters ready.",
      "You apply on your state site or HealthCare.gov, not through Civic Lifeline.",
    ],
    steps: [
      "Add your city or ZIP at the top so we know your state.",
      "Use the quick check to see which coverage may fit you.",
      "Talk with a local helper or go to the official site when you are ready to apply.",
    ],
    officialLinks: [
      { label: "Go to HealthCare.gov", href: "https://www.healthcare.gov/" },
      { label: "Learn about Medicaid and CHIP", href: "https://www.medicaid.gov/medicaid/index.html" },
    ],
    relatedLinks: [{ label: "See local health and income stats", href: "/stats" }],
  },
  "daily-support": {
    helps: [
      "Emergency rent help, public housing lists, and tenant support.",
      "Utility relief for electric, gas, water, phone, and internet.",
      "Childcare vouchers, Head Start, and rides to appointments.",
      "Daily basics like diapers, school meals, or hygiene items.",
    ],
    goodToKnow: [
      "Paperwork rules change by county, so call ahead for each program.",
      "Bring ID, your lease or mortgage, copies of recent bills, and proof of income.",
      "Some programs open wait lists only at certain times, so check before you go.",
    ],
    steps: [
      "Set your location so we can show nearby rent, utility, and childcare help.",
      "Use the search buttons for housing, bills, or family support help near you.",
      "Talk with a local American Job Center or visit the official program site to finish the application.",
    ],
    officialLinks: [
      {
        label: "Find American Job Centers (CareerOneStop)",
        href: "https://www.careeronestop.org/LocalHelp/AmericanJobCenters/american-job-centers.aspx",
      },
    ],
    relatedLinks: [{ label: "See housing and utility costs near you", href: "/housing-utilities" }],
  },
  "security-disability": {
    helps: [
      "Social Security retirement checks and survivor benefits.",
      "SSDI for people who worked and now have a disability.",
      "SSI for people with very low income or few resources.",
      "Links to lawyers or veterans groups that help with appeals.",
    ],
    goodToKnow: [
      "The Social Security Administration (SSA) makes the final decision.",
      "You usually need ID, proof of citizenship or immigration status, medical records, and income info.",
      "Stats on this page show how many people in your state get these benefits.",
    ],
    steps: [
      "Add your location so we can show stats and helpers in your state.",
      "Use the buttons to search for disability, SSA, or veterans help near you.",
      "Visit SSA.gov when you are ready to apply or manage your case.",
    ],
    officialLinks: [{ label: "Learn about Social Security", href: "https://www.ssa.gov/benefits/" }],
    relatedLinks: [
      { label: "See local income and work stats", href: "/stats" },
      { label: "Build or update your resume", href: "/resume" },
    ],
  },
};

const BENEFIT_AREAS = [
  "Food and money help",
  "Health coverage options",
  "Housing, bills, and daily support",
  "Social Security and disability help",
];

const SUMMARY_POINTS = [
  "See how many people near you have health coverage or get Social Security.",
  "Check which benefits you might qualify for based on your income and family size.",
  "Find offices and centers near you that can help with food, housing, bills, and more.",
  "Get links to official websites where you can learn more or apply.",
];

const JUMP_NAV_ITEMS: Array<{ id: BenefitSection["id"]; label: string }> = [
  { id: "food-money", label: "Food & Money" },
  { id: "health-coverage", label: "Health" },
  { id: "daily-support", label: "Bills & Housing" },
  { id: "security-disability", label: "Social Security" },
];

const LEARN_MORE_LINKS: Record<BenefitSection["id"], Array<{ label: string; href: string }>> = {
  "food-money": [
    {
      label: "SNAP food help (official site)",
      href: "https://www.fns.usda.gov/snap/supplemental-nutrition-assistance-program",
    },
    {
      label: "Find your state's SNAP office",
      href: "https://www.fns.usda.gov/snap/state-directory",
    },
    {
      label: "WIC food help for women, babies, and children",
      href: "https://www.fns.usda.gov/wic",
    },
  ],
  "health-coverage": [
    { label: "See health plans and prices (HealthCare.gov)", href: "https://www.healthcare.gov/" },
    { label: "Medicaid basics (official site)", href: "https://www.medicaid.gov/medicaid/index.html" },
    { label: "Health coverage for children (CHIP)", href: "https://www.medicaid.gov/chip/index.html" },
  ],
  "daily-support": [
    { label: "Help with energy bills (LIHEAP)", href: "https://www.acf.hhs.gov/ocs/liheap" },
    { label: "Housing help from HUD", href: "https://www.hud.gov/" },
    { label: "Talk with a housing counselor", href: "https://www.hud.gov/findacounselor" },
  ],
  "security-disability": [
    { label: "Social Security benefits (official site)", href: "https://www.ssa.gov/benefits/" },
    { label: "Disability benefits (SSDI and SSI)", href: "https://www.ssa.gov/benefits/disability/" },
    { label: "How to appeal a decision", href: "https://www.ssa.gov/benefits/disability/appeal.html" },
  ],
};

type FoodHelpKind = Extract<BenefitLocalHelpKind, "food" | "kids" | "cash">;

const FOOD_HELP_CATEGORIES: Array<{ kind: FoodHelpKind; label: string; description: string; cta: string }> = [
  {
    kind: "food",
    label: "SNAP food help",
    description: "Talk with someone about EBT cards, interviews, and recertification.",
    cta: "Search SNAP helpers",
  },
  {
    kind: "kids",
    label: "WIC for moms & kids",
    description: "Find WIC clinics, formula support, and breastfeeding help.",
    cta: "Search WIC helpers",
  },
  {
    kind: "cash",
    label: "Cash help for bills",
    description: "Ask your local office about TANF or other emergency cash programs.",
    cta: "Search cash assistance offices",
  },
];

function PanelGuidance({ guide }: { guide: PanelGuide }) {
  return (
    <div className="space-y-6 rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-700 shadow-sm">
      <div>
        <p className="text-sm font-semibold text-slate-900">What this can help with</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          {guide.helps.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
      <div>
        <p className="text-sm font-semibold text-slate-900">Good to know before you start</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          {guide.goodToKnow.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
      <div>
        <p className="text-sm font-semibold text-slate-900">Next steps</p>
        <ol className="mt-2 list-decimal space-y-1 pl-5">
          {guide.steps.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ol>
        <ul className="mt-3 space-y-1 text-sm">
          {guide.officialLinks.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-brand-primary underline-offset-2 hover:underline"
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>
      </div>
      <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
        <p className="text-sm font-semibold text-slate-900">Related tools on Civic Lifeline</p>
        <div className="mt-2 flex flex-wrap gap-3 text-sm">
          {guide.relatedLinks.map((link) => (
            <Link key={link.href} href={link.href} className="font-semibold text-brand-primary underline-offset-4 hover:underline">
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

export { HealthCoveragePanel };

type LocalHelpRequestPayload = BenefitsLocalHelpRequest;

async function requestLocalHelp(payload: LocalHelpRequestPayload) {
  const res = await fetch("/api/benefits/local-help", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message =
      (json as any)?.error?.message ??
      "We had trouble loading local help right now. Please try again or contact a local American Job Center.";
    throw new Error(message);
  }
  return zBenefitLocalHelpResponse.parse(json);
}

async function runHealthCheck(payload: BenefitsHealthCheckRequest) {
  const res = await fetch("/api/benefits/health-check", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = (json as any)?.error?.message ?? "We could not check health coverage right now.";
    throw new Error(message);
  }
  return zBenefitsHealthCheckResponse.parse(json);
}

async function fetchStateSocialSecurityStats(stateCode: string): Promise<BenefitStateSocialSecurityResponse> {
  const res = await fetch(`/api/benefits/state-social-security?stateCode=${encodeURIComponent(stateCode)}`, {
    headers: { accept: "application/json" },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = (json as any)?.error?.message ?? "We could not load Social Security stats.";
    throw new Error(message);
  }
  return zBenefitStateSocialSecurityResponse.parse(json);
}

const numberFormatter = new Intl.NumberFormat("en-US");
const percentFormatter = new Intl.NumberFormat("en-US", { style: "percent", maximumFractionDigits: 1 });
const coveragePercentFormatter = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 });
type HealthFieldErrors = { locationText?: string; householdSize?: string; income?: string };

function useLocalHelpSearch() {
  return useMutation<BenefitsLocalHelpResponse, Error, LocalHelpRequestPayload>({
    mutationFn: requestLocalHelp,
  });
}

function formatLocalHelpLocation(location: BenefitsLocation): string {
  if (location.zip) return location.zip;
  const stateCode = resolveStateCode(location.stateCode) ?? resolveStateCode(location.stateName);
  if (location.countyName && stateCode) {
    return `${location.countyName}, ${stateCode}`;
  }
  const labelParts = location.displayLabel.split(",").map((part) => part.trim()).filter(Boolean);
  if (stateCode && labelParts.length) {
    return `${labelParts[0]}, ${stateCode}`;
  }
  if (labelParts.length >= 2) {
    return `${labelParts[0]}, ${labelParts[1]}`;
  }
  return location.displayLabel;
}

export default function BenefitsClient() {
  const { location, setLocationFromResolved, clearLocation } = useBenefitsLocation();
  const [locationInputValue, setLocationInputValue] = useState("");
  const [locationError, setLocationError] = useState<string | null>(null);
  const [openSections, setOpenSections] = useState<string[]>([PRIMARY_SECTION_ID]);
  const [activeSection, setActiveSection] = useState<string>(PRIMARY_SECTION_ID);
  const isManualNavigationRef = useRef(false);
  const locationCardRef = useRef<HTMLDivElement | null>(null);
  const locationInputRef = useRef<LocationInputWithGeocodeHandle | null>(null);

  useEffect(() => {
    setLocationInputValue(location?.displayLabel ?? "");
  }, [location]);

  useEffect(() => {
    const media = window.matchMedia("(min-width: 1024px)");
    const syncSections = (matches: boolean) => {
      setOpenSections(matches ? SECTION_IDS : [PRIMARY_SECTION_ID]);
    };
    syncSections(media.matches);
    const handler = (event: MediaQueryListEvent) => syncSections(event.matches);
    if (typeof media.addEventListener === "function") {
      media.addEventListener("change", handler);
      return () => media.removeEventListener("change", handler);
    }
    media.addListener(handler);
    return () => media.removeListener(handler);
  }, []);

  useEffect(() => {
    const sections = SECTION_IDS.map((id) => document.getElementById(`benefit-section-${id}`)).filter(
      (node): node is HTMLElement => Boolean(node),
    );
    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (isManualNavigationRef.current) return;
        const visible = entries.filter((entry) => entry.isIntersecting);
        if (visible.length === 0) return;
        visible.sort((a, b) => Math.abs(a.boundingClientRect.top) - Math.abs(b.boundingClientRect.top));
        const targetId = visible[0]?.target.getAttribute("data-section-id");
        if (targetId) {
          setActiveSection((prev) => (prev === targetId ? prev : targetId));
        }
      },
      { rootMargin: "-32% 0px -50% 0px", threshold: [0, 0.2, 0.4, 0.6] },
    );

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  const expandAll = useCallback(() => {
    setOpenSections(SECTION_IDS);
  }, []);

  const collapseToPrimary = useCallback(() => {
    setOpenSections([PRIMARY_SECTION_ID]);
    setActiveSection(PRIMARY_SECTION_ID);
    const section = document.getElementById(`benefit-section-${PRIMARY_SECTION_ID}`);
    if (section) {
      isManualNavigationRef.current = true;
      section.scrollIntoView({ behavior: "smooth", block: "start" });
      setTimeout(() => {
        isManualNavigationRef.current = false;
      }, 600);
    }
  }, []);

  const handleToggle = useCallback((id: string) => {
    setOpenSections((prev) => {
      const isOpen = prev.includes(id);
      if (isOpen) {
        if (prev.length === 1) return prev;
        return prev.filter((sectionId) => sectionId !== id);
      }
      return [...prev, id];
    });
    setActiveSection(id);
  }, []);

  const handleNavClick = useCallback((id: string) => {
    setOpenSections((prev) => (prev.includes(id) ? prev : [...prev, id]));
    setActiveSection(id);
    const section = document.getElementById(`benefit-section-${id}`);
    if (section) {
      isManualNavigationRef.current = true;
      section.scrollIntoView({ behavior: "smooth", block: "start" });
      setTimeout(() => {
        isManualNavigationRef.current = false;
      }, 600);
    }
  }, []);

  const handleLocationSelect = useCallback(
    (selection: LocationSelection) => {
      setLocationFromResolved(selection);
      setLocationInputValue(selection.label);
      setLocationError(null);
    },
    [setLocationFromResolved],
  );

  const handleClearLocation = useCallback(() => {
    clearLocation();
    setLocationInputValue("");
    setLocationError(null);
  }, [clearLocation]);

  const promptForLocation = useCallback(() => {
    locationCardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    setTimeout(() => {
      locationInputRef.current?.focusInput();
    }, 200);
  }, []);

  const [isDisclaimerOpen, setIsDisclaimerOpen] = useState(false);

  const panelHelpers = useMemo<BenefitPanelHelpers>(
    () => ({
      location,
      promptForLocation,
    }),
    [location, promptForLocation],
  );

  const heroHighlights = useMemo(
    () => [
      "Food, money, health, and housing help in one place.",
      "Short guides explain what to bring and what to expect.",
      "Local offices, hotlines, and trusted links to finish applications.",
      "Mobile-friendly layout so you can read or search on any device.",
    ],
    [],
  );

  useEffect(() => {
    if (!isDisclaimerOpen) return;
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsDisclaimerOpen(false);
      }
    };
    window.addEventListener("keydown", handleEsc);
    return () => {
      window.removeEventListener("keydown", handleEsc);
    };
  }, [isDisclaimerOpen]);

  const handlePrintSection = useCallback(() => {
    if (typeof window !== "undefined" && typeof window.print === "function") {
      window.print();
    }
  }, []);

  return (
    <div className="space-y-12 bg-neutral-bg pb-16">
      <style
        dangerouslySetInnerHTML={{
          __html: `@media print {
            body,
            #__next,
            main {
              background: #fff !important;
            }
            .cl-benefits-hide-on-print,
            header,
            footer {
              display: none !important;
            }
            .cl-benefits-print-area {
              display: block !important;
            }
            .cl-benefits-panel:not(.cl-benefits-panel-active) {
              display: none !important;
            }
            .cl-benefits-print-area section {
              break-inside: avoid;
              page-break-inside: avoid;
            }
          }`,
        }}
      />
      <section className="mt-4 overflow-hidden rounded-[2.5rem] border border-slate-200 bg-white shadow-lg shadow-slate-400/10">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1fr)] lg:items-stretch">
          <div className="flex flex-col justify-between px-6 py-8 sm:px-10 sm:py-12">
            <div className="space-y-5">
              <span className="inline-flex w-fit items-center gap-2 rounded-full border border-brand-primary/20 bg-brand-primary/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.32em] text-brand-primary">
                BENEFITS
              </span>
              <div className="space-y-4">
                <h1 className="text-3xl font-semibold leading-tight text-slate-900 sm:text-[2.5rem]">
                  Benefits help in plain language.
                </h1>
                <p className="max-w-2xl text-base leading-relaxed text-slate-600 sm:text-lg">
                  {"Read simple guides for food, money, health coverage, housing, and disability help. Share your city or ZIP to see nearby programs, or scroll to learn what each benefit does."}
                </p>
              </div>
            </div>
            <div className="mt-8 rounded-3xl border border-brand-primary/20 bg-brand-primary/5 px-6 py-4 text-sm text-brand-primary sm:text-base">
              {"Need more help? Email "}
              <a href="mailto:help@civiclifeline.org" className="underline hover:opacity-90">
                help@civiclifeline.org
              </a>{" "}
              {"and we will help you find the right office."}
            </div>
          </div>
          <div className="relative">
            <div className="absolute inset-0 bg-info-tint" aria-hidden />
            <div className="relative flex h-full flex-col justify-between gap-6 rounded-t-3xl bg-info-tint px-6 py-8 text-slate-900 sm:px-10 lg:rounded-none">
              <div className="space-y-4">
                <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-600">Why this helps</p>
                <ul className="space-y-3 text-base text-slate-700 sm:text-lg">
                  {heroHighlights.map((highlight) => (
                    <li key={highlight} className="flex items-start gap-3">
                      <span className="mt-2 h-2 w-2 rounded-full bg-brand-accent" aria-hidden />
                      <span>{highlight}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-2xl border border-brand-accent/30 bg-white/80 p-5 text-base leading-relaxed text-slate-800 shadow-inner shadow-brand-accent/10">
                <p className="font-semibold text-slate-800">What to expect</p>
                <p className="mt-2 text-slate-700">
                  {"Each section explains who the program helps, what paperwork to bring, and where to go next."}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-[1.5rem] border border-slate-200 bg-white px-6 py-6 shadow-lg shadow-slate-400/10 sm:px-8 cl-benefits-hide-on-print">
        <h2 className="text-xl font-semibold text-slate-900">What this page can help you with</h2>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-600 sm:text-base">
          {SUMMARY_POINTS.map((point) => (
            <li key={point}>{point}</li>
          ))}
        </ul>
        <p className="mt-3 text-sm text-slate-500">
          You do not apply for benefits on this page. We help you understand your options and find the right places to go.
        </p>
        <button
          type="button"
          className="mt-3 text-sm font-semibold text-brand-primary underline-offset-4 hover:underline"
          onClick={() => setIsDisclaimerOpen(true)}
        >
          Important notes about this page
        </button>
      </section>

      <div className="cl-benefits-hide-on-print flex flex-col gap-3 rounded-[1.5rem] border border-slate-200 bg-white px-4 py-4 shadow-sm">
        <nav aria-label="Quick benefits navigation" className="flex flex-wrap gap-2">
          {JUMP_NAV_ITEMS.map((item) => {
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavClick(item.id)}
                className={`rounded-full px-4 py-1.5 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 ${
                  isActive ? "bg-brand-primary text-white" : "border border-slate-300 bg-white text-slate-700 hover:bg-brand-primary/10"
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>
        <button
          type="button"
          className="self-start text-sm font-semibold text-brand-primary underline-offset-4 hover:underline"
          onClick={handlePrintSection}
        >
          Print this section
        </button>
      </div>

      <section
        ref={locationCardRef}
        className="cl-benefits-hide-on-print rounded-[2.5rem] border border-slate-200 bg-white px-6 py-8 shadow-lg shadow-slate-400/10 sm:px-10"
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-600">Your location</p>
            <h2 className="text-2xl font-semibold text-slate-900">Add your city or ZIP one time.</h2>
            <p className="text-sm text-slate-600 sm:text-base">
              We use this to show nearby programs and state stats. We do not save your full address.
            </p>
          </div>
          <LocationInputWithGeocode
            ref={locationInputRef}
            label="Address or ZIP code"
            placeholder="E.g. 39194 or 123 Main St"
            value={locationInputValue}
            onChange={(value) => {
              setLocationInputValue(value);
              setLocationError(null);
            }}
            onLocationSelect={handleLocationSelect}
            onGeocodeError={(message) => setLocationError(message)}
            helperText="City, county, or ZIP all work."
            size="lg"
          />
          {locationError ? <p className="text-sm text-red-600">{locationError}</p> : null}
          {location ? (
            <div className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-slate-50/80 p-4 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-semibold text-slate-800">Using:</p>
                <p className="text-slate-700">
                  {location.displayLabel}
                  {location.countyName ? ` (${location.countyName})` : ""}
                </p>
              </div>
              <button
                type="button"
                onClick={handleClearLocation}
                className="self-start rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2"
              >
                Clear location
              </button>
            </div>
          ) : (
            <p className="text-sm text-slate-500">No location yet. Add one to unlock local search results.</p>
          )}
        </div>
      </section>

      <section className="rounded-[2.5rem] border border-slate-200 bg-white px-6 py-8 shadow-lg shadow-slate-400/10 sm:px-10">
        <div className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-600">About this guide</p>
            <h2 className="text-2xl font-semibold text-slate-900">See what each program covers.</h2>
            <p className="text-sm text-slate-600 sm:text-base">
              Skim every section to learn what the benefit pays for, the papers you may need, and the next steps.
            </p>
          </div>
          <ul className="list-disc space-y-1 pl-5 text-sm text-slate-600 sm:text-base">
            {BENEFIT_AREAS.map((area) => (
              <li key={area}>{area}</li>
            ))}
          </ul>
          <p className="text-sm text-slate-500">
            Civic Lifeline shares trusted links. When you are ready, you will apply on an official state or federal site or at a local office.
          </p>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[minmax(260px,0.38fr)_minmax(0,1fr)] cl-benefits-print-area">
        <aside className="cl-benefits-hide-on-print self-start rounded-3xl border border-slate-200 bg-white p-6 shadow-lg shadow-slate-400/10 lg:sticky lg:top-6">
          <div className="flex flex-col gap-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">Jump to a service</p>
                <p className="text-sm text-slate-500">Pick a benefit area to explore.</p>
              </div>
              <div className="flex gap-2 text-xs font-semibold text-brand-primary">
                <button
                  type="button"
                  onClick={expandAll}
                  className="rounded-full border border-brand-primary/30 px-3 py-1 transition hover:bg-brand-primary/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2"
                >
                  Expand all
                </button>
                <button
                  type="button"
                  onClick={collapseToPrimary}
                  className="rounded-full border border-brand-primary/30 px-3 py-1 transition hover:bg-brand-primary/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2"
                >
                  Collapse
                </button>
              </div>
            </div>
            <nav aria-label="Benefits sections" className="flex flex-col gap-2">
              {BENEFIT_SECTIONS.map((section) => {
                const Icon = section.icon;
                const isActive = activeSection === section.id;
                return (
                  <button
                    key={section.id}
                    type="button"
                    onClick={() => handleNavClick(section.id)}
                    aria-current={isActive ? "true" : "false"}
                    className={`flex w-full items-center justify-between gap-3 rounded-2xl px-4 py-3.5 text-left text-base font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 ${
                      isActive
                        ? "bg-brand-primary text-white shadow-lg shadow-brand-primary/30"
                        : "bg-slate-100 text-slate-600 hover:bg-brand-primary/10 hover:text-brand-primary"
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/70 text-brand-primary shadow">
                        <Icon className="h-4 w-4" />
                      </span>
                      <span>
                        {section.label}
                        <span className="block text-xs font-normal opacity-80">{section.description}</span>
                      </span>
                    </span>
                    <ChevronDown
                      className={`h-4 w-4 transition-transform ${isActive ? "rotate-180" : "-rotate-90"}`}
                      aria-hidden
                    />
                  </button>
                );
              })}
            </nav>
          </div>
        </aside>

        <div className="space-y-6">
          {BENEFIT_SECTIONS.map((section) => (
            <BenefitPanel
              key={section.id}
              section={section}
              isOpen={openSections.includes(section.id)}
              onToggle={handleToggle}
              isActive={activeSection === section.id}
              renderHelpers={panelHelpers}
            />
          ))}
        </div>
      </section>
      {isDisclaimerOpen ? <BenefitsDisclaimerModal onClose={() => setIsDisclaimerOpen(false)} /> : null}
    </div>
  );
}

interface BenefitPanelProps {
  section: BenefitSection;
  isOpen: boolean;
  onToggle: (id: string) => void;
  isActive: boolean;
  renderHelpers: BenefitPanelHelpers;
}

function BenefitPanel({ section, isOpen, onToggle, isActive, renderHelpers }: BenefitPanelProps) {
  const Icon = section.icon;
  const contentRef = useRef<HTMLDivElement | null>(null);
  const previousOpen = useRef(isOpen);
  const panelId = `benefit-panel-${section.id}`;
  const buttonId = `benefit-trigger-${section.id}`;

  useEffect(() => {
    if (isOpen && !previousOpen.current) {
      contentRef.current?.focus({ preventScroll: true });
    }
    previousOpen.current = isOpen;
  }, [isOpen]);

  const content = useMemo(() => section.render(renderHelpers), [section, renderHelpers]);

  return (
    <section
      id={`benefit-section-${section.id}`}
      data-section-id={section.id}
      className={`cl-benefits-panel overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-lg shadow-slate-400/10 transition ${
        isActive ? "cl-benefits-panel-active ring-1 ring-brand-primary/40" : ""
      }`}
      tabIndex={-1}
      aria-labelledby={buttonId}
    >
      <button
        id={buttonId}
        type="button"
        onClick={() => onToggle(section.id)}
        className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2"
        aria-expanded={isOpen}
        aria-controls={panelId}
      >
        <div className="flex flex-1 items-center gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-primary/10 text-brand-primary shadow-inner shadow-brand-primary/10">
            <Icon className="h-5 w-5" />
          </span>
          <div className="space-y-1">
            <h2 className="text-xl font-semibold text-slate-900 sm:text-2xl">{section.label}</h2>
            <p className="text-sm text-slate-600">{section.description}</p>
          </div>
        </div>
        <ChevronDown className={`h-5 w-5 text-slate-500 transition-transform ${isOpen ? "rotate-180" : ""}`} aria-hidden />
      </button>
      <div
        id={panelId}
        role="region"
        aria-labelledby={buttonId}
        className={`grid transition-[max-height,opacity] duration-300 ease-in-out ${isOpen ? "opacity-100" : "max-h-0 opacity-0"}`}
        style={{ maxHeight: isOpen ? "5000px" : "0" }}
      >
        <div
          ref={contentRef}
          tabIndex={-1}
          className="space-y-6 border-t border-slate-200 px-6 pb-6 pt-5 focus:outline-none"
        >
          <span className="inline-flex items-center rounded-full border border-orange-200 bg-orange-100 px-3 py-0.5 text-sm font-medium text-orange-700">
            {section.pillText}
          </span>
          <div className="space-y-6">{content}</div>
        </div>
      </div>
    </section>
  );
}

interface BenefitCardProps {
  title: string;
  description?: ReactNode;
  children?: ReactNode;
}

function BenefitCard({ title, description, children }: BenefitCardProps) {
  return (
    <article className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="space-y-1.5">
        <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
        {description ? <p className="text-sm leading-relaxed text-slate-600">{description}</p> : null}
      </div>
      {children}
    </article>
  );
}

const buttonBase =
  "inline-flex w-full items-center justify-center rounded-full px-4 py-2 text-sm font-semibold text-center transition sm:w-auto focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2";
const buttonVariants = {
  primary: `${buttonBase} bg-brand-primary text-white hover:opacity-90`,
  secondary: `${buttonBase} border border-slate-300 bg-white text-slate-700 hover:bg-slate-50`,
  subtle: `${buttonBase} bg-slate-100 text-slate-700 hover:bg-slate-200`,
  link: `${buttonBase} w-fit text-brand-primary hover:bg-brand-primary/10`,
} as const;

const inputClasses =
  "w-full rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm text-slate-900 shadow-inner shadow-slate-200 focus:border-brand-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/30";

function placeholderLog(message: string, payload?: unknown) {
  if (process.env.NODE_ENV !== "production") {
    // eslint-disable-next-line no-console
    console.log(message, payload);
  }
}

function LocalHelpDisclaimer() {
  return (
    <p className="text-xs text-slate-500">
      Program info comes from American Job Centers and official agencies. Talk with a local job center if you want to speak to
      someone.
    </p>
  );
}

function LearnMoreLinks({ sectionId }: { sectionId: BenefitSection["id"] }) {
  const links = LEARN_MORE_LINKS[sectionId] ?? [];
  if (links.length === 0) return null;
  return (
    <div>
      <h3 className="mt-4 text-base font-semibold text-slate-900">Learn more (official sites)</h3>
      <ul className="mt-2 space-y-1 text-sm text-slate-700">
        {links.map((link) => (
          <li key={link.href}>
            <a
              href={link.href}
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-brand-primary underline underline-offset-2 hover:opacity-80"
            >
              {link.label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

function AmericanJobCenterHint() {
  return (
    <p className="text-sm text-slate-600">
      Need to talk to someone now?{" "}
      <a
        href="https://www.careeronestop.org/LocalHelp/AmericanJobCenters/american-job-centers.aspx"
        target="_blank"
        rel="noreferrer"
        className="font-semibold text-brand-primary underline-offset-4 hover:underline"
      >
        Find a nearby American Job Center
      </a>{" "}
      for one-on-one help.
    </p>
  );
}

function BenefitsDisclaimerModal({ onClose }: { onClose: () => void }) {
  const content = (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 px-4 py-6" role="dialog" aria-modal="true">
      <div className="max-w-xl space-y-4 rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Important notes</h2>
            <p className="text-sm text-slate-600">Read these before you use this page.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-300 px-3 py-1 text-sm font-semibold text-slate-700 hover:bg-slate-100"
          >
            Close
          </button>
        </div>
        <ul className="list-disc space-y-2 pl-5 text-sm text-slate-700">
          <li>This page explains benefits and shows links. You do not apply here.</li>
          <li>We use public data to give estimates. Only official agencies can decide if you qualify.</li>
          <li>Program rules change. Always check the official site or office for the latest information.</li>
          <li>We do not save your personal information.</li>
        </ul>
      </div>
    </div>
  );
  return typeof document !== "undefined" ? createPortal(content, document.body) : content;
}

function FoodAndMoneyPanel({ location, promptForLocation }: BenefitPanelHelpers) {
  const localHelpMutation = useLocalHelpSearch();
  const [activeHelpKind, setActiveHelpKind] = useState<FoodHelpKind>("food");
  const [helpResults, setHelpResults] = useState<Partial<Record<FoodHelpKind, BenefitsLocalHelpResponse>>>({});
  const [helpErrors, setHelpErrors] = useState<Partial<Record<FoodHelpKind, string | undefined>>>({});
  const [hasRequestedKind, setHasRequestedKind] = useState<Partial<Record<FoodHelpKind, boolean>>>({});
  const [pendingKind, setPendingKind] = useState<FoodHelpKind | null>(null);
  const locationAlertId = useId();

  useEffect(() => {
    setHelpResults({});
    setHelpErrors({});
    setHasRequestedKind({});
    setPendingKind(null);
  }, [location?.displayLabel]);

  const ensureLocation = useCallback(() => {
    if (!location) {
      promptForLocation();
      return false;
    }
    return true;
  }, [location, promptForLocation]);

  const runLocalHelpSearch = useCallback(
    (kind: FoodHelpKind) => {
      if (!ensureLocation()) return;
      if (!location) return;
      setPendingKind(kind);
      setHasRequestedKind((prev) => ({ ...prev, [kind]: true }));
      setHelpErrors((prev) => ({ ...prev, [kind]: undefined }));
      localHelpMutation.mutate(
        {
          locationText: formatLocalHelpLocation(location),
          latitude: location.latitude,
          longitude: location.longitude,
          kind,
        },
        {
          onSuccess: (data) => {
            setHelpResults((prev) => ({ ...prev, [kind]: data }));
          },
          onError: (error) => {
            const fallbackMessage =
              "We had trouble loading local programs. Please try again or contact a local American Job Center.";
            setHelpErrors((prev) => ({
              ...prev,
              [kind]: error instanceof Error ? error.message : fallbackMessage,
            }));
          },
          onSettled: () => {
            setPendingKind((current) => (current === kind ? null : current));
          },
        },
      );
    },
    [ensureLocation, localHelpMutation, location],
  );

  const activeCategory = FOOD_HELP_CATEGORIES.find((category) => category.kind === activeHelpKind) ?? FOOD_HELP_CATEGORIES[0]!;
  const activeResults = helpResults[activeHelpKind];
  const activeError = helpErrors[activeHelpKind];
  const hasActiveSearch = Boolean(hasRequestedKind[activeHelpKind]);
  const isActiveLoading = pendingKind === activeHelpKind && localHelpMutation.isPending;
  const locationSummary = location
    ? `Showing ${activeCategory.label.toLowerCase()} near ${location.displayLabel}.`
    : "Add your city or ZIP to search near you.";

  return (
    <div className="space-y-6">
      <PanelGuidance guide={PANEL_GUIDANCE["food-money"]} />
      <BenefitCard title="Local food, WIC, and cash helpers" description="Pick what you need help with and we will show nearby offices.">
        {!location ? (
          <p id={locationAlertId} className="text-sm text-amber-700">
            Add your city or ZIP above so we can look near you.
          </p>
        ) : (
          <p className="text-sm text-slate-600">Using location: {location.displayLabel}</p>
        )}
        <div className="mt-4 flex flex-wrap gap-2" role="tablist" aria-label="Food and cash help categories">
          {FOOD_HELP_CATEGORIES.map((category) => {
            const isActive = activeHelpKind === category.kind;
            return (
              <button
                key={category.kind}
                type="button"
                onClick={() => setActiveHelpKind(category.kind)}
                className={`rounded-full border px-4 py-1.5 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 ${
                  isActive ? "border-brand-primary bg-brand-primary text-white" : "border-slate-300 bg-white text-slate-700 hover:bg-brand-primary/10"
                }`}
                aria-pressed={isActive}
              >
                {category.label}
              </button>
            );
          })}
        </div>
        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm text-slate-700">
          <p className="font-semibold text-slate-900">{activeCategory.label}</p>
          <p className="mt-1">{activeCategory.description}</p>
        </div>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            className={buttonVariants.primary}
            onClick={() => runLocalHelpSearch(activeHelpKind)}
            disabled={!location || isActiveLoading}
            aria-describedby={!location ? locationAlertId : undefined}
          >
            {isActiveLoading ? "Searching…" : activeCategory.cta}
          </button>
          <button type="button" className={buttonVariants.secondary} onClick={promptForLocation}>
            {location ? "Change location" : "Set my location"}
          </button>
        </div>
        <div className="mt-5 space-y-3">
          <p className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
            {locationSummary}
          </p>
          <BenefitLocalHelpList
            items={activeResults?.items ?? []}
            isLoading={isActiveLoading}
            errorMessage={activeError}
            hasSearched={hasActiveSearch}
            source={activeResults?.source}
          />
          <LocalHelpDisclaimer />
          <AmericanJobCenterHint />
        </div>
      </BenefitCard>

      <BenefitCard title="SNAP and WIC basics">
        <p className="text-sm text-slate-600">Use the local search above or visit an office to ask about these programs.</p>
        <ul className="mt-3 space-y-2 text-sm text-slate-600">
          <li className="flex gap-2">
            <span aria-hidden className="text-brand-primary">•</span>
            SNAP gives monthly grocery money on an EBT card.
          </li>
          <li className="flex gap-2">
            <span aria-hidden className="text-brand-primary">•</span>
            WIC gives food and formula for pregnant people, babies, and kids under 5.
          </li>
          <li className="flex gap-2">
            <span aria-hidden className="text-brand-primary">•</span>
            Bring ID, proof of address, and income info when you visit an office.
          </li>
        </ul>
      </BenefitCard>

      <BenefitCard
        title="Cash help for bills"
        description="Some states offer TANF or other cash aid for rent, utilities, and daily needs. Use the search above and ask about:"
      >
        <ul className="space-y-2 text-sm text-slate-600">
          <li className="flex gap-2">
            <span aria-hidden className="text-brand-primary">•</span>
            Emergency cash or vouchers for rent, utilities, diapers, or gas.
          </li>
          <li className="flex gap-2">
            <span aria-hidden className="text-brand-primary">•</span>
            TANF (Temporary Assistance for Needy Families) and other state cash programs.
          </li>
          <li className="flex gap-2">
            <span aria-hidden className="text-brand-primary">•</span>
            What to bring: photo ID, proof of address, and recent pay stubs or benefit letters.
          </li>
        </ul>
      </BenefitCard>
      <LearnMoreLinks sectionId="food-money" />
    </div>
  );
}

type CoverageMetric = {
  key: string;
  label: string;
  percent: number | null;
  areaLabel: string;
};

function parsePercentValue(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function shortenAreaName(value?: string | null): string | null {
  if (!value) return null;
  const [first] = value.split(",");
  return first?.trim() ?? null;
}

function describePercent(percent: number | null, areaLabel: string, fallback: string) {
  if (percent === null) {
    return `We don't have enough data for ${fallback} yet.`;
  }
  const rounded = Math.round(percent);
  const readable =
    areaLabel.toLowerCase() === "united states" || areaLabel.toLowerCase() === "the united states"
      ? "the United States"
      : areaLabel;
  return `About ${rounded} out of 100 people in ${readable} have no health insurance.`;
}

function describeShareOutOfHundred(value: number | null, subject: string) {
  if (typeof value !== "number") {
    return `We do not have data for ${subject}.`;
  }
  return `About ${Math.round(value * 100)} out of 100 ${subject}.`;
}

export function HealthCoverageMetricsPanel({ location, promptForLocation }: BenefitPanelHelpers) {
  const { data, isLoading, isError, hasCountyMatch, isResolvingLocation } = useUninsuredCoverageStats(location);
  const waiting = isResolvingLocation || isLoading;

  if (!location) {
    return (
      <BenefitCard title="Health coverage in your area">
        <p className="text-sm text-slate-600">Add your city or ZIP so we can show coverage near you.</p>
        <button type="button" className={`${buttonVariants.primary} mt-3`} onClick={promptForLocation}>
          Set my location
        </button>
      </BenefitCard>
    );
  }

  if (waiting) {
    return (
      <BenefitCard title="Health coverage in your area">
        <p className="text-sm text-slate-600" aria-live="polite">
          Loading coverage numbers…
        </p>
      </BenefitCard>
    );
  }

  if (isError || !data?.state) {
    return (
      <BenefitCard title="Health coverage in your area">
        <p className="text-sm text-red-600">We had trouble loading this data. Please try again later.</p>
      </BenefitCard>
    );
  }

  const countyLabel = shortenAreaName(location.countyName ?? data.county?.name) ?? "your county";
  const stateLabel = shortenAreaName(location.stateName ?? data.state.name) ?? "your state";
  const nationalLabel = shortenAreaName(data.national?.name) ?? "the United States";

  const metrics: CoverageMetric[] = [];
  if (data.county && hasCountyMatch) {
    metrics.push({
      key: "county",
      label: "Uninsured in your county",
      percent: parsePercentValue(data.county.percent),
      areaLabel: countyLabel,
    });
  }

  metrics.push({
    key: "state",
    label: "Uninsured in your state",
    percent: parsePercentValue(data.state.percent),
    areaLabel: stateLabel,
  });

  if (data.national) {
    metrics.push({
      key: "national",
      label: "United States overall",
      percent: parsePercentValue(data.national.percent),
      areaLabel: nationalLabel,
    });
  }

  return (
    <BenefitCard title="Health coverage in your area">
      <div className="space-y-4">
        <p className="text-sm text-slate-600">
          These numbers show how many people out of 100 do not have health insurance. Lower numbers mean more neighbors are covered.
        </p>
        {metrics.length > 0 ? (
          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {metrics.map((metric) => {
              const percentValue = metric.percent;
              const percentText = percentValue !== null ? `${coveragePercentFormatter.format(percentValue)}%` : "Not available";
              const detail = describePercent(metric.percent, metric.areaLabel, metric.areaLabel);
              return (
                <div
                  key={metric.key}
                  className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-inner shadow-slate-200/60"
                >
                  <dt className="text-sm font-semibold text-slate-900">{metric.label}</dt>
                  <dd className="mt-1 text-3xl font-semibold text-slate-900">{percentText}</dd>
                  <p className="mt-2 text-sm text-slate-600">{detail}</p>
                </div>
              );
            })}
          </dl>
        ) : (
          <p className="text-sm text-slate-600">{"We couldn't find coverage data for this area yet."}</p>
        )}
        {!hasCountyMatch && location.countyName ? (
          <p className="text-xs text-slate-500">
            {"We couldn't match county data for "}
            {location.countyName}
            {" so we are showing your state instead."}
          </p>
        ) : null}
        <p className="text-xs text-slate-500">
          Source: U.S. Census Bureau (American Community Survey). Latest data: {data.source?.time ?? "2022"}.
        </p>
      </div>
    </BenefitCard>
  );
}

function HealthCoveragePanel({ location, promptForLocation }: BenefitPanelHelpers) {
  const [locationTextInput, setLocationTextInput] = useState("");
  const [householdSize, setHouseholdSize] = useState("");
  const [income, setIncome] = useState("");
  const [age, setAge] = useState("");
  const [fieldErrors, setFieldErrors] = useState<HealthFieldErrors>({});
  const healthCheckMutation = useMutation<BenefitsHealthCheckResponse, Error, BenefitsHealthCheckRequest>({
    mutationFn: runHealthCheck,
  });
  const localHelpMutation = useLocalHelpSearch();
  const hasLocalHelpSearched = localHelpMutation.isSuccess || localHelpMutation.isError;

  useEffect(() => {
    if (location?.displayLabel && !locationTextInput) {
      setLocationTextInput(location.displayLabel);
    }
  }, [location?.displayLabel, locationTextInput]);

  const normalizedStateCode = resolveStateCode(location?.stateCode);

  const handleCheckOptions = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const trimmedLocation = locationTextInput.trim();
      const trimmedHousehold = householdSize.trim();
      const trimmedIncome = income.trim();
      const errors: HealthFieldErrors = {};
      if (!trimmedLocation) errors.locationText = "Please enter your city or ZIP.";
      if (!trimmedHousehold || Number(trimmedHousehold) <= 0) errors.householdSize = "Please enter how many people live in your home.";
      if (!trimmedIncome || Number(trimmedIncome) <= 0) errors.income = "Please enter your monthly income.";
      if (Object.keys(errors).length > 0) {
        setFieldErrors(errors);
        return;
      }
      setFieldErrors({});
      healthCheckMutation.mutate({
        locationText: trimmedLocation,
        householdSize: Number(trimmedHousehold),
        monthlyIncome: Number(trimmedIncome),
        age: age ? Number(age) : undefined,
        stateCode: normalizedStateCode ?? undefined,
      });
    },
    [locationTextInput, householdSize, income, age, healthCheckMutation, normalizedStateCode],
  );

  const locationAlertId = useId();

  const handleHealthHelpSearch = useCallback(() => {
    if (!location) {
      promptForLocation();
      return;
    }
    localHelpMutation.mutate({
      locationText: formatLocalHelpLocation(location),
      latitude: location.latitude,
      longitude: location.longitude,
      kind: "health",
    });
  }, [location, localHelpMutation, promptForLocation]);

  const healthError = healthCheckMutation.isError
    ? "We had trouble running this check. Please try again or talk to a local helper."
    : undefined;
  const localHelpError = localHelpMutation.isError
    ? "We had trouble loading local helpers. Please try again or contact a local American Job Center."
    : undefined;

  return (
    <div className="space-y-6">
      <PanelGuidance guide={PANEL_GUIDANCE["health-coverage"]} />
      <HealthCoverageMetricsPanel location={location} promptForLocation={promptForLocation} />
      <BenefitCard title="Check health coverage options">
        <form onSubmit={handleCheckOptions} className="space-y-3">
          <p className="text-sm text-slate-600">
            This is a quick check, not a final decision. Only your state or HealthCare.gov can say if you qualify.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <label htmlFor="health-location" className="text-sm font-medium text-slate-600">
                Your city or ZIP
              </label>
              <input
                id="health-location"
                name="health-location"
                className={inputClasses}
                value={locationTextInput}
                onChange={(event) => {
                  setLocationTextInput(event.target.value);
                  setFieldErrors((prev) => ({ ...prev, locationText: undefined }));
                }}
              />
              {fieldErrors.locationText ? <p className="text-sm text-red-600">{fieldErrors.locationText}</p> : null}
            </div>
            <div className="space-y-1">
              <label htmlFor="household-size" className="text-sm font-medium text-slate-600">
                People in your home
              </label>
              <input
                id="household-size"
                name="household-size"
                type="number"
                min={1}
                className={inputClasses}
                value={householdSize}
                onChange={(event) => {
                  setHouseholdSize(event.target.value);
                  setFieldErrors((prev) => ({ ...prev, householdSize: undefined }));
                }}
              />
              {fieldErrors.householdSize ? <p className="text-sm text-red-600">{fieldErrors.householdSize}</p> : null}
            </div>
          </div>
          <div className="space-y-1">
            <label htmlFor="income" className="text-sm font-medium text-slate-600">
              Monthly income before taxes
            </label>
            <input
              id="income"
              name="income"
              type="number"
              min={0}
              className={inputClasses}
              value={income}
              onChange={(event) => {
                setIncome(event.target.value);
                setFieldErrors((prev) => ({ ...prev, income: undefined }));
              }}
            />
            {fieldErrors.income ? <p className="text-sm text-red-600">{fieldErrors.income}</p> : null}
          </div>
          <div className="space-y-1">
            <label htmlFor="age" className="text-sm font-medium text-slate-600">
              Age (optional)
            </label>
            <input
              id="age"
              name="age"
              type="number"
              min={0}
              className={inputClasses}
              value={age}
              onChange={(event) => setAge(event.target.value)}
            />
          </div>
          <button type="submit" className={buttonVariants.primary} disabled={healthCheckMutation.isPending}>
            {healthCheckMutation.isPending ? "Checking…" : "Check my health coverage options"}
          </button>
        </form>
        <div className="mt-4 rounded-2xl border border-slate-200 bg-white/70 px-4 py-3 text-sm text-slate-600" aria-live="polite">
          {healthCheckMutation.isPending ? (
            "Checking your options…"
          ) : healthCheckMutation.data ? (
            <HealthCheckResultCard result={healthCheckMutation.data} />
          ) : (
            "Fill out the form to see quick guidance on Medicaid or Marketplace coverage."
          )}
        </div>
        {healthError ? (
          <p className="mt-2 text-sm text-red-600">
            {healthError || "We had trouble running this check. Please try again or talk to a local helper."}
          </p>
        ) : null}
      </BenefitCard>

      <BenefitCard
        title="Affordable Care Act (Marketplace) plans"
        description="We will show example Marketplace plans, monthly costs, and savings once the data connection is live."
      >
        <button
          type="button"
          className={buttonVariants.secondary}
          onClick={() => placeholderLog("TODO: Marketplace example plans preview")}
        >
          See example plans (coming soon)
        </button>
      </BenefitCard>

      <BenefitCard
        title="Get help applying for health coverage"
        description="Find local people who can help you sign up for Medicaid, CHIP, or Marketplace health plans."
      >
        <p className="text-sm text-slate-600">
          {location ? `Searching near: ${location.displayLabel}` : "Set your location above to search near you."}
        </p>
        <button
          type="button"
          className={`${buttonVariants.primary} mt-3`}
          onClick={handleHealthHelpSearch}
          disabled={localHelpMutation.isPending}
          aria-describedby={!location ? locationAlertId : undefined}
        >
          {localHelpMutation.isPending ? "Searching…" : "Find health coverage help"}
        </button>
        {!location ? (
          <p id={locationAlertId} className="mt-2 text-sm text-amber-700">
            Add your location first so we can look for assisters near you.
          </p>
        ) : null}
        <div className="mt-4 space-y-2">
          <BenefitLocalHelpList
            items={localHelpMutation.data?.items ?? []}
            isLoading={localHelpMutation.isPending}
            errorMessage={localHelpError}
            hasSearched={hasLocalHelpSearched}
            source={localHelpMutation.data?.source}
          />
          <LocalHelpDisclaimer />
          <AmericanJobCenterHint />
        </div>
      </BenefitCard>
      <LearnMoreLinks sectionId="health-coverage" />
    </div>
  );
}

const BAND_DETAILS: Record<
  BenefitsHealthCheckBand,
  {
    title: string;
    body: string;
  }
> = {
  likely_medicaid_or_chip: {
    title: "Medicaid or CHIP may fit",
    body: "Based on your income and family size, you may meet the usual income rules for Medicaid or CHIP in your state.",
  },
  likely_marketplace_with_savings: {
    title: "Marketplace plan with savings",
    body: "You may qualify for savings that lower your monthly Marketplace cost. Compare plans on HealthCare.gov.",
  },
  likely_marketplace_full_price: {
    title: "Marketplace coverage without savings",
    body: "You can still shop for Marketplace coverage, but you may need to pay full price.",
  },
  uncertain_check_state_rules: {
    title: "Check state Medicaid rules",
    body: "Your state has different Medicaid rules. Visit your state Medicaid site or talk with a helper for the next steps.",
  },
};

function HealthCheckResultCard({ result }: { result: BenefitsHealthCheckResponse }) {
  const details = BAND_DETAILS[result.band];
  return (
    <div className="space-y-4 text-sm text-slate-700">
      <div className="space-y-1">
        <p className="text-sm font-semibold text-slate-900">Your quick coverage check</p>
        <p className="text-base font-semibold text-slate-900">{result.summary}</p>
      </div>
      <p className="text-sm text-slate-600">
        Your family income is about {result.fplPercent}% of the federal poverty level for {result.householdSize} {result.householdSize === 1 ? "person" : "people"} in {result.stateCode}.
      </p>
      <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
        <p className="text-sm font-semibold text-slate-900">{details.title}</p>
        <p className="mt-1">{details.body}</p>
      </div>
      <div>
        <p className="text-sm font-semibold text-slate-900">Next steps</p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600">
          {result.programHints.map((hint) => (
            <li key={hint}>{hint}</li>
          ))}
        </ul>
      </div>
      <div className="flex flex-wrap gap-2 text-sm">
        <a href="https://www.healthcare.gov/" target="_blank" rel="noreferrer" className="font-semibold text-brand-primary hover:underline">
          Visit HealthCare.gov
        </a>
        <a href="https://www.medicaid.gov/medicaid/index.html" target="_blank" rel="noreferrer" className="font-semibold text-brand-primary hover:underline">
          Learn about Medicaid
        </a>
      </div>
      <div className="border-t border-slate-200 pt-3 text-xs text-slate-500">
        <ul className="space-y-1">
          {result.disclaimers.map((disclaimer) => (
            <li key={disclaimer}>{disclaimer}</li>
          ))}
        </ul>
        <p className="mt-2 text-[11px]">Data source: {result.source} (updated {result.dataVintage}).</p>
      </div>
    </div>
  );
}

function BillsHousingPanel({ location, promptForLocation }: BenefitPanelHelpers) {
  const localHelpMutation = useLocalHelpSearch();
  const hasSearched = localHelpMutation.isSuccess || localHelpMutation.isError;
  const remoteError = localHelpMutation.isError
    ? "We had trouble loading local programs. Please try again or contact a local American Job Center."
    : undefined;
  const locationAlertId = useId();

  const ensureLocation = useCallback(() => {
    if (!location) {
      promptForLocation();
      return false;
    }
    return true;
  }, [location, promptForLocation]);

  const runLocalHelpSearch = useCallback(
    (kind: BenefitLocalHelpKind) => {
      if (!ensureLocation()) return;
      if (!location) return;
      localHelpMutation.mutate({
        locationText: formatLocalHelpLocation(location),
        latitude: location.latitude,
        longitude: location.longitude,
        kind,
      });
    },
    [ensureLocation, localHelpMutation, location],
  );

  return (
    <div className="space-y-6">
      <PanelGuidance guide={PANEL_GUIDANCE["daily-support"]} />
      <BenefitCard title="Rent and housing help" description="Search for rental aid, shelter referrals, and tenant support.">
        <ul className="space-y-2 text-sm text-slate-600">
          <li className="flex gap-2">
            <span aria-hidden className="text-brand-primary">•</span>
            Housing vouchers, public housing lists, and emergency rent help.
          </li>
          <li className="flex gap-2">
            <span aria-hidden className="text-brand-primary">•</span>
            Tenant rights info and shelter referrals.
          </li>
        </ul>
        <p className="mt-3 text-sm text-slate-600">
          {location ? `Using: ${location.displayLabel}` : "Add your city or ZIP to search near you."}
        </p>
        {!location ? (
          <p id={locationAlertId} className="text-sm text-amber-700">
            Add your location above to find nearby programs.
          </p>
        ) : null}
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            className={buttonVariants.primary}
            onClick={() => runLocalHelpSearch("housing")}
            disabled={localHelpMutation.isPending}
            aria-describedby={!location ? locationAlertId : undefined}
          >
            {localHelpMutation.isPending ? "Searching…" : "Find housing help near me"}
          </button>
          <Link href="/housing-utilities" className={`${buttonVariants.link} text-sm`}>
            See housing and rent data
          </Link>
        </div>
      </BenefitCard>

      <BenefitCard
        title="Help with utility bills"
        description="Energy, water, and phone or internet discount programs."
      >
        <p className="text-sm text-slate-600">
          {location ? `Searching near: ${location.displayLabel}` : "Add your city or ZIP to search for bill help nearby."}
        </p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            className={buttonVariants.primary}
            onClick={() => runLocalHelpSearch("bills")}
            disabled={localHelpMutation.isPending}
            aria-describedby={!location ? locationAlertId : undefined}
          >
            {localHelpMutation.isPending ? "Searching…" : "Find help with bills"}
          </button>
          <Link href="/housing-utilities" className={`${buttonVariants.link} text-sm`}>
            See local utility costs
          </Link>
        </div>
      </BenefitCard>

      <BenefitCard title="Childcare, school meals, and daily support">
        <ul className="space-y-2 text-sm text-slate-600">
          <li className="flex gap-2">
            <span aria-hidden className="text-brand-primary">•</span>
            Subsidized childcare, Head Start, and summer care spots.
          </li>
          <li className="flex gap-2">
            <span aria-hidden className="text-brand-primary">•</span>
            Free or reduced-price school meals and weekend food packs.
          </li>
          <li className="flex gap-2">
            <span aria-hidden className="text-brand-primary">•</span>
            Transportation, diapers, or hygiene support where available.
          </li>
        </ul>
        <button
          type="button"
          className={`${buttonVariants.primary} mt-4`}
          onClick={() => runLocalHelpSearch("kids")}
          disabled={localHelpMutation.isPending}
          aria-describedby={!location ? locationAlertId : undefined}
        >
          {localHelpMutation.isPending ? "Searching…" : "Find programs for kids & families"}
        </button>
      </BenefitCard>

      <div className="space-y-2">
        <BenefitLocalHelpList
          items={localHelpMutation.data?.items ?? []}
          isLoading={localHelpMutation.isPending}
          errorMessage={remoteError}
          hasSearched={hasSearched}
          source={localHelpMutation.data?.source}
        />
        <LocalHelpDisclaimer />
        <AmericanJobCenterHint />
      </div>
      <LearnMoreLinks sectionId="daily-support" />
    </div>
  );
}

function SecurityDisabilityPanel({ location, promptForLocation }: BenefitPanelHelpers) {
  const localHelpMutation = useLocalHelpSearch();
  const hasSearched = localHelpMutation.isSuccess || localHelpMutation.isError;
  const remoteError = localHelpMutation.isError
    ? "We had trouble loading local programs. Please try again or contact a local American Job Center."
    : undefined;
  const locationAlertId = useId();

  const normalizedStateCode = resolveStateCode(location?.stateCode);
  const stateCodeForStats = normalizedStateCode ?? "MS";
  const isExampleState = !normalizedStateCode;

  const socialStatsQuery = useQuery({
    queryKey: ["benefits-social-security-stats", stateCodeForStats],
    queryFn: () => fetchStateSocialSecurityStats(stateCodeForStats),
    staleTime: 300_000,
    enabled: Boolean(stateCodeForStats),
  });

  const statsResponse = socialStatsQuery.data;
  const stats = statsResponse?.stats ?? null;
  const statsError = socialStatsQuery.error instanceof Error ? socialStatsQuery.error.message : null;

  const formatPercent = (value: number | null) => (typeof value === "number" ? percentFormatter.format(value) : "Not available");
  const formatNumberValue = (value: number | null) => (typeof value === "number" ? numberFormatter.format(value) : "Not available");

  const statsContent = (() => {
    if (socialStatsQuery.isPending) {
      return <p className="text-sm text-slate-600">Loading Social Security facts…</p>;
    }
    if (statsError) {
      return <p className="text-sm text-red-600">We had trouble loading Social Security facts. Please try again later.</p>;
    }
    if (!stats) {
      return <p className="text-sm text-slate-600">We do not have Social Security stats for this state yet.</p>;
    }
    const shareResidents = describeShareOutOfHundred(stats.shareReceivingBenefits, `people in ${stats.stateName} get Social Security`);
    const share65Plus = describeShareOutOfHundred(
      stats.share65PlusReceivingBenefits,
      `people age 65 or older in ${stats.stateName} get Social Security`,
    );
    return (
      <div className="space-y-4 text-sm text-slate-600">
        <p>
          In {stats.stateName}, about <span className="font-semibold text-slate-900">{formatNumberValue(stats.totalReceivingBenefits)}</span> people get
          Social Security benefits.
        </p>
        <dl className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-inner shadow-slate-200/60">
            <dt className="text-sm font-semibold text-slate-900">Share of all residents</dt>
            <dd className="mt-1 text-2xl font-semibold text-slate-900">{formatPercent(stats.shareReceivingBenefits)}</dd>
            <p className="mt-2 text-sm text-slate-600">{shareResidents}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-inner shadow-slate-200/60">
            <dt className="text-sm font-semibold text-slate-900">Share of residents 65+</dt>
            <dd className="mt-1 text-2xl font-semibold text-slate-900">{formatPercent(stats.share65PlusReceivingBenefits)}</dd>
            <p className="mt-2 text-sm text-slate-600">{share65Plus}</p>
          </div>
        </dl>
        <p>{formatNumberValue(stats.total65PlusReceivingBenefits)} people age 65+ get Social Security in this state.</p>
        {isExampleState ? (
          <p className="text-xs text-slate-500">This is an example for {stats.stateName}. Add your location above to see your state.</p>
        ) : null}
        <p className="text-xs text-slate-500">
          Source: {statsResponse?.source}. Data vintage {statsResponse?.dataVintage ?? stats.year ?? "2015"}.
        </p>
      </div>
    );
  })();

  const ensureLocation = useCallback(() => {
    if (!location) {
      promptForLocation();
      return false;
    }
    return true;
  }, [location, promptForLocation]);

  const runLocalHelpSearch = useCallback(
    (kind: BenefitLocalHelpKind) => {
      if (!ensureLocation()) return;
      if (!location) return;
      localHelpMutation.mutate({
        locationText: formatLocalHelpLocation(location),
        latitude: location.latitude,
        longitude: location.longitude,
        kind,
      });
    },
    [ensureLocation, localHelpMutation, location],
  );

  return (
    <div className="space-y-6">
      <PanelGuidance guide={PANEL_GUIDANCE["security-disability"]} />
      <SocialSecurityOfficesPanel location={location} promptForLocation={promptForLocation} />
      <BenefitCard
        title="Social Security and disability checks"
        description="Covers retirement, disability (SSDI), survivors, and family benefits."
      >
        {statsContent}
        <p className="mt-4 text-sm text-slate-600">
          {location
            ? `Using your saved location: ${location.displayLabel}.`
            : "Add your location above to see state facts and nearby Social Security offices."}
        </p>
        {!location ? (
          <p id={locationAlertId} className="text-sm text-amber-700">
            Enter your location to search for nearby SSA offices or helpers.
          </p>
        ) : null}
        <button
          type="button"
          className={`${buttonVariants.primary} mt-4`}
          onClick={() => runLocalHelpSearch("social-security")}
          disabled={localHelpMutation.isPending}
          aria-describedby={!location ? locationAlertId : undefined}
        >
          {localHelpMutation.isPending ? "Searching…" : "Find help with Social Security"}
        </button>
      </BenefitCard>

      <BenefitCard
        title="SSI vs SSDI – what’s the difference?"
        description="SSI is needs-based for people with limited income and resources. SSDI is based on work credits and payroll taxes. Some people can get both."
      >
        <button
          type="button"
          className={buttonVariants.secondary}
          onClick={() => runLocalHelpSearch("social-security")}
          disabled={localHelpMutation.isPending}
          aria-describedby={!location ? locationAlertId : undefined}
        >
          {localHelpMutation.isPending ? "Searching…" : "Get help applying"}
        </button>
      </BenefitCard>

      <BenefitCard
        title="Veterans benefits and legal help"
        description="Find help with VA benefits and free or low-cost legal aid for benefit problems."
      >
        <button
          type="button"
          className={buttonVariants.primary}
          onClick={() => runLocalHelpSearch("veterans")}
          disabled={localHelpMutation.isPending}
          aria-describedby={!location ? locationAlertId : undefined}
        >
          {localHelpMutation.isPending ? "Searching…" : "Find veterans or legal help"}
        </button>
      </BenefitCard>

      <div className="space-y-2">
        <h3 className="text-base font-semibold text-slate-900">Other helpers near you</h3>
        <BenefitLocalHelpList
          items={localHelpMutation.data?.items ?? []}
          isLoading={localHelpMutation.isPending}
          errorMessage={remoteError}
          hasSearched={hasSearched}
          source={localHelpMutation.data?.source}
        />
        <LocalHelpDisclaimer />
        <AmericanJobCenterHint />
      </div>
      <LearnMoreLinks sectionId="security-disability" />
    </div>
  );
}
