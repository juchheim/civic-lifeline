"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import type { LucideIcon } from "lucide-react";
import { ChevronDown, Clock, Droplets, Home, Sparkles, Wifi } from "lucide-react";
import type { LocationInputWithGeocodeHandle } from "@/components/LocationInputWithGeocode";
import { HeroLocationCard } from "@/components/location/HeroLocationCard";
import { SharedLocationProvider, useSharedLocation } from "@/components/location/SharedLocationContext";
import UtilitiesExperience from "./UtilitiesExperience";
import type { SharedLocation } from "@/components/location/SharedLocationContext";

type HousingExperienceProps = {
  showIntro?: boolean;
  wrapperClassName?: string;
  id?: string;
  location?: SharedLocation | null;
  promptForLocation?: () => void;
};

type BroadbandExperienceProps = {
  showIntro?: boolean;
  wrapperClassName?: string;
  id?: string;
  location?: SharedLocation | null;
  promptForLocation?: () => void;
};

const HousingExperience = dynamic<HousingExperienceProps>(
  () => import("../housing/HousingExperience"),
  {
    ssr: false,
  }
);
const BroadbandExperience = dynamic<BroadbandExperienceProps>(
  () => import("../broadband/BroadbandExperience"),
  {
    ssr: false,
  }
);

type BaseServiceConfig = {
  id: string;
  label: string;
  pillText: string;
  icon: LucideIcon;
  status?: "new" | "coming-soon";
};

type ServiceConfig = BaseServiceConfig & {
  render: () => ReactNode;
};

const BASE_SERVICE_CONFIGS: BaseServiceConfig[] = [
  {
    id: "housing",
    label: "Housing Support",
    pillText: "Find rent limits and counselors",
    icon: Home,
  },
  {
    id: "internet",
    label: "Internet & Broadband",
    pillText: "Find coverage and speeds",
    icon: Wifi,
  },
  {
    id: "utilities",
    label: "Utilities Assistance",
    pillText: "Find costs and providers",
    icon: Droplets,
  },
];

const PRIMARY_SERVICE_ID = BASE_SERVICE_CONFIGS[0]?.id ?? "housing";

