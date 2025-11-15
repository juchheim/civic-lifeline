"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { BenefitsLocation } from "@/app/benefits/useBenefitsLocation";
import { useSocialSecurityOffices } from "@/app/benefits/useSocialSecurityOffices";
import type { SocialSecurityFieldOffice } from "@cl/types";

interface SocialSecurityOfficesPanelProps {
  location: BenefitsLocation | null;
  promptForLocation: () => void;
}

const SSA_LOCATOR_URL = "https://www.ssa.gov/locator/";
const SSA_PHONE = "1-800-772-1213";
const SSA_TTY = "1-800-325-0778";
const MAX_DEFAULT_VISIBLE = 3;

export function SocialSecurityOfficesPanel({ location, promptForLocation }: SocialSecurityOfficesPanelProps) {
  const [showAll, setShowAll] = useState(false);
  const { offices, meta, isLoading, isError, refetch } = useSocialSecurityOffices(location);

  const hasLocation = Boolean(location?.latitude && location?.longitude && location?.stateCode);
  const resolvedOffices = offices ?? [];
  const visibleOffices = showAll ? resolvedOffices : resolvedOffices.slice(0, MAX_DEFAULT_VISIBLE);

  const officeList = useMemo(() => {
    if (visibleOffices.length === 0) return null;
    return (
      <ul className="mt-4 space-y-3">
        {visibleOffices.map((office) => (
          <li key={office.id} className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-inner shadow-slate-200/70">
            <p className="text-base font-semibold text-slate-900">{office.name}</p>
            <p className="mt-1 text-sm text-slate-600">{formatAddress(office)}</p>
            <div className="mt-2 flex flex-wrap gap-3 text-sm text-slate-700">
              {office.phone ? (
                <a href={`tel:${normalizePhoneHref(office.phone)}`} className="font-semibold text-brand-primary underline-offset-4 hover:underline">
                  {office.phone}
                </a>
              ) : (
                <span>No phone listed</span>
              )}
              {summarizeHours(office) ? <span>{summarizeHours(office)}</span> : null}
            </div>
          </li>
        ))}
      </ul>
    );
  }, [visibleOffices]);

  const footerLink = (
    <p className="text-xs text-slate-500">
      Data source: <span className="font-semibold">Social Security Administration.</span>{" "}
      <a href={meta?.datasetUrl ?? SSA_LOCATOR_URL} target="_blank" rel="noreferrer" className="font-semibold text-brand-primary underline-offset-4 hover:underline">
        Learn more
      </a>
      {meta?.notes ? ` — ${meta.notes}` : null}
    </p>
  );

  let content: React.ReactNode;
  if (!hasLocation) {
    content = (
      <div className="mt-2 text-sm text-slate-600">
        <p>Tell us where you are so we can find your nearest Social Security offices.</p>
        <button
          type="button"
          className="mt-3 inline-flex items-center rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          onClick={promptForLocation}
        >
          Update your location
        </button>
      </div>
    );
  } else if (isLoading && resolvedOffices.length === 0) {
    content = <p className="mt-2 text-sm text-slate-600">Looking up Social Security offices near you…</p>;
  } else if (isError) {
    content = (
      <div className="mt-2 space-y-2 text-sm text-slate-600">
        <p>We couldn&apos;t load local Social Security offices right now. Please try again in a few minutes or use the SSA office locator.</p>
        <button
          type="button"
          className="inline-flex items-center rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          onClick={() => {
            setShowAll(false);
            refetch();
          }}
        >
          Try again
        </button>
      </div>
    );
  } else if (resolvedOffices.length > 0) {
    content = (
      <div className="mt-2 text-sm text-slate-600">
        <p>Closest Social Security offices based on your location.</p>
        {officeList}
        {resolvedOffices.length > MAX_DEFAULT_VISIBLE ? (
          <button
            type="button"
            className="mt-3 text-sm font-semibold text-brand-primary underline-offset-4 hover:underline"
            onClick={() => setShowAll((prev) => !prev)}
          >
            {showAll ? "Show fewer offices" : "View more offices"}
          </button>
        ) : null}
      </div>
    );
  } else {
    content = (
      <div className="mt-2 text-sm text-slate-600">
        <p>We couldn&apos;t find a Social Security office within 50 miles of this location.</p>
        <p className="mt-2">You can still call SSA or use the online office locator below.</p>
      </div>
    );
  }

  return (
    <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div>
        <h3 className="text-lg font-semibold text-slate-900">Social Security offices near you</h3>
        {content}
      </div>
      <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm text-slate-700">
        <p className="font-semibold text-slate-900">Need help right away?</p>
        <p className="mt-1">
          Call SSA at{" "}
          <a href={`tel:${SSA_PHONE}`} className="font-semibold text-brand-primary underline-offset-4 hover:underline">
            {SSA_PHONE}
          </a>{" "}
          or TTY{" "}
          <a href={`tel:${SSA_TTY}`} className="font-semibold text-brand-primary underline-offset-4 hover:underline">
            {SSA_TTY}
          </a>
          .
        </p>
        <p className="mt-1">
          <Link href={SSA_LOCATOR_URL} target="_blank" rel="noreferrer" className="font-semibold text-brand-primary underline-offset-4 hover:underline">
            Use the official SSA office locator
          </Link>{" "}
          to search by ZIP code.
        </p>
      </div>
      {footerLink}
    </section>
  );
}

function formatAddress(office: SocialSecurityFieldOffice): string {
  const lines = [office.address1];
  if (office.address2) lines.push(office.address2);
  lines.push(`${office.city}, ${office.state} ${office.postalCode}`);
  return lines.filter(Boolean).join(", ");
}

function normalizePhoneHref(value: string): string {
  return value.replace(/[^\d+]/g, "");
}

function summarizeHours(office: SocialSecurityFieldOffice): string | null {
  const entries: Array<[string, string | null | undefined]> = [
    ["Mon", office.mondayHours],
    ["Tue", office.tuesdayHours],
    ["Wed", office.wednesdayHours],
    ["Thu", office.thursdayHours],
    ["Fri", office.fridayHours],
  ];
  const available = entries.filter(([, hours]) => typeof hours === "string" && hours.length > 0) as Array<[string, string]>;
  if (available.length === 0) return null;
  const firstHours = available[0][1];
  const sameForAll = available.every(([, hours]) => hours === firstHours);
  if (sameForAll && available.length >= 3) {
    return `Mon–Fri: ${firstHours}`;
  }
  return available.map(([label, hours]) => `${label}: ${hours}`).join(" · ");
}
