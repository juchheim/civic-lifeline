"use client";

import dynamic from "next/dynamic";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import EducationLevelCard from "@/components/EducationLevelCard";
import HousingBurdenCard from "@/components/HousingBurdenCard";
import MedianIncomeCard from "@/components/MedianIncomeCard";
import MinimumWageCard from "@/components/MinimumWageCard";
import PovertyStatCard from "@/components/PovertyStatCard";
import SnapParticipationCard from "@/components/SnapParticipationCard";
import UninsuredRateCard from "@/components/UninsuredRateCard";
import SourceChip from "@/components/SourceChip";
import { zUnemploymentResponse, State, County } from "@cl/types";

const TimeSeriesChart = dynamic(() => import("@/components/TimeSeriesChart"), { ssr: false });

export default function StatsPage() {
  const isBrowser = typeof window !== "undefined";
  const [selectedStateCode, setSelectedStateCode] = useState<string>("MS");
  const [countyFips, setCountyFips] = useState<string>("28163");
  const start = 2018;
  const end = 2025;

  // Fetch states
  const { data: states = [] } = useQuery<State[]>({
    queryKey: ["states"],
    queryFn: async () => {
      const res = await fetch("/api/states");
      if (!res.ok) throw new Error("Failed to fetch states");
      return res.json();
    },
    staleTime: Infinity, // States don't change
    enabled: isBrowser,
  });

  // Fetch counties for selected state
  const { data: counties = [] } = useQuery<County[]>({
    queryKey: ["counties", selectedStateCode],
    queryFn: async () => {
      const res = await fetch(`/api/counties?stateCode=${selectedStateCode}`);
      if (!res.ok) throw new Error("Failed to fetch counties");
      return res.json();
    },
    staleTime: Infinity, // Counties don't change often
    enabled: isBrowser && !!selectedStateCode,
  });

  const selectedCounty = counties.find((county) => county.fips === countyFips);
  const selectedState = states.find((state) => state.code === selectedStateCode);
  // Reset county selection when state changes
  useEffect(() => {
    if (counties.length > 0 && !counties.find((c) => c.fips === countyFips)) {
      setCountyFips(counties[0]?.fips ?? "");
    }
  }, [selectedStateCode, counties, countyFips]);

  const fetcher = async () => {
    if (!isBrowser) {
      throw new Error("Window is undefined");
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
    queryKey: ["laus", countyFips, start, end],
    queryFn: fetcher,
    staleTime: 300_000,
    retry: 1,
    placeholderData: (prev) => prev as any,
    enabled: isBrowser,
  });

  const points = data?.points ?? [];

  return (
    <main className="space-y-12 bg-neutral-bg pb-16">
      <section className="mt-4 overflow-hidden rounded-[2.5rem] border border-slate-200 bg-white shadow-lg shadow-slate-400/10">
        <div className="space-y-8 px-4 py-8 sm:px-6 lg:px-8">
          <header className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">County Metrics</p>
              <h1 className="text-3xl font-semibold text-slate-900">Unemployment & Local Safety Net</h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-600">
                Mix and match a state and county to see the latest unemployment trend from BLS LAUS,
                plus supporting indicators like poverty, SNAP usage, housing burden, and median wages.
              </p>
            </div>
            <SourceChip source="BLS LAUS" lastUpdated={data?.lastUpdated ?? new Date().toISOString()} />
          </header>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            <PovertyStatCard
              countyFips={countyFips}
              stateFips={selectedCounty?.stateFips}
              countyNameFallback={selectedCounty?.name}
            />
            <MedianIncomeCard
              countyFips={countyFips}
              stateFips={selectedCounty?.stateFips}
              countyNameFallback={selectedCounty?.name}
            />
            <SnapParticipationCard countyFips={countyFips} stateFips={selectedCounty?.stateFips} />
            <EducationLevelCard countyFips={countyFips} stateFips={selectedCounty?.stateFips} />
            <MinimumWageCard stateName={selectedState?.name} />
            <UninsuredRateCard countyFips={countyFips} stateFips={selectedCounty?.stateFips} />
            <HousingBurdenCard countyFips={countyFips} stateFips={selectedCounty?.stateFips} />
          </div>

          <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4 sm:p-5">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-slate-700" htmlFor="stats-state-select">
                  State
                </label>
                <select
                  id="stats-state-select"
                  className="min-w-[180px] rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm transition focus:border-slate-400 focus:outline-none focus:ring-0"
                  value={selectedStateCode}
                  onChange={(e) => setSelectedStateCode(e.target.value)}
                  aria-label="Select state"
                >
                  {states.map((state) => (
                    <option key={state.code} value={state.code}>
                      {state.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-slate-700" htmlFor="stats-county-select">
                  County
                </label>
                <select
                  id="stats-county-select"
                  className="min-w-[200px] rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm transition focus:border-slate-400 focus:outline-none focus:ring-0"
                  value={countyFips}
                  onChange={(e) => setCountyFips(e.target.value)}
                  aria-label="Select county"
                  disabled={counties.length === 0}
                >
                  {counties.length === 0 ? (
                    <option value="">Loading counties...</option>
                  ) : (
                    counties.map((county) => (
                      <option key={county.fips} value={county.fips}>
                        {county.name}
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div className="text-xs text-slate-500">
                Time range: {start}–{end}
              </div>
            </div>
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
            {isLoading ? (
              <div className="h-64 animate-pulse rounded-xl bg-slate-100" />
            ) : points.length === 0 && !isBrowser ? (
              <div className="h-64 animate-pulse rounded-xl bg-slate-100" />
            ) : points.length === 0 ? (
              <div className="rounded-xl bg-slate-50 p-6 text-center text-sm text-slate-600">
                No series available for this county yet. Choose another county or try later.
              </div>
            ) : (
              <TimeSeriesChart points={points} />
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
