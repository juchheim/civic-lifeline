"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FocusEvent, FormEvent, KeyboardEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { zBroadbandSummaryResponse } from "@cl/types";
import SourceChip from "@/components/SourceChip";

type Suggestion = { id: string; name: string; lat: number; lon: number; kind: string };

const DEFAULT_QUERY = "";

interface BroadbandExperienceProps {
  showIntro?: boolean;
  wrapperClassName?: string;
  id?: string;
}

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timeout = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timeout);
  }, [value, delayMs]);
  return debounced;
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

export function BroadbandExperience({ showIntro = true, wrapperClassName, id }: BroadbandExperienceProps) {
  const [locationInput, setLocationInput] = useState(DEFAULT_QUERY);
  const [searchQuery, setSearchQuery] = useState(DEFAULT_QUERY);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isSuggestionOpen, setIsSuggestionOpen] = useState(false);
  const [isSuggestLoading, setIsSuggestLoading] = useState(false);
  const [suggestError, setSuggestError] = useState<string | null>(null);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState<number | null>(null);
  const [suppressSuggestions, setSuppressSuggestions] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const comboboxRef = useRef<HTMLDivElement | null>(null);

  const debouncedQuery = useDebouncedValue(locationInput, 350);

  useEffect(() => {
    const query = debouncedQuery.trim();

    if (suppressSuggestions) {
      setSuggestions([]);
      setIsSuggestionOpen(false);
      setIsSuggestLoading(false);
      setSuggestError(null);
      setActiveSuggestionIndex(null);
      return;
    }

    if (query.length < 3) {
      setSuggestions([]);
      setSuggestError(null);
      setIsSuggestionOpen(false);
      setActiveSuggestionIndex(null);
      setIsSuggestLoading(false);
      return;
    }

    let cancelled = false;
    const controller = new AbortController();
    setIsSuggestionOpen(true);
    setIsSuggestLoading(true);
    setSuggestError(null);

    fetch(`/api/geocode/suggest?q=${encodeURIComponent(query)}&limit=5`, {
      headers: { accept: "application/json" },
      signal: controller.signal,
    })
      .then(async (res) => {
        if (cancelled) return;
        if (res.status === 404) {
          setSuggestions([]);
          setSuggestError("No matches. Try a full address, city & state, or ZIP.");
          setActiveSuggestionIndex(null);
          return;
        }
        if (res.status === 429) {
          setSuggestions([]);
          setSuggestError("Too many searches, please pause briefly.");
          setActiveSuggestionIndex(null);
          return;
        }
        if (!res.ok) {
          setSuggestions([]);
          setSuggestError("Suggestion service unavailable. You can still search manually.");
          setActiveSuggestionIndex(null);
          return;
        }
        const data = (await res.json()) as Suggestion[];
        setSuggestions(data.slice(0, 5));
        setSuggestError(data.length === 0 ? "No matches. Try a full address, city & state, or ZIP." : null);
        setActiveSuggestionIndex(null);
      })
      .catch((error) => {
        if (cancelled || (error instanceof Error && error.name === "AbortError")) return;
        setSuggestions([]);
        setSuggestError("Suggestion service unavailable. You can still search manually.");
        setActiveSuggestionIndex(null);
      })
      .finally(() => {
        if (!cancelled) setIsSuggestLoading(false);
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [debouncedQuery, suppressSuggestions]);

  const { data, isLoading, isFetching, isError, error } = useQuery({
    queryKey: ["broadband", searchQuery],
    queryFn: () => fetchBroadband(searchQuery),
    enabled: !!searchQuery.trim(),
    staleTime: 300_000,
  });

  const coverage = data?.coverage ?? null;
  const speedLabels = useMemo(
    () => [
      { key: "25_3" as const, label: "25 Mbps down / 3 Mbps up" },
      { key: "100_20" as const, label: "100 Mbps down / 20 Mbps up" },
      { key: "1000_100" as const, label: "1000 Mbps down / 100 Mbps up" },
    ],
    [],
  );

  const handleSuggestionPick = useCallback((suggestion: Suggestion) => {
    setLocationInput(suggestion.name);
    setSearchQuery(suggestion.name);
    setSuggestions([]);
    setSuggestError(null);
    setIsSuggestionOpen(false);
    setActiveSuggestionIndex(null);
    setSuppressSuggestions(true);
    setLocationError(null);
  }, []);

  const handleComboboxBlur = useCallback((event: FocusEvent<HTMLDivElement>) => {
    const related = event.relatedTarget;
    if (related && comboboxRef.current && comboboxRef.current.contains(related as Node)) {
      return;
    }
    setIsSuggestionOpen(false);
    setActiveSuggestionIndex(null);
  }, []);

  const handleInputFocus = useCallback(() => {
    if (suggestions.length > 0 || suggestError || isSuggestLoading) {
      setIsSuggestionOpen(true);
    }
  }, [isSuggestLoading, suggestError, suggestions.length]);

  const handleInputKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "ArrowDown") {
        if (suggestions.length === 0) return;
        event.preventDefault();
        setIsSuggestionOpen(true);
        setActiveSuggestionIndex((index) => {
          if (index === null) return 0;
          return Math.min(index + 1, suggestions.length - 1);
        });
        return;
      }
      if (event.key === "ArrowUp") {
        if (suggestions.length === 0) return;
        event.preventDefault();
        setActiveSuggestionIndex((index) => {
          if (index === null || index <= 0) return 0;
          return index - 1;
        });
        return;
      }
      if (event.key === "Enter") {
        if (activeSuggestionIndex !== null && suggestions[activeSuggestionIndex]) {
          event.preventDefault();
          handleSuggestionPick(suggestions[activeSuggestionIndex]);
          return;
        }
        event.preventDefault();
        setLocationError(null);
        const trimmed = locationInput.trim();
        if (!trimmed) return;
        setSearchQuery(trimmed);
        setLocationInput(trimmed);
        setSuppressSuggestions(true);
        setIsSuggestionOpen(false);
        setActiveSuggestionIndex(null);
        setSuggestions([]);
        return;
      }
      if (event.key === "Escape") {
        setIsSuggestionOpen(false);
        setActiveSuggestionIndex(null);
      }
    },
    [activeSuggestionIndex, handleSuggestionPick, locationInput, suggestions],
  );

  const handleSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const trimmed = locationInput.trim();
      if (!trimmed) {
        setLocationError("Enter an address, city, or ZIP code.");
        return;
      }
      setLocationError(null);
      setSearchQuery(trimmed);
      setLocationInput(trimmed);
      setSuppressSuggestions(true);
      setIsSuggestionOpen(false);
      setActiveSuggestionIndex(null);
      setSuggestions([]);
    },
    [locationInput],
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

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <form className="flex flex-col gap-4 md:flex-row md:items-end" onSubmit={handleSubmit}>
          <div className="flex-1">
            <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="broadband-location">
              Address or ZIP code
            </label>
            <div
              ref={comboboxRef}
              role="combobox"
              aria-haspopup="listbox"
              aria-expanded={isSuggestionOpen}
              aria-owns="broadband-suggestion-list"
              className="relative"
              onBlur={handleComboboxBlur}
            >
              <input
                id="broadband-location"
                value={locationInput}
                onChange={(event) => {
                  setLocationInput(event.target.value);
                  setLocationError(null);
                  setSuppressSuggestions(false);
                }}
                onFocus={handleInputFocus}
                onKeyDown={handleInputKeyDown}
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                placeholder="Yazoo County, MS or 39194"
                aria-autocomplete="list"
                aria-controls="broadband-suggestion-list"
              />
              {isSuggestionOpen && (suggestions.length > 0 || suggestError || isSuggestLoading) && (
                <ul
                  id="broadband-suggestion-list"
                  role="listbox"
                  className="absolute z-10 mt-1 max-h-56 w-full overflow-y-auto rounded border border-slate-200 bg-white text-sm shadow-lg"
                >
                  {suggestions.map((suggestion, index) => (
                    <li key={suggestion.id}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={index === activeSuggestionIndex}
                        className={`flex w-full items-start gap-2 px-3 py-2 text-left ${
                          index === activeSuggestionIndex ? "bg-blue-50 text-blue-700" : "hover:bg-slate-100"
                        }`}
                        onMouseDown={(event) => {
                          event.preventDefault();
                          handleSuggestionPick(suggestion);
                        }}
                      >
                        <span className="flex-1">{suggestion.name}</span>
                        {suggestion.kind && <span className="text-xs uppercase text-slate-500">{suggestion.kind}</span>}
                      </button>
                    </li>
                  ))}
                  {isSuggestLoading && <li className="px-3 py-2 text-slate-500">Searching…</li>}
                  {!isSuggestLoading && suggestError && <li className="px-3 py-2 text-slate-500">{suggestError}</li>}
                </ul>
              )}
            </div>
            {locationError && <p className="mt-1 text-xs text-red-600">{locationError}</p>}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              className="rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
              disabled={isFetching}
            >
              {isLoading || isFetching ? "Loading…" : "Run query"}
            </button>
            <span className="text-xs text-slate-500">Using `/api/broadband/summary?{queryLabel}`</span>
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
              Enter an address, city, or ZIP code to see broadband coverage details.
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

export default function BroadbandPage() {
  return <BroadbandExperience />;
}
