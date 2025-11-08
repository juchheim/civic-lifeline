"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { zCounselorsResponse, zFmrResponse } from "@cl/types";
import SourceChip from "@/components/SourceChip";

type Suggestion = { id: string; name: string; lat: number; lon: number; kind: string };

interface LocationSelection {
  label: string;
  lat: number;
  lon: number;
  postalCode?: string;
}

interface CounselorSearchParams {
  radius: string;
  lat?: string;
  lon?: string;
  q?: string;
}

interface FmrSearchParams {
  year: string;
  fips?: string;
  lat?: string;
  lon?: string;
  q?: string;
}

interface HousingExperienceProps {
  showIntro?: boolean;
  wrapperClassName?: string;
  id?: string;
}

const DEFAULT_RADIUS = "100";
// During the HUD shutdown we pin to the static dataset year. Update when live HUD API resumes (docs/hud-fmr-static.md).
const DEFAULT_FMR_YEAR = "2024";

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timeout = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timeout);
  }, [value, delayMs]);
  return debounced;
}

async function fetchCounselors(params: CounselorSearchParams) {
  const search = new URLSearchParams();
  const radiusValue = params.radius?.trim() || DEFAULT_RADIUS;
  if (params.lat && params.lon) {
    search.set("lat", params.lat.trim());
    search.set("lon", params.lon.trim());
  }
  if (params.q) {
    search.set("q", params.q.trim());
  }
  search.set("radius", radiusValue);

  const res = await fetch(`/api/housing/counselors?${search.toString()}`, { headers: { accept: "application/json" } });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = (json as any)?.error?.message || (json as any)?.error?.code || "Unable to load counselors";
    throw new Error(message);
  }
  return zCounselorsResponse.parse(json);
}

async function fetchFmr(params: FmrSearchParams) {
  const search = new URLSearchParams();
  const year = params.year?.trim() || DEFAULT_FMR_YEAR;
  search.set("year", year);

  if (params.fips) {
    search.set("fips", params.fips.trim());
  } else if (params.lat && params.lon) {
    search.set("lat", params.lat.trim());
    search.set("lon", params.lon.trim());
  } else if (params.q) {
    search.set("q", params.q.trim());
  }

  const res = await fetch(`/api/housing/fmr?${search.toString()}`, { headers: { accept: "application/json" } });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = (json as any)?.error?.message || (json as any)?.error?.code || "Unable to load HUD FMR";
    throw new Error(message);
  }
  return zFmrResponse.parse(json);
}

