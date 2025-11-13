"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { zBroadbandSummaryResponse } from "@cl/types";
import SourceChip from "@/components/SourceChip";
import SuccessAlert from "@/components/SuccessAlert";
import LocationInput, { type LocationInputHandle } from "@/components/LocationInput";

const DEFAULT_QUERY = "";

interface BroadbandExperienceProps {
  showIntro?: boolean;
  wrapperClassName?: string;
  id?: string;
}

async function fetchBroadband(query: string) {
  const trimmed = query.trim();
  if (!trimmed) throw new Error("Enter a location to search.");
  const params = new URLSearchParams();
  params.set("geo", "county");
  params.set("q", trimmed);
  const res = await fetch(`/api/broadband/summary?${params.toString()}`, { headers: { accept: "application/json" } });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const code = (json as any)?.error?.code;
    const message =
      (json as any)?.error?.message ||
      (code === "NOT_FOUND"
        ? "We don't have broadband summary data for that area yet."
        : code === "FIPS_LOOKUP_FAILED"
          ? "We could not match that location to a county. Try a nearby city or ZIP."
          : code || "Unable to load broadband summary");
    throw new Error(message);
  }
  return zBroadbandSummaryResponse.parse(json);
}

export default function BroadbandExperience({ showIntro = true, wrapperClassName, id }: BroadbandExperienceProps) {
  const [locationInput, setLocationInput] = useState(DEFAULT_QUERY);
  const [searchQuery, setSearchQuery] = useState(DEFAULT_QUERY);
  const [suppressSuggestions, setSuppressSuggestions] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const locationInputHandleRef = useRef<LocationInputHandle | null>(null);

  const { data, isLoading, isFetching, isError, error } = useQuery({
    queryKey: ["broadband", searchQuery],
    queryFn: () => fetchBroadband(searchQuery),
    enabled: !!searchQuery.trim(),
    staleTime: 300_000,
  });

  const coverage = data?.coverage ?? null;

  const executeSearch = useCallback(() => {
    const trimmed = locationInput.trim();
    if (!trimmed) {
      setLocationError("Enter an address, city, or ZIP code.");
      return;
    }
    locationInputHandleRef.current?.reset();
    setLocationError(null);
    setSearchQuery(trimmed);
    setLocationInput(trimmed);
    setSuppressSuggestions(true);
  }, [locationInput]);

  const speedLabels = useMemo(
    () => [
      { key: "25_3" as const, label: "25 Mbps down / 3 Mbps up" },
      { key: "100_20" as const, label: "100 Mbps down / 20 Mbps up" },
      { key: "1000_100" as const, label: "1000 Mbps down / 100 Mbps up" },
    ],
    [],
  );

  const handleSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      executeSearch();
    },
    [executeSearch],
  );

  const queryLabel = useMemo(() => {
    const params = new URLSearchParams();
    params.set("geo", "county");
    if (searchQuery.trim()) params.set("q", searchQuery.trim());
    return params.toString();
  }, [searchQuery]);

  const resolvedDisplay = useMemo(() => {
    if (!data) return searchQuery;
    const parts: string[] = [];
    const name = data.resolvedLocation?.name?.trim();
    const postal = data.resolvedLocation?.postalCode?.trim();
    if (name) parts.push(name);
    if (postal && (!name || !name.includes(postal))) parts.push(postal);
    return parts.length > 0 ? parts.join(" · ") : searchQuery;
  }, [data, searchQuery]);

  function formatCoverage(value: number | null | undefined): string {
    if (value == null || !Number.isFinite(value)) return "No data";
    return `${value.toFixed(1)}% of households`;
  }

  const containerClassName = ["space-y-5", wrapperClassName].filter(Boolean).join(" ");

  return (
    <div id={id} className={containerClassName}>
      {(showIntro || data) && (
        <header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          {showIntro && (
            <div>
              <h1 className="text-2xl font-semibold text-slate-900">Broadband Coverage</h1>
              <p className="text-sm text-slate-600">
                Fetch the FCC National Broadband Map summary for a county. Enter an address or ZIP code to locate it automatically.
              </p>
            </div>
          )}
          {data && <SourceChip source={data.source} lastUpdated={data.lastUpdated} />}
        </header>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <LocationInput
              ref={locationInputHandleRef}
              id="broadband-location"
              label="Address or ZIP code"
              value={locationInput}
              onChange={(next) => {
                setLocationInput(next);
                setLocationError(null);
                setSuppressSuggestions(false);
              }}
              placeholder="Yazoo County, MS or 39194"
              suppressSuggestions={suppressSuggestions}
              onSuggestionSelect={(suggestion) => {
                setLocationInput(suggestion.name);
                setSearchQuery(suggestion.name);
                setSuppressSuggestions(true);
                setLocationError(null);
              }}
              onSubmit={executeSearch}
            />
            {locationError && (
              <div className="rounded-xl border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">{locationError}</div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-full bg-brand-primary px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-brand-primary/50"
              disabled={isFetching}
            >
              {isLoading || isFetching ? "Searching…" : "Search broadband data"}
            </button>
            <span className="text-xs text-slate-500">Using `/api/broadband/summary?{queryLabel}`</span>
          </div>
        </form>
        {data && (
          <div className="mt-4">
            <SuccessAlert message="Location found – data loaded successfully" />
          </div>
        )}

        <div className="mt-5">
          {isError && (
            <div className="rounded-xl border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
              {(error as Error)?.message || "Something went wrong."}
            </div>
          )}
          {!isError && !data && !isLoading && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
              Enter an address or ZIP code to see broadband coverage details.
            </div>
          )}
          {data && (
            <div className="space-y-4">
              {resolvedDisplay && (
                <div className="text-sm text-slate-600">
                  Showing latest FCC data for <span className="font-medium">{resolvedDisplay}</span>
                </div>
              )}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded border border-slate-200 bg-slate-50 p-4">
                  <div className="text-sm font-medium text-slate-700">Broadband coverage</div>
                  <ul className="mt-2 space-y-1 text-sm text-slate-700">
                    {speedLabels.map((entry) => (
                      <li key={entry.key} className="flex items-center justify-between">
                        <span className="font-medium">{entry.label}</span>
                        <span className="text-slate-600">{formatCoverage(coverage?.[entry.key])}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-3 text-xs text-slate-500">Values represent the share of residential units with access to each tier.</div>
                </div>
                <div className="rounded border border-slate-200 bg-slate-50 p-4">
                  <div className="text-sm font-medium text-slate-700">Leading technologies</div>
                  {data.technologies && data.technologies.length > 0 ? (
                    <ul className="mt-2 space-y-1 text-sm text-slate-700">
                      {data.technologies.map((tech) => (
                        <li key={tech.name} className="flex items-center justify-between">
                          <span className="font-medium">{tech.name}</span>
                          <span className="text-slate-600">{tech.coverage.toFixed(1)}%</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="mt-2 text-sm text-slate-600">Technology mix data not available.</div>
                  )}
                  {data.totalUnits && (
                    <div className="mt-3 text-xs text-slate-500">Total housing units counted: {data.totalUnits.toLocaleString()}</div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
