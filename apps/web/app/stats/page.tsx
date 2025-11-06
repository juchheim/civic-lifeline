"use client";

import dynamic from "next/dynamic";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
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
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Stats — Unemployment by County</h1>
          <p className="mt-1 text-sm text-gray-600">
            Choose a state and county to compare unemployment trends using BLS Local Area Unemployment Statistics.
          </p>
        </div>
        <SourceChip source="BLS LAUS" lastUpdated={data?.lastUpdated ?? new Date().toISOString()} />
      </header>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium" htmlFor="stats-state-select">
            State
          </label>
          <select
            id="stats-state-select"
            className="border rounded px-2 py-1 text-sm min-w-[180px]"
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
          <label className="text-sm font-medium" htmlFor="stats-county-select">
            County
          </label>
          <select
            id="stats-county-select"
            className="border rounded px-2 py-1 text-sm min-w-[200px]"
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

        <div className="text-xs text-gray-500">
          Range: {start}–{end}
        </div>
      </div>

      {isError && (
        <div
          role="status"
          aria-live="polite"
          className="rounded border border-yellow-300 bg-yellow-50 text-yellow-800 px-3 py-2 text-sm"
        >
          BLS data is temporarily unavailable; showing last good results if available.
        </div>
      )}

      <section className="rounded border bg-white p-3 shadow-sm">
        {isLoading ? (
          <div className="h-64 animate-pulse rounded bg-gray-100" />
        ) : points.length === 0 && !isBrowser ? (
          <div className="h-64 animate-pulse rounded bg-gray-100" />
        ) : points.length === 0 ? (
          <div className="p-6 text-center text-sm text-gray-600">
            No series available for this county yet. Choose another county or try later.
          </div>
        ) : (
          <TimeSeriesChart points={points} />
        )}
      </section>
    </div>
  );
}
