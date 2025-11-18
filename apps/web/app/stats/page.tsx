"use client";

import dynamic from "next/dynamic";
import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import EducationLevelCard from "@/components/EducationLevelCard";
import HousingBurdenCard from "@/components/HousingBurdenCard";
import MedianIncomeCard from "@/components/MedianIncomeCard";
import PovertyStatCard from "@/components/PovertyStatCard";
import SnapParticipationCard from "@/components/SnapParticipationCard";
import UninsuredRateCard from "@/components/UninsuredRateCard";
import SourceChip from "@/components/SourceChip";
import { zUnemploymentResponse, County } from "@cl/types";
import { HeroLocationCard } from "@/components/location/HeroLocationCard";
import {
  SharedLocationProvider,
  useSharedLocation,
  type SharedLocation,
} from "@/components/location/SharedLocationContext";
import { resolveStateCode } from "@/lib/location/stateCodes";
import { BarChart } from "lucide-react";

const TimeSeriesChart = dynamic(() => import("@/components/TimeSeriesChart"), { ssr: false });

function normalizeCountyName(value?: string | null) {
  if (!value) return null;
  return value
    .toLowerCase()
    .replace(/ county$/i, "")
    .replace(/ parish$/i, "")
    .replace(/ borough$/i, "")
    .replace(/ census area$/i, "")
    .replace(/ municipality$/i, "")
    .replace(/ city and borough$/i, "")
    .trim();
}