function HousingUtilitiesContent() {
  const [openSections, setOpenSections] = useState<string[]>([PRIMARY_SERVICE_ID]);
  const [activeSection, setActiveSection] = useState<string>(PRIMARY_SERVICE_ID);
  const [jumpMenuOpen, setJumpMenuOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number; width: number } | null>(null);
  const jumpButtonRef = useRef<HTMLButtonElement | null>(null);
  const jumpMenuRef = useRef<HTMLDivElement | null>(null);
  const isManualNavigationRef = useRef<boolean>(false);
  const { location } = useSharedLocation();
  const locationCardRef = useRef<HTMLDivElement | null>(null);
  const locationInputRef = useRef<LocationInputWithGeocodeHandle | null>(null);

  const promptForLocation = useCallback(() => {
    locationCardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    setTimeout(() => {
      locationInputRef.current?.focusInput();
    }, 200);
  }, []);

  const serviceConfigs = useMemo<ServiceConfig[]>(() => {
    return BASE_SERVICE_CONFIGS.map((config) => {
      if (config.id === "housing") {
        return {
          ...config,
          render: () => <HousingExperience showIntro={false} location={location} promptForLocation={promptForLocation} />,
        };
      }
      if (config.id === "internet") {
        return {
          ...config,
          render: () => <BroadbandExperience showIntro={false} location={location} promptForLocation={promptForLocation} />,
        };
      }
      return {
        ...config,
        render: () => <UtilitiesExperience location={location} promptForLocation={promptForLocation} />,
      };
    });
  }, [location, promptForLocation]);

  const serviceIds = useMemo(() => serviceConfigs.map((service) => service.id), [serviceConfigs]);

  const updateMenuPosition = useCallback(() => {
    if (!jumpButtonRef.current) return;
    const rect = jumpButtonRef.current.getBoundingClientRect();
    setMenuPosition({ top: rect.bottom + 8, left: rect.left, width: rect.width });
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(min-width: 1024px)");
    if (media.matches) {
      setOpenSections(serviceIds);
    }
    const listener = (event: MediaQueryListEvent) => {
      setOpenSections(event.matches ? serviceIds : [PRIMARY_SERVICE_ID]);
    };
    if (typeof media.addEventListener === "function") {
      media.addEventListener("change", listener);
      return () => media.removeEventListener("change", listener);
    }
    if (typeof media.addListener === "function") {
      media.addListener(listener);
      return () => media.removeListener(listener);
    }
    return undefined;
  }, [serviceIds]);

  useEffect(() => {
    const sections = serviceConfigs.map((service) => document.getElementById(`service-${service.id}`)).filter(
      (node): node is HTMLElement => Boolean(node),
    );
    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (isManualNavigationRef.current) return;
        const visible = entries.filter((entry) => entry.isIntersecting);
        if (visible.length === 0) return;
        visible.sort((a, b) => Math.abs(a.boundingClientRect.top) - Math.abs(b.boundingClientRect.top));
        const next = visible[0]?.target.getAttribute("data-service-id");
        if (next) {
          setActiveSection((current) => (current === next ? current : next));
        }
      },
      { rootMargin: "-25% 0px -55% 0px", threshold: [0, 0.2, 0.4, 0.6] },
    );

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [serviceConfigs]);

  useEffect(() => {
    if (!jumpMenuOpen) {
      setMenuPosition(null);
      return;
    }
    updateMenuPosition();
    const handleReflow = () => updateMenuPosition();
    window.addEventListener("resize", handleReflow);
    window.addEventListener("scroll", handleReflow, true);
    const handlePointer = (event: MouseEvent) => {
      const target = event.target as Node;
      if (jumpMenuRef.current?.contains(target) || jumpButtonRef.current?.contains(target)) {
        return;
      }
      setJumpMenuOpen(false);
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setJumpMenuOpen(false);
    };
    document.addEventListener("mousedown", handlePointer);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handlePointer);
      document.removeEventListener("keydown", handleEscape);
      window.removeEventListener("resize", handleReflow);
      window.removeEventListener("scroll", handleReflow, true);
    };
  }, [jumpMenuOpen, updateMenuPosition]);

  const expandAll = useCallback(() => {
    setOpenSections(serviceIds);
  }, [serviceIds]);

  const collapseToPrimary = useCallback(() => {
    setOpenSections([PRIMARY_SERVICE_ID]);
    setActiveSection(PRIMARY_SERVICE_ID);
    const section = document.getElementById(`service-${PRIMARY_SERVICE_ID}`);
    if (section) {
      section.scrollIntoView({ behavior: "smooth", block: "start" });
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
    isManualNavigationRef.current = true;
    const section = document.getElementById(`service-${id}`);
    if (section) {
      section.scrollIntoView({ behavior: "smooth", block: "start" });
      setTimeout(() => {
        isManualNavigationRef.current = false;
      }, 1000);
    } else {
      isManualNavigationRef.current = false;
    }
  }, []);

  const handleJumpSelect = useCallback(
    (id: string) => {
      handleNavClick(id);
      setJumpMenuOpen(false);
    },
    [handleNavClick],
  );

  const heroHighlights = useMemo(
    () => [
      "Know fair market prices in your area before you rent.",
      "Find out if you are likely to have internet access.",
      "Learn about local utilities.",
    ],
    [],
  );

  return (
    <div className="space-y-12 pb-16 bg-neutral-bg">
      <section className="mt-4 overflow-hidden rounded-[2.5rem] border border-slate-200 bg-white shadow-lg shadow-slate-400/10">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1fr)] lg:items-stretch">
          <div className="flex flex-col justify-between px-6 py-8 sm:px-10 sm:pt-8 sm:pb-12">
            <div className="space-y-4">
              <span className="inline-flex w-fit items-center gap-2 rounded-full border border-brand-primary/20 bg-brand-primary/10 px-4 py-1.5 text-sm font-semibold uppercase tracking-[0.24em] text-brand-primary">
                <Home className="h-4 w-4" />
                Housing & Utilities
              </span>
              <h1 className="text-3xl font-semibold leading-[1.1] text-slate-900 sm:text-[2.5rem]">
                Everything you need to know before renting or buying.
              </h1>
              <p className="max-w-xl text-base leading-normal text-slate-600 sm:text-lg">
                Choose a service, enter your location and see local data.
              </p>
              <HeroLocationCard
                stepLabel="STEP 1: ADD YOUR CITY OR ZIP"
                className="mt-6"
                cardRef={locationCardRef}
                inputHandleRef={locationInputRef}
                description="We use this to show nearby programs and stats. We do not save your address."
                statusFormatter={(label) => (location?.countyName ? `${label} (${location.countyName})` : label)}
              />
            </div>
            <div className="relative z-10 mt-8 w-full max-w-xs">
              <button
                ref={jumpButtonRef}
                type="button"
                onClick={() => setJumpMenuOpen((prev) => !prev)}
                aria-haspopup="menu"
                aria-expanded={jumpMenuOpen}
                aria-controls="hero-jump-menu"
                className="inline-flex w-full items-center justify-between gap-3 rounded-full bg-brand-primary px-5 py-3 text-base font-semibold text-white shadow-lg shadow-brand-primary/30 transition-colors duration-200 hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2"
              >
                <span>Jump to a service</span>
                <ChevronDown className={`h-4 w-4 transition-transform ${jumpMenuOpen ? "rotate-180" : ""}`} />
              </button>
              {jumpMenuOpen &&
                menuPosition &&
                createPortal(
                  <div
                    id="hero-jump-menu"
                    ref={jumpMenuRef}
                    role="menu"
                    className="z-[1000] rounded-2xl border border-brand-primary/20 bg-white p-2 text-slate-700 shadow-2xl shadow-brand-primary/20"
                    style={{
                      position: "fixed",
                      top: menuPosition.top,
                      left: menuPosition.left,
                      width: menuPosition.width,
                    }}
                  >
                    {serviceConfigs.map((service) => {
                      const Icon = service.icon;
                      return (
                        <button
                          key={service.id}
                          type="button"
                          role="menuitem"
                          onClick={() => handleJumpSelect(service.id)}
                          className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm font-semibold transition hover:bg-brand-primary/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
                        >
                          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-primary/10 text-brand-primary">
                            <Icon className="h-4 w-4" />
                          </span>
                          <div>
                            <p>{service.label}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>,
                  document.body,
                )}
            </div>
          </div>
          <div className="relative">
            <div className="absolute inset-0 bg-info-tint" aria-hidden />
            <div className="relative flex h-full flex-col justify-between gap-6 rounded-t-3xl bg-info-tint px-6 py-8 text-slate-900 sm:px-10 lg:rounded-none">
              <div className="space-y-4">
                <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-600">Why it matters</p>
                <ul className="space-y-2">
                  {heroHighlights.map((highlight) => (
                    <li key={highlight} className="flex items-start gap-3 text-base leading-relaxed text-slate-700 sm:text-lg">
                      <span className="mt-[0.625rem] h-2 w-2 shrink-0 rounded-full bg-brand-accent/60" aria-hidden />
                      <span>{highlight}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-2xl border border-brand-accent/20 bg-white/80 p-5 text-base leading-relaxed text-slate-800 shadow-inner shadow-brand-accent/10 sm:text-lg">
                <p className="font-semibold text-slate-800">Simple help in one place</p>
                <p className="mt-2">
                  All your government data in one place. No need to search multiple sites or agencies.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,0.32fr)_minmax(0,1fr)]">
        <div className="space-y-4 lg:sticky lg:top-24 lg:self-start lg:-translate-y-5">
          <div className="lg:hidden">
            <p className="text-sm font-semibold text-slate-700">Pick a service</p>
            <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
              {serviceConfigs.map((service) => {
                const Icon = service.icon;
                const isActive = activeSection === service.id;
                return (
                  <button
                    key={service.id}
                    type="button"
                    data-nav-target={service.id}
                    onClick={() => handleNavClick(service.id)}
                    className={`flex min-w-[220px] items-center gap-3 rounded-2xl border px-4 py-3 text-left text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 ${
                      isActive
                        ? "border-brand-primary bg-brand-primary/10 text-brand-primary shadow-inner shadow-brand-primary/20"
                        : "border-slate-200 bg-white text-slate-700 hover:border-brand-primary/40 hover:text-brand-primary"
                    }`}
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-brand-primary shadow-sm">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span>{service.label}</span>
                  </button>
                );
              })}
            </div>
            <div className="mt-3 flex gap-3 text-xs font-semibold text-brand-primary">
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
                Collapse to housing
              </button>
            </div>
          </div>

          <div className="hidden lg:block">
            <div className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-lg shadow-slate-400/10">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Jump to a service</p>
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
                    Collapse to housing
                  </button>
                </div>
              </div>
              <nav aria-label="Housing and utilities sections" className="flex flex-col gap-2">
                {serviceConfigs.map((service) => {
                  const Icon = service.icon;
                  const isActive = activeSection === service.id;
                  return (
                    <button
                      key={service.id}
                      type="button"
                      data-nav-target={service.id}
                      onClick={() => handleNavClick(service.id)}
                    className={`flex items-center justify-between gap-3 rounded-2xl px-4 py-3 text-left text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 ${
                      isActive
                        ? "bg-brand-primary text-white shadow-lg shadow-brand-primary/30"
                        : "bg-slate-100 text-slate-600 hover:bg-brand-primary/10 hover:text-brand-primary"
                    }`}
                      aria-current={isActive ? "true" : "false"}
                    >
                      <span className="flex items-center gap-2">
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/60 text-brand-primary shadow-sm">
                          <Icon className="h-4 w-4" />
                        </span>
                        {service.label}
                      </span>
                      <ChevronDown
                        style={{
                          transform: isActive ? "rotate(270deg)" : "rotate(180deg)",
                          transition: "transform 300ms ease-in-out",
                        }}
                        className="h-4 w-4"
                        aria-hidden
                      />
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-6">
          {serviceConfigs.map((service) => (
            <ServicePanel
              key={service.id}
              service={service}
              isOpen={openSections.includes(service.id)}
              onToggle={handleToggle}
              isActive={activeSection === service.id}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

interface ServicePanelProps {
  service: ServiceConfig;
  isOpen: boolean;
  onToggle: (id: string) => void;
  isActive: boolean;
}

function ServicePanel({ service, isOpen, onToggle, isActive }: ServicePanelProps) {
  const Icon = service.icon;
  const panelId = `service-panel-${service.id}`;
  const buttonId = `service-trigger-${service.id}`;
  const contentRef = useRef<HTMLDivElement | null>(null);
  const previousOpen = useRef<boolean>(isOpen);

  useEffect(() => {
    if (isOpen && !previousOpen.current) {
      contentRef.current?.focus({ preventScroll: true });
    }
    previousOpen.current = isOpen;
  }, [isOpen]);

  const statusChip =
    service.status === "new"
      ? { label: "New layout", className: "bg-civic-green/10 text-civic-green border-civic-green/20", Icon: Sparkles }
      : service.status === "coming-soon"
        ? { label: "Coming soon", className: "bg-amber-100 text-amber-700 border-amber-200", Icon: Clock }
        : null;

  const content = useMemo(() => service.render(), [service]);

  return (
    <section
      id={`service-${service.id}`}
      data-service-id={service.id}
      className={`overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-lg shadow-slate-400/10 transition ring-offset-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary ${
        isActive ? "ring-1 ring-brand-primary/40" : ""
      }`}
      tabIndex={-1}
      aria-labelledby={buttonId}
    >
      <button
        id={buttonId}
        type="button"
        onClick={() => onToggle(service.id)}
        className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2"
        aria-expanded={isOpen}
        aria-controls={panelId}
      >
        <div className="flex flex-1 items-center gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-primary/10 text-brand-primary shadow-inner shadow-brand-primary/10">
            <Icon className="h-5 w-5" />
          </span>
          <div className="flex flex-col gap-1">
            <span className="text-2xl font-semibold text-slate-900">{service.label}</span>
            {statusChip && (
              <span
                className={`mt-2 inline-flex w-fit items-center gap-1 rounded-full border px-3 py-0.5 text-xs font-semibold ${statusChip.className}`}
              >
                <statusChip.Icon className="h-3.5 w-3.5" />
                {statusChip.label}
              </span>
            )}
          </div>
        </div>
        <ChevronDown
          className={`h-5 w-5 text-slate-500 transition-transform ${isOpen ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
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
          className="space-y-4 border-t border-slate-200 px-6 pb-6 pt-5 focus:outline-none"
        >
          <span className="inline-flex items-center rounded-full border border-orange-200 bg-orange-100 px-3 py-1 text-sm font-medium text-orange-700">
            {service.pillText}
          </span>
          <div className="space-y-6">{content}</div>
        </div>
      </div>
    </section>
  );
}

export default function HousingUtilitiesClient() {
  return (
    <SharedLocationProvider>
      <HousingUtilitiesContent />
    </SharedLocationProvider>
  );
}
