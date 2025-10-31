"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MS_COUNTIES } from "@/data/ms-counties";
import SourceChip from "@/components/SourceChip";
import { zUnemploymentResponse } from "@cl/types";
import { ResumeBuilderSection } from "@/components/resume/ResumeBuilderSection";

const TimeSeriesChart = dynamic(() => import("@/components/TimeSeriesChart"), { ssr: false });

export default function JobsPage() {
  const isBrowser = typeof window !== "undefined";
  const [countyFips, setCountyFips] = useState<string>(MS_COUNTIES[0]?.fips ?? "28163");
  const start = 2018;
  const end = 2025;

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
      <header className="flex items-center justify-between">
        <h1 className="text-xl md:text-2xl font-semibold">Jobs — Unemployment</h1>
        <div className="text-sm text-gray-600">
          <SourceChip source="BLS LAUS" lastUpdated={data?.lastUpdated ?? new Date().toISOString()} />
        </div>
      </header>

      <div className="flex items-center gap-3">
        <label className="text-sm">County</label>
        <select
          className="border rounded px-2 py-1 text-sm"
          value={countyFips}
          onChange={(e) => setCountyFips(e.target.value)}
          aria-label="Select county"
        >
          {MS_COUNTIES.map((c) => (
            <option key={c.fips} value={c.fips}>
              {c.name}
            </option>
          ))}
        </select>
        <div className="text-xs text-gray-500">Range: {start}–{end}</div>
      </div>

      {isError && (
        <div role="status" aria-live="polite" className="rounded border border-yellow-300 bg-yellow-50 text-yellow-800 px-3 py-2 text-sm">
          BLS data is temporarily unavailable; showing last good results if available.
        </div>
      )}

      {/* Chart section with overflow containment */}
      <section className="rounded border bg-white p-3 overflow-hidden">
        {isLoading ? (
          <div className="h-64 animate-pulse bg-gray-100 rounded" />
        ) : points.length === 0 ? (
          <div className="p-6 text-center text-gray-600 text-sm">No series available for this county yet. Choose another county or try later.</div>
        ) : (
          <>
            <TimeSeriesChart points={points} />
            <table className="sr-only">
              <caption>Unemployment rate time series</caption>
              <thead>
                <tr>
                  <th scope="col">Month</th>
                  <th scope="col">Rate</th>
                </tr>
              </thead>
              <tbody>
                {points.map((p) => (
                  <tr key={p.date}>
                    <td>{p.date}</td>
                    <td>{p.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </section>

      <ResumeBuilderSection />
    </div>
  );
}
