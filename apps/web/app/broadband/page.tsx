"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { zBroadbandSummaryResponse } from "@cl/types";
import SourceChip from "@/components/SourceChip";

type Geo = "county" | "tract";

interface SearchState {
  geo: Geo;
  fips: string;
}

const defaultSearch: SearchState = { geo: "county", fips: "28163" };

async function fetchBroadband(search: SearchState) {
  const params = new URLSearchParams();
  params.set("geo", search.geo);
  params.set("fips", search.fips.trim());
  const res = await fetch(`/api/broadband/summary?${params.toString()}`, { headers: { accept: "application/json" } });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = (json as any)?.error?.message || (json as any)?.error?.code || "Unable to load broadband summary";
    throw new Error(message);
  }
  return zBroadbandSummaryResponse.parse(json);
}

export default function BroadbandPage() {
  const [form, setForm] = useState<SearchState>(defaultSearch);
  const [search, setSearch] = useState<SearchState>(defaultSearch);

  const { data, isLoading, isFetching, isError, error } = useQuery({
    queryKey: ["broadband", search.geo, search.fips],
    queryFn: () => fetchBroadband(search),
    enabled: !!search.fips,
    staleTime: 300_000,
  });

  const speeds = data?.speed ?? null;
  const speedLabels = useMemo(
    () => [
      { key: "25_3" as const, label: "25 Mbps down / 3 Mbps up" },
      { key: "100_20" as const, label: "100 Mbps down / 20 Mbps up" },
      { key: "1000_100" as const, label: "1000 Mbps down / 100 Mbps up" },
    ],
    [],
  );

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!form.fips.trim()) return;
    setSearch({ geo: form.geo, fips: form.fips.trim() });
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Broadband Coverage</h1>
          <p className="text-sm text-slate-600">Fetch the FCC National Broadband Map summary for a county or census tract.</p>
        </div>
        {data && <SourceChip source={data.source} lastUpdated={data.lastUpdated} />}
      </header>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <form className="flex flex-col gap-4 md:flex-row md:items-end" onSubmit={onSubmit}>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-slate-700" htmlFor="geo">
              Geography
            </label>
            <select
              id="geo"
              className="w-40 rounded border border-slate-300 px-2 py-1 text-sm"
              value={form.geo}
              onChange={(event) => setForm((prev) => ({ ...prev, geo: event.target.value as Geo }))}
            >
              <option value="county">County (5-digit FIPS)</option>
              <option value="tract">Tract (11-digit FIPS)</option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-slate-700" htmlFor="fips">
              FIPS code
            </label>
            <input
              id="fips"
              value={form.fips}
              onChange={(event) => setForm((prev) => ({ ...prev, fips: event.target.value }))}
              className="w-44 rounded border border-slate-300 px-2 py-1 text-sm"
              placeholder={form.geo === "county" ? "28163" : "28163000100"}
              required
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              className="rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
              disabled={isFetching}
            >
              {isLoading || isFetching ? "Loading…" : "Run query"}
            </button>
            <span className="text-xs text-slate-500">Using `/api/broadband/summary?geo={search.geo}&amp;fips={search.fips}`</span>
          </div>
        </form>

        <div className="mt-5">
          {isError && (
            <div className="rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
              {(error as Error)?.message || "Something went wrong."}
            </div>
          )}
          {!isError && !data && !isLoading && (
            <div className="rounded border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
              Enter a FIPS code to see broadband coverage details.
            </div>
          )}
          {data && (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded border border-slate-200 bg-slate-50 p-4">
                <div className="text-sm font-medium text-slate-700">Provider count</div>
                <div className="mt-1 text-2xl font-semibold text-slate-900">{data.providerCount}</div>
                <div className="mt-2 text-xs text-slate-500">Technologies: {data.tech.join(", ") || "Unknown"}</div>
                <div className="mt-1 text-xs text-slate-500">As of {data.asOf}</div>
              </div>
              <div className="rounded border border-slate-200 bg-slate-50 p-4">
                <div className="text-sm font-medium text-slate-700">Speed tiers available</div>
                <ul className="mt-2 space-y-1 text-sm text-slate-700">
                  {speedLabels.map((entry) => (
                    <li key={entry.key}>
                      <span className="font-medium">{entry.label}:</span>{" "}
                      {speeds && speeds[entry.key] ? <span className="text-green-600">Yes</span> : <span className="text-slate-500">No</span>}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