function StatsPageContent() {
  const isBrowser = typeof window !== "undefined";
  const [selectedStateCode, setSelectedStateCode] = useState<string | null>(null);
  const [countyFips, setCountyFips] = useState<string | null>(null);
  const start = 2018;
  const end = 2025;
  const { location } = useSharedLocation();
  const [pendingLocation, setPendingLocation] = useState<SharedLocation | null>(null);
  const lastAppliedLocationLabelRef = useRef<string | null>(null);

  // Fetch counties for selected state
  const {
    data: counties = [],
    isFetching: isFetchingCounties,
  } = useQuery<County[]>({
    queryKey: ["counties", selectedStateCode],
    queryFn: async () => {
      const res = await fetch(`/api/counties?stateCode=${selectedStateCode}`);
      if (!res.ok) throw new Error("Failed to fetch counties");
      return res.json();
    },
    staleTime: Infinity,
    enabled: isBrowser && Boolean(selectedStateCode),
  });

  const selectedCounty = useMemo(() => {
    if (!countyFips) return undefined;
    return counties.find((county) => county.fips === countyFips) ?? undefined;
  }, [counties, countyFips]);

  const stateFips: string | undefined = selectedCounty?.stateFips ? selectedCounty.stateFips : undefined;
  const countyName: string | undefined = selectedCounty?.name ? selectedCounty.name : undefined;

  useEffect(() => {
    if (!location || !location.displayLabel) {
      setSelectedStateCode(null);
      setCountyFips(null);
      setPendingLocation(null);
      lastAppliedLocationLabelRef.current = null;
      return;
    }
    const label = location.displayLabel;
    if (lastAppliedLocationLabelRef.current === label) {
      return;
    }
    setPendingLocation(location);
  }, [location]);

  const applyLocationToSelectors = useCallback(
    (target: SharedLocation) => {
      const label = target.displayLabel ?? null;
      const stateCodeFromLocation =
        resolveStateCode(target.stateCode) ?? resolveStateCode(target.stateName);

      if (!stateCodeFromLocation) {
        lastAppliedLocationLabelRef.current = label;
        setSelectedStateCode(null);
        setCountyFips(null);
        return true;
      }

      if (stateCodeFromLocation !== selectedStateCode) {
        setSelectedStateCode(stateCodeFromLocation);
        setCountyFips(null);
        return false;
      }

      if (!counties.length) {
        return false;
      }

      const countiesMatchState = counties.some((county) => county.stateCode === stateCodeFromLocation);
      if (!countiesMatchState) {
        return false;
      }

      const normalizedTargetCounty = normalizeCountyName(target.countyName);
      if (normalizedTargetCounty) {
        const match = counties.find(
          (county) => normalizeCountyName(county.name) === normalizedTargetCounty,
        );
        if (match && match.fips !== countyFips) {
          setCountyFips(match.fips);
          lastAppliedLocationLabelRef.current = label;
          return true;
        }
      }

      lastAppliedLocationLabelRef.current = label;
      return true;
    },
    [counties, countyFips, selectedStateCode],
  );

  useEffect(() => {
    if (!pendingLocation) return;
    const applied = applyLocationToSelectors(pendingLocation);
    if (applied) {
      setPendingLocation(null);
    }
  }, [pendingLocation, applyLocationToSelectors, counties, selectedStateCode]);

  const fetcher = async () => {
    if (!isBrowser) {
      throw new Error("Window is undefined");
    }
    if (!countyFips) {
      throw new Error("County FIPS is required");
    }
    const url = new URL("/api/jobs/unemployment", window.location.origin);
    url.searchParams.set("countyFips", countyFips);
    url.searchParams.set("start", String(start));
    url.searchParams.set("end", String(end));
    const res = await fetch(url.toString(), { headers: { accept: "application/json" } });
    if (!res.ok) throw new Error("BLS unavailable");
    const json = await res.json();
    return zUnemploymentResponse.parse(json);
  };

  const { data, isLoading, isError } = useQuery({
    queryKey: ["laus", countyFips ?? "", start, end],
    queryFn: fetcher,
    staleTime: 300_000,
    retry: 1,
    placeholderData: (prev) => prev as any,
    enabled: isBrowser && Boolean(countyFips),
  });

  const points = countyFips && data?.points ? data.points : [];
  const hasCountySelection = Boolean(countyFips);

  return (
    <main className="space-y-12 bg-neutral-bg pb-16">
      <section className="mt-4 overflow-hidden rounded-[2.5rem] border border-slate-200 bg-white shadow-lg shadow-slate-400/10">
        <div className="space-y-8 px-6 py-8 sm:px-10">
          <header className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-4">
              <span className="inline-flex w-fit items-center gap-2 rounded-full border border-brand-primary/20 bg-brand-primary/10 px-4 py-1.5 text-sm font-semibold uppercase tracking-[0.24em] text-brand-primary">
                <BarChart className="h-4 w-4" />
                County Metrics
              </span>
              <h1 className="text-3xl font-semibold leading-[1.1] text-slate-900 sm:text-[2.5rem]">Local Safety Net</h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-600">
                Select a state and your county to see the latest unemployment trend from BLS LAUS,
                plus supporting indicators like poverty, SNAP usage, housing burden, and median wages.
              </p>
            </div>
            <SourceChip source="BLS LAUS" lastUpdated={data?.lastUpdated ?? new Date().toISOString()} />
          </header>

          <HeroLocationCard />

          {!hasCountySelection ? (
            <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4 text-sm text-slate-600 sm:p-5">
              Unemployment trends, poverty snapshot, SNAP participation, housing burden, income, and insurance gap metrics will appear after
              you add your location.
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
                <PovertyStatCard
                  countyFips={countyFips}
                  stateFips={stateFips}
                  countyNameFallback={countyName}
                />
                <MedianIncomeCard
                  countyFips={countyFips}
                  stateFips={stateFips}
                  countyNameFallback={countyName}
                />
                <SnapParticipationCard countyFips={countyFips} stateFips={stateFips} />
                <EducationLevelCard countyFips={countyFips} stateFips={stateFips} />
                <UninsuredRateCard countyFips={countyFips} stateFips={stateFips} />
                <HousingBurdenCard countyFips={countyFips} stateFips={stateFips} />
              </div>

              {isError && (
                <div
                  role="status"
                  aria-live="polite"
                  className="rounded-2xl border border-yellow-300 bg-yellow-50 px-4 py-3 text-sm text-yellow-800"
                >
                  BLS data is temporarily unavailable; showing last good results if available.
                </div>
              )}

              <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:p-6">
                <h2 className="mb-4 text-lg font-semibold text-slate-900">BLS LAUS Unemployment Trend</h2>
                {isLoading || isFetchingCounties ? (
                  <div className="h-64 animate-pulse rounded-xl bg-slate-100" />
                ) : points.length === 0 ? (
                  <div className="rounded-xl bg-slate-50 p-6 text-center text-sm text-slate-600">
                    No series available for this county yet. Try another location later.
                  </div>
                ) : (
                  <TimeSeriesChart points={points} />
                )}
              </div>
            </>
          )}
        </div>
      </section>
    </main>
  );
}

export default function StatsPage() {
  return (
    <SharedLocationProvider>
      <StatsPageContent />
    </SharedLocationProvider>
  );
}