async function geocodeQuery(query: string): Promise<LocationSelection> {
  const res = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`, { headers: { accept: "application/json" } });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = (json as any)?.error || "We could not find that location.";
    throw new Error(typeof message === "string" ? message : "We could not find that location.");
  }
  if (typeof json.lat !== "number" || typeof json.lon !== "number") {
    throw new Error("Geocoding service returned invalid coordinates.");
  }
  return {
    label: typeof json.name === "string" ? json.name : query,
    lat: json.lat,
    lon: json.lon,
    postalCode: typeof json.address?.postalCode === "string" ? json.address.postalCode : undefined,
  };
}

export default function HousingExperience({ showIntro = true, wrapperClassName, id }: HousingExperienceProps) {
  const [locationInput, setLocationInput] = useState("");
  const [selectedLocation, setSelectedLocation] = useState<LocationSelection | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [suggestError, setSuggestError] = useState<string | null>(null);
  const [isSuggestionOpen, setIsSuggestionOpen] = useState(false);
  const [isSuggestLoading, setIsSuggestLoading] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState<number | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isResolving, setIsResolving] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [isGeolocating, setIsGeolocating] = useState(false);
  const [suppressSuggestions, setSuppressSuggestions] = useState(false);
  const [advanced, setAdvanced] = useState({ radius: DEFAULT_RADIUS, lat: "", lon: "", fips: "", year: DEFAULT_FMR_YEAR });

  const [counselorSearch, setCounselorSearch] = useState<CounselorSearchParams | null>(null);
  const [fmrSearch, setFmrSearch] = useState<FmrSearchParams | null>(null);

  const debouncedQuery = useDebouncedValue(locationInput, 350);
  const comboboxRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const query = debouncedQuery.trim();
    if (suppressSuggestions) {
      setSuggestions([]);
      setSuggestError(null);
      setIsSuggestionOpen(false);
      setActiveSuggestionIndex(null);
      setIsSuggestLoading(false);
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
    setIsSuggestLoading(true);
    setIsSuggestionOpen(true);
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

  const handleSuggestionPick = useCallback((suggestion: Suggestion) => {
    setSelectedLocation({ label: suggestion.name, lat: suggestion.lat, lon: suggestion.lon });
    setLocationInput(suggestion.name);
    setSuggestions([]);
    setSuggestError(null);
    setIsSuggestionOpen(false);
    setActiveSuggestionIndex(null);
    setLocationError(null);
    setSuppressSuggestions(false);
  }, []);

  const handleComboboxBlur = useCallback((event: React.FocusEvent<HTMLDivElement>) => {
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

  const runSearch = useCallback(async () => {
    const trimmedQuery = locationInput.trim();
    const manualLat = advanced.lat.trim();
    const manualLon = advanced.lon.trim();
    const manualFips = advanced.fips.trim();
    const manualYear = advanced.year.trim() || DEFAULT_FMR_YEAR;
    const radius = advanced.radius.trim() || DEFAULT_RADIUS;

    const hasPartialCoords = (manualLat && !manualLon) || (!manualLat && manualLon);
    if (hasPartialCoords) {
      setLocationError("Provide both latitude and longitude to use manual coordinates.");
      return;
    }

    setLocationError(null);
    setIsSuggestionOpen(false);
    setActiveSuggestionIndex(null);

    let location = selectedLocation;
    const needsLocation = !manualLat && !manualLon;

    if (needsLocation && !location) {
      if (!trimmedQuery) {
        setLocationError("Enter a location or provide coordinates in Advanced options.");
        return;
      }
      setIsResolving(true);
      try {
        location = await geocodeQuery(trimmedQuery);
        setSelectedLocation(location);
        setLocationInput(location.label);
      } catch (error) {
        const message = error instanceof Error ? error.message : "We could not find that location.";
        setLocationError(message);
        setIsResolving(false);
        return;
      }
      setIsResolving(false);
    }

    const counselorParams: CounselorSearchParams = { radius };
    if (manualLat && manualLon) {
      counselorParams.lat = manualLat;
      counselorParams.lon = manualLon;
    } else if (location) {
      counselorParams.lat = location.lat.toFixed(6);
      counselorParams.lon = location.lon.toFixed(6);
    } else if (trimmedQuery) {
      counselorParams.q = trimmedQuery;
    } else {
      setLocationError("Enter a location or provide coordinates in Advanced options.");
      return;
    }

    const fmrParams: FmrSearchParams = { year: manualYear };
    if (manualFips) {
      fmrParams.fips = manualFips;
    } else if (manualLat && manualLon) {
      fmrParams.lat = manualLat;
      fmrParams.lon = manualLon;
    } else if (location) {
      fmrParams.lat = location.lat.toFixed(6);
      fmrParams.lon = location.lon.toFixed(6);
    } else if (trimmedQuery) {
      fmrParams.q = trimmedQuery;
    } else {
      setLocationError("Enter a location or provide a county FIPS in Advanced options.");
      return;
    }

    setCounselorSearch(counselorParams);
    setFmrSearch(fmrParams);
  }, [advanced, locationInput, selectedLocation]);

  const handleUseCurrentLocation = useCallback(() => {
    setLocationError(null);
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setLocationError("Your browser does not support geolocation. Please enter a location instead.");
      return;
    }
    setIsGeolocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setIsGeolocating(false);
        const { latitude, longitude } = position.coords;
        const label = "Current location";
        setSelectedLocation({ label, lat: latitude, lon: longitude });
        setLocationInput(label);
        setSuggestions([]);
        setSuggestError(null);
        setIsSuggestionOpen(false);
        setActiveSuggestionIndex(null);
        setSuppressSuggestions(true);
        setAdvanced((prev) => ({
          ...prev,
          lat: "",
          lon: "",
          fips: prev.fips,
        }));

        const radiusValue = advanced.radius.trim() || DEFAULT_RADIUS;
        setCounselorSearch({
          lat: latitude.toFixed(6),
          lon: longitude.toFixed(6),
          radius: radiusValue,
        });

        const manualYear = advanced.year.trim() || DEFAULT_FMR_YEAR;
        const manualFips = advanced.fips.trim();
        if (manualFips) {
          setFmrSearch({ year: manualYear, fips: manualFips });
        } else {
          setFmrSearch({
            year: manualYear,
            lat: latitude.toFixed(6),
            lon: longitude.toFixed(6),
          });
        }
      },
      () => {
        setIsGeolocating(false);
        setLocationError("We couldn't access your current location. Please allow access or enter it manually.");
      }
    );
  }, [advanced, setCounselorSearch, setFmrSearch]);

  const handleInputKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "ArrowDown") {
        if (suggestions.length === 0) return;
        event.preventDefault();
        setIsSuggestionOpen(true);
        setActiveSuggestionIndex((index) => {
          const next = index === null ? 0 : Math.min(index + 1, suggestions.length - 1);
          return next;
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
        void runSearch();
        return;
      }
      if (event.key === "Escape") {
        setIsSuggestionOpen(false);
        setActiveSuggestionIndex(null);
      }
    },
    [activeSuggestionIndex, handleSuggestionPick, runSearch, suggestions]
  );

  const counselorsQuery = useQuery({
    queryKey: [
      "housing:counselors",
      counselorSearch?.radius ?? null,
      counselorSearch?.lat ?? null,
      counselorSearch?.lon ?? null,
      counselorSearch?.q ?? null,
    ],
    queryFn: () => fetchCounselors(counselorSearch!),
    enabled: !!counselorSearch,
    staleTime: 60_000,
  });

  const fmrQuery = useQuery({
    queryKey: [
      "housing:fmr",
      fmrSearch?.fips ?? null,
      fmrSearch?.lat ?? null,
      fmrSearch?.lon ?? null,
      fmrSearch?.q ?? null,
      fmrSearch?.year ?? null,
    ],
    queryFn: () => fetchFmr(fmrSearch!),
    enabled: !!fmrSearch,
    staleTime: 300_000,
  });

  const isSearching = isResolving || counselorsQuery.isFetching || fmrQuery.isFetching || isGeolocating;

  const searchSummary = useMemo(() => {
    if (advanced.lat.trim() && advanced.lon.trim()) {
      return `Manual coordinates (${advanced.lat.trim()}, ${advanced.lon.trim()})`;
    }
    if (selectedLocation) return selectedLocation.label;
    const trimmed = locationInput.trim();
    if (trimmed) return trimmed;
    if (counselorSearch?.lat && counselorSearch?.lon) {
      return `Lat ${counselorSearch.lat}, Lon ${counselorSearch.lon}`;
    }
    if (fmrSearch?.lat && fmrSearch?.lon) {
      return `Lat ${fmrSearch.lat}, Lon ${fmrSearch.lon}`;
    }
    return "No location selected";
  }, [advanced.lat, advanced.lon, counselorSearch, fmrSearch, locationInput, selectedLocation]);

  const containerClassName = ["space-y-6", wrapperClassName].filter(Boolean).join(" ");

  return (
    <div id={id} className={containerClassName}>
      {showIntro && (
        <header className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold text-slate-900">Housing Support</h1>
          <p className="text-sm text-slate-600">
            Search by address or ZIP code to find HUD-approved housing counselors and the latest Fair Market Rent (FMR) figures.
          </p>
        </header>
      )}

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <form
          className="mt-4 space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            void runSearch();
          }}
        >
          <div className="space-y-2">
            <label htmlFor="housing-location" className="text-sm font-medium text-slate-700">
              Search by address or ZIP
            </label>
            <div
              ref={comboboxRef}
              role="combobox"
              aria-haspopup="listbox"
              aria-expanded={isSuggestionOpen}
              aria-owns="housing-suggestion-list"
              className="relative"
              onBlur={handleComboboxBlur}
            >
              <input
                id="housing-location"
                value={locationInput}
                onChange={(event) => {
                  setLocationInput(event.target.value);
                  setLocationError(null);
                  setSuppressSuggestions(false);
                }}
                onFocus={handleInputFocus}
                onKeyDown={handleInputKeyDown}
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                placeholder="E.g. 39194 or 123 Main St, Greenville, MS"
                aria-autocomplete="list"
                aria-controls="housing-suggestion-list"
              />
              {isSuggestionOpen && (suggestions.length > 0 || suggestError || isSuggestLoading) && (
                <ul
                  id="housing-suggestion-list"
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
            <div className="text-xs text-slate-500">
              Selected location: <span className="font-medium text-slate-700">{searchSummary}</span>
              {counselorSearch?.radius ? ` • Radius ${counselorSearch.radius} mi` : null}
            </div>
            {locationError && (
              <div className="rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">{locationError}</div>
            )}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
              disabled={isSearching}
            >
              {isSearching ? "Searching…" : "Search housing data"}
            </button>
            <button
              type="button"
              onClick={handleUseCurrentLocation}
              className="inline-flex items-center justify-center rounded border border-blue-200 px-4 py-2 text-sm font-semibold text-blue-600 shadow-sm transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:border-blue-100 disabled:text-blue-300"
              disabled={isSearching}
            >
              {isGeolocating ? "Locating…" : "Use my location"}
            </button>
            <button
              type="button"
              onClick={() => setAdvancedOpen((prev) => !prev)}
              className="self-start text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              {advancedOpen ? "Hide advanced options" : "Show advanced options"}
            </button>
          </div>

          {advancedOpen && (
            <div className="grid gap-4 rounded border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-slate-700" htmlFor="adv-radius">
                  Radius (miles)
                </label>
                <input
                  id="adv-radius"
                  value={advanced.radius}
                  onChange={(event) => setAdvanced((prev) => ({ ...prev, radius: event.target.value }))}
                  className="rounded border border-slate-300 px-2 py-1 text-sm"
                  placeholder={DEFAULT_RADIUS}
                  inputMode="numeric"
                />
                <p className="text-xs text-slate-500">Used for counselor search (min 5 / max 100 miles).</p>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-slate-700" htmlFor="adv-lat">
                  Latitude override
                </label>
                <input
                  id="adv-lat"
                  value={advanced.lat}
                  onChange={(event) => setAdvanced((prev) => ({ ...prev, lat: event.target.value }))}
                  className="rounded border border-slate-300 px-2 py-1 text-sm"
                  placeholder="32.889"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-slate-700" htmlFor="adv-lon">
                  Longitude override
                </label>
                <input
                  id="adv-lon"
                  value={advanced.lon}
                  onChange={(event) => setAdvanced((prev) => ({ ...prev, lon: event.target.value }))}
                  className="rounded border border-slate-300 px-2 py-1 text-sm"
                  placeholder="-90.405"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-slate-700" htmlFor="adv-fips">
                  County FIPS override
                </label>
                <input
                  id="adv-fips"
                  value={advanced.fips}
                  onChange={(event) => setAdvanced((prev) => ({ ...prev, fips: event.target.value }))}
                  className="rounded border border-slate-300 px-2 py-1 text-sm"
                  placeholder="28163"
                  inputMode="numeric"
                />
                <p className="text-xs text-slate-500">Optional: provide a 5-digit county FIPS for FMR lookup.</p>
              </div>
              <div className="flex flex-col gap-1 lg:col-span-4">
                <label className="text-sm font-medium text-slate-700" htmlFor="adv-year">
                  FMR year
                </label>
                <input
                  id="adv-year"
                  value={advanced.year}
                  onChange={(event) => setAdvanced((prev) => ({ ...prev, year: event.target.value }))}
                  className="w-full rounded border border-slate-300 px-2 py-1 text-sm sm:max-w-[200px]"
                  placeholder={DEFAULT_FMR_YEAR}
                  inputMode="numeric"
                />
              </div>
              <div className="lg:col-span-4 text-xs text-slate-500">
                Manual coordinates override the address search when both latitude and longitude are provided.
              </div>
            </div>
          )}
        </form>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <h2 className="text-xl font-semibold text-slate-900">HUD Fair Market Rents (FMR)</h2>
          {fmrQuery.data && <SourceChip source={fmrQuery.data.source} lastUpdated={fmrQuery.data.lastUpdated} />}
        </div>
        <p className="mt-1 text-xs text-slate-500">
          Using HUD&apos;s FY2024 ArcGIS mirror while the official API is offline. See docs/hud-fmr-static.md for the re-enable plan.
        </p>
        <p className="mt-2 text-sm text-slate-600">
          Year <span className="font-medium text-slate-800">{fmrSearch?.year ?? DEFAULT_FMR_YEAR}</span>{" "}
          {fmrQuery.data?.resolvedLocation?.name && (
            <>
              • Resolved area:{" "}
              <span className="font-medium text-slate-800">{fmrQuery.data.resolvedLocation.name}</span>
            </>
          )}
          {fmrQuery.data?.fips && (
            <>
              {" "}
              • FIPS <span className="font-medium text-slate-800">{fmrQuery.data.fips}</span>
            </>
          )}
        </p>

        <div className="mt-5">
          {fmrQuery.isError && (
            <div className="rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
              {(fmrQuery.error as Error)?.message || "Unable to fetch HUD FMR data."}
            </div>
          )}
          {!fmrQuery.isError && !fmrQuery.data && !fmrQuery.isLoading && (
            <div className="rounded border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
              Search for a location to see Fair Market Rent values.
            </div>
          )}
          {fmrQuery.isLoading && (
            <div className="h-24 animate-pulse rounded border border-slate-200 bg-slate-50" aria-hidden="true" />
          )}
          {fmrQuery.data && (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50 text-sm text-slate-600">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold">Area</th>
                    <th className="px-3 py-2 text-left font-semibold">Efficiency</th>
                    <th className="px-3 py-2 text-left font-semibold">1 BR</th>
                    <th className="px-3 py-2 text-left font-semibold">2 BR</th>
                    <th className="px-3 py-2 text-left font-semibold">3 BR</th>
                    <th className="px-3 py-2 text-left font-semibold">4 BR</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white text-sm">
                  <tr>
                    <td className="px-3 py-2 font-medium text-slate-900">{fmrQuery.data.areaName}</td>
                    <td className="px-3 py-2">${fmrQuery.data.br0.toLocaleString()}</td>
                    <td className="px-3 py-2">${fmrQuery.data.br1.toLocaleString()}</td>
                    <td className="px-3 py-2">${fmrQuery.data.br2.toLocaleString()}</td>
                    <td className="px-3 py-2">${fmrQuery.data.br3.toLocaleString()}</td>
                    <td className="px-3 py-2">${fmrQuery.data.br4.toLocaleString()}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <h2 className="text-xl font-semibold text-slate-900">HUD Housing Counselors</h2>
          {counselorsQuery.data && (
            <SourceChip source={counselorsQuery.data.source} lastUpdated={counselorsQuery.data.lastUpdated} />
          )}
        </div>
        <p className="mt-2 text-sm text-slate-600">
          Results within <span className="font-medium text-slate-800">{counselorSearch?.radius ?? DEFAULT_RADIUS}</span> miles of{" "}
          <span className="font-medium text-slate-800">{searchSummary}</span>.
        </p>

        <div className="mt-5">
          {counselorsQuery.isError && (
            <div className="rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
              {(counselorsQuery.error as Error)?.message || "Unable to fetch counselors."}
            </div>
          )}
          {!counselorsQuery.isError && !counselorsQuery.data && !counselorsQuery.isLoading && (
            <div className="rounded border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
              Search for a location to see nearby HUD-approved housing counselors.
            </div>
          )}
          {counselorsQuery.isLoading && (
            <div className="h-24 animate-pulse rounded border border-slate-200 bg-slate-50" aria-hidden="true" />
          )}
          {counselorsQuery.data && (
            <ul className="divide-y divide-slate-200 rounded border border-slate-200">
              {counselorsQuery.data.items.map((item) => {
                const lineParts: string[] = [];
                if (item.address) lineParts.push(item.address);
                const cityState = [item.city, item.state].filter(Boolean).join(", ");
                if (cityState) lineParts.push(cityState);
                if (item.postalCode) lineParts.push(item.postalCode);
                const addressLine = lineParts.length > 0 ? lineParts.join(", ") : null;
                return (
                  <li key={item.id} className="grid gap-2 bg-white p-4 md:grid-cols-[minmax(0,1fr)_220px]">
                    <div>
                      <div className="font-medium text-slate-900">{item.name}</div>
                      {addressLine && <div className="text-xs text-slate-500">{addressLine}</div>}
                      {typeof item.distanceMiles === "number" && (
                        <div className="text-xs text-slate-500">≈ {item.distanceMiles.toFixed(1)} miles away</div>
                      )}
                      {item.services && item.services.length > 0 && (
                        <div className="mt-1 text-xs text-slate-500">Services: {item.services.join(", ")}</div>
                      )}
                      {item.languages && item.languages.length > 0 && (
                        <div className="mt-1 text-xs text-slate-500">Languages: {item.languages.join(", ")}</div>
                      )}
                    </div>
                    <div className="text-sm text-slate-600">
                      {item.phone && <div>Phone: {item.phone}</div>}
                      {item.website && (
                        <div>
                          Website:{" "}
                          <a href={item.website} className="text-blue-600 hover:underline" target="_blank" rel="noreferrer">
                            {item.website}
                          </a>
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
              {counselorsQuery.data.items.length === 0 && (
                <li className="p-4 text-sm text-slate-600">No counselors returned for this search area.</li>
              )}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}

