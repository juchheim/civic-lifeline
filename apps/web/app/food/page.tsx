"use client";

import dynamic from "next/dynamic";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FocusEvent,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { useQuery } from "@tanstack/react-query";
import { zSnapResponse, type SnapResponse, type SnapItem } from "@cl/types";
import { bboxToQueryParam } from "@cl/utils";
import SourceChip from "@/components/SourceChip";
import EmptyState from "@/components/EmptyState";
import StoreCard from "@/components/StoreCard";

const MapView = dynamic(() => import("@/components/MapView"), { ssr: false });

type Bbox = [number, number, number, number];
type Suggestion = { id: string; name: string; lat: number; lon: number; kind: string };

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}

export default function FoodPage() {
  // const log = useMemo(() => createLogger("ui/food"), []);
  const [bbox, setBbox] = useState<Bbox | null>(null);
  const [selectedTypes, setSelectedTypes] = useState<Set<string>>(new Set());
  const [initialCenter, setInitialCenter] = useState<[number, number] | null>(null);
  const [isGeolocating, setIsGeolocating] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualQuery, setManualQuery] = useState("");
  const [locationError, setLocationError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [suggestError, setSuggestError] = useState<string | null>(null);
  const [isSuggestLoading, setIsSuggestLoading] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState<number | null>(null);
  const [isSuggestionOpen, setIsSuggestionOpen] = useState(false);
  const [liveMessage, setLiveMessage] = useState("");
  const debouncedBbox = useDebouncedValue(bbox, 400);
  const debouncedManualQuery = useDebouncedValue(manualQuery, 350);
  const comboboxRef = useRef<HTMLDivElement | null>(null);
  const listboxId = "manual-location-listbox";
  const shouldShowDropdown = isSuggestionOpen && (isSuggestLoading || suggestions.length > 0 || !!suggestError);

  const typesParam = useMemo(() => (selectedTypes.size ? Array.from(selectedTypes).sort().join(",") : undefined), [selectedTypes]);
  const bboxParam = useMemo(() => (debouncedBbox ? bboxToQueryParam(debouncedBbox) : undefined), [debouncedBbox]);

  const fetchSnap = useCallback(async () => {
    if (!bboxParam) return null;
    const url = new URL("/api/food/snap", window.location.origin);
    url.searchParams.set("bbox", bboxParam);
    if (typesParam) url.searchParams.set("types", typesParam);
    url.searchParams.set("limit", "300");
    const res = await fetch(url.toString(), { headers: { accept: "application/json" } });
    if (!res.ok) throw new Error("Failed to fetch SNAP retailers");
    const json = await res.json();
    return zSnapResponse.parse(json);
  }, [bboxParam, typesParam]);

  const { data, isFetching, isLoading, isError } = useQuery<SnapResponse | null>({
    queryKey: ["snap", bboxParam, typesParam],
    queryFn: fetchSnap,
    enabled: !!bboxParam,
    staleTime: 60_000,
    placeholderData: (prev) => prev as any,
    retry: 1,
    refetchOnWindowFocus: false,
  });

  const items = useMemo(() => data?.items ?? [], [data]);
  const source = data?.source ?? "USDA ArcGIS";
  const lastUpdated = data?.lastUpdated;
  const [focusedItem, setFocusedItem] = useState<SnapItem | null>(null);

  const availableTypes = useMemo(() => {
    const s = new Set<string>();
    for (const it of items) if (it.storeType) s.add(it.storeType);
    return Array.from(s).sort();
  }, [items]);

  const onToggleType = (t: string) => {
    setSelectedTypes((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      return next;
    });
  };

  const onBboxChange = useCallback((b: Bbox) => {
    setBbox((prev) => {
      if (!prev) return b;
      return prev[0] === b[0] && prev[1] === b[1] && prev[2] === b[2] && prev[3] === b[3] ? prev : b;
    });
  }, []);

  const handleStoreFocus = useCallback((store: SnapItem) => {
    setFocusedItem({ ...store });
  }, []);

  useEffect(() => {
    setFocusedItem(null);
  }, [typesParam]);

  useEffect(() => {
    if (!showManualInput) {
      setSuggestions([]);
      setSuggestError(null);
      setIsSuggestionOpen(false);
      setActiveSuggestionIndex(null);
      setIsSuggestLoading(false);
      setLiveMessage("");
    }
  }, [showManualInput]);

  useEffect(() => {
    if (!showManualInput) return;
    const query = debouncedManualQuery.trim();
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

    const fetchSuggestions = async () => {
      try {
        const res = await fetch(`/api/geocode/suggest?q=${encodeURIComponent(query)}&limit=5`, {
          headers: { accept: "application/json" },
          signal: controller.signal,
        });
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
        setSuggestError(null);
        setActiveSuggestionIndex(null);
      } catch (error) {
        if (cancelled) return;
        if (error instanceof Error && error.name === "AbortError") {
          return;
        }
        setSuggestions([]);
        setSuggestError("Suggestion service unavailable. You can still search manually.");
        setActiveSuggestionIndex(null);
      } finally {
        if (!cancelled) {
          setIsSuggestLoading(false);
        }
      }
    };

    void fetchSuggestions();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [debouncedManualQuery, showManualInput]);

  useEffect(() => {
    if (!isSuggestionOpen) {
      setLiveMessage("");
      return;
    }

    if (activeSuggestionIndex !== null && suggestions[activeSuggestionIndex]) {
      const current = suggestions[activeSuggestionIndex];
      setLiveMessage(`Suggestion ${activeSuggestionIndex + 1} of ${suggestions.length}: ${current.name}`);
      return;
    }

    if (isSuggestLoading) {
      setLiveMessage("Searching for suggestions…");
      return;
    }

    if (suggestError) {
      setLiveMessage(suggestError);
      return;
    }

    if (suggestions.length > 0) {
      setLiveMessage(`${suggestions.length} suggestion${suggestions.length === 1 ? "" : "s"} available.`);
      return;
    }

    if (debouncedManualQuery.trim().length >= 3) {
      setLiveMessage("No matches. Try a full address, city & state, or ZIP.");
      return;
    }

    setLiveMessage("");
  }, [activeSuggestionIndex, debouncedManualQuery, isSuggestionOpen, isSuggestLoading, suggestError, suggestions]);

  const handleLocationSelected = useCallback(
    (lat: number, lon: number) => {
      setInitialCenter([lat, lon]);
      setBbox(null);
      setFocusedItem(null);
      setLocationError(null);
      setShowManualInput(false);
      setManualQuery("");
    },
    [setFocusedItem]
  );

  const performManualGeocode = useCallback(
    async (input: string) => {
      const query = input.trim();
      if (!query) {
        setLocationError("Please enter a location.");
        return;
      }
      setLocationError(null);
      setIsGeocoding(true);
      setIsSuggestionOpen(false);
      setActiveSuggestionIndex(null);
      setIsSuggestLoading(false);
      setSuggestions([]);
      setSuggestError(null);
      try {
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`, {
          headers: { accept: "application/json" },
        });
        if (!res.ok) {
          throw new Error("Geocode failed");
        }
        const json = await res.json();
        if (typeof json.lat !== "number" || typeof json.lon !== "number") {
          throw new Error("Invalid geocode response");
        }
        handleLocationSelected(json.lat, json.lon);
      } catch (err) {
        console.error(err);
        setLocationError("We couldn't find that location. Try a full address, city and state, or ZIP code.");
      } finally {
        setIsGeocoding(false);
      }
    },
    [handleLocationSelected]
  );

  const handleSuggestionPick = useCallback(
    (suggestion: Suggestion) => {
      setManualQuery(suggestion.name);
      setLocationError(null);
      setSuggestions([]);
      setSuggestError(null);
      setIsSuggestionOpen(false);
      setActiveSuggestionIndex(null);
      handleLocationSelected(suggestion.lat, suggestion.lon);
    },
    [handleLocationSelected]
  );

  const handleComboboxBlur = useCallback(
    (event: FocusEvent<HTMLDivElement>) => {
      const related = event.relatedTarget;
      if (related && comboboxRef.current && comboboxRef.current.contains(related as Node)) {
        return;
      }
      setIsSuggestionOpen(false);
      setActiveSuggestionIndex(null);
    },
    [comboboxRef]
  );

  const handleInputFocus = useCallback(() => {
    if (manualQuery.trim().length >= 3 || suggestions.length > 0 || suggestError || isSuggestLoading) {
      setIsSuggestionOpen(true);
    }
  }, [isSuggestLoading, manualQuery, suggestError, suggestions]);

  const handleInputKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "ArrowDown") {
        if (suggestions.length === 0) return;
        event.preventDefault();
        setIsSuggestionOpen(true);
        setActiveSuggestionIndex((prev) => {
          if (suggestions.length === 0) return null;
          if (prev === null) return 0;
          return (prev + 1) % suggestions.length;
        });
        return;
      }

      if (event.key === "ArrowUp") {
        if (suggestions.length === 0) return;
        event.preventDefault();
        setIsSuggestionOpen(true);
        setActiveSuggestionIndex((prev) => {
          if (suggestions.length === 0) return null;
          if (prev === null) return suggestions.length - 1;
          return (prev - 1 + suggestions.length) % suggestions.length;
        });
        return;
      }

      if (event.key === "Enter") {
        if (isSuggestionOpen && activeSuggestionIndex !== null && suggestions[activeSuggestionIndex]) {
          event.preventDefault();
          handleSuggestionPick(suggestions[activeSuggestionIndex]);
          return;
        }
        event.preventDefault();
        void performManualGeocode(manualQuery);
        return;
      }

      if (event.key === "Escape") {
        if (isSuggestionOpen) {
          event.preventDefault();
          setIsSuggestionOpen(false);
          setActiveSuggestionIndex(null);
        }
      }
    },
    [activeSuggestionIndex, handleSuggestionPick, isSuggestionOpen, manualQuery, performManualGeocode, suggestions]
  );

  const handleManualSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      void performManualGeocode(manualQuery);
    },
    [manualQuery, performManualGeocode]
  );

  const handleUseCurrentLocation = useCallback(() => {
    setLocationError(null);
    if (!navigator.geolocation) {
      setLocationError("Your browser does not support geolocation. Please enter your location instead.");
      setShowManualInput(true);
      return;
    }
    setIsGeolocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsGeolocating(false);
        handleLocationSelected(pos.coords.latitude, pos.coords.longitude);
      },
      () => {
        setIsGeolocating(false);
        setLocationError("We couldn't access your current location. Please allow access or enter it manually.");
      }
    );
  }, [handleLocationSelected]);

  const mapReady = !!initialCenter;

  const locationPrompt = (
    <div className="flex h-[50vh] w-full flex-col items-center justify-center gap-4 bg-gray-50 p-6 text-center">
      <div className="space-y-2">
        <h2 className="text-lg font-semibold">Choose a location to find nearby SNAP retailers</h2>
        <p className="text-sm text-gray-600">Use your current location or enter an address, city/state, or ZIP code.</p>
      </div>
      <div className="flex flex-col gap-2 w-full max-w-sm">
        <button
          type="button"
          onClick={handleUseCurrentLocation}
          disabled={isGeolocating || isGeocoding}
          className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
        >
          {isGeolocating ? "Locating…" : "Use my current location"}
        </button>
        <button
          type="button"
          onClick={() => {
            setShowManualInput(true);
            setLocationError(null);
          }}
          disabled={isGeolocating || isGeocoding}
          className="rounded border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:border-gray-200 disabled:text-gray-400"
        >
          Enter a location manually
        </button>
      </div>
      {showManualInput && (
        <form className="w-full max-w-sm space-y-3" onSubmit={handleManualSubmit}>
          <div className="text-left">
            <label htmlFor="manual-location" className="block text-sm font-medium text-gray-700">
              Location
            </label>
            <div
              ref={comboboxRef}
              className="relative mt-1"
              onBlur={handleComboboxBlur}
              onFocus={handleInputFocus}
            >
              <input
                id="manual-location"
                name="location"
                value={manualQuery}
                autoComplete="off"
                onChange={(event) => {
                  setManualQuery(event.target.value);
                  setLocationError(null);
                  setSuggestError(null);
                }}
                onKeyDown={handleInputKeyDown}
                role="combobox"
                aria-haspopup="listbox"
                aria-expanded={shouldShowDropdown}
                aria-controls={listboxId}
                aria-autocomplete="list"
                aria-activedescendant={
                  shouldShowDropdown && activeSuggestionIndex !== null && suggestions[activeSuggestionIndex]
                    ? `${listboxId}-option-${suggestions[activeSuggestionIndex].id}`
                    : undefined
                }
                placeholder="123 Main St, Jackson MS"
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring"
              />
              {shouldShowDropdown && (
                <div className="absolute left-0 right-0 z-10 mt-1 overflow-hidden rounded border border-gray-200 bg-white shadow-lg">
                  {isSuggestLoading ? (
                    <div className="px-3 py-2 text-sm text-gray-500">Searching…</div>
                  ) : suggestions.length > 0 ? (
                    <ul id={listboxId} role="listbox" aria-label="Address suggestions" className="max-h-60 overflow-auto py-1">
                      {suggestions.map((suggestion, index) => {
                        const isActive = index === activeSuggestionIndex;
                        const kindLabel = suggestion.kind
                          ? suggestion.kind.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase())
                          : "";
                        return (
                          <li
                            key={suggestion.id}
                            id={`${listboxId}-option-${suggestion.id}`}
                            role="option"
                            aria-selected={isActive}
                            className={`cursor-pointer px-3 py-2 text-sm transition ${
                              isActive ? "bg-blue-600 text-white" : "text-gray-900 hover:bg-gray-100"
                            }`}
                            onMouseDown={(event) => event.preventDefault()}
                            onMouseEnter={() => setActiveSuggestionIndex(index)}
                            onClick={() => handleSuggestionPick(suggestion)}
                          >
                            <div className="font-medium">{suggestion.name}</div>
                            {kindLabel && <div className={`text-xs ${isActive ? "text-blue-100" : "text-gray-500"}`}>{kindLabel}</div>}
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <div className="px-3 py-2 text-sm text-gray-500">{suggestError ?? "No matches. Try a full address, city & state, or ZIP."}</div>
                  )}
                </div>
              )}
              <p aria-live="polite" className="sr-only">
                {liveMessage}
              </p>
            </div>
            <p className="mt-1 text-xs text-gray-500">Full address, city & state, or ZIP code are all accepted.</p>
            <p className="mt-1 text-xs text-gray-500">Search by Nominatim, © OpenStreetMap contributors.</p>
          </div>
          <div className="flex items-center justify-between gap-2">
            <button
              type="submit"
              disabled={isGeocoding || isGeolocating}
              className="flex-1 rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
            >
              {isGeocoding ? "Searching…" : "Search"}
            </button>
            <button
              type="button"
              disabled={isGeocoding}
              onClick={() => {
                setShowManualInput(false);
                setLocationError(null);
              }}
              className="rounded border border-gray-300 px-3 py-2 text-xs font-medium text-gray-600 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:border-gray-200 disabled:text-gray-400"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
      {locationError && <p className="max-w-sm text-sm text-red-600">{locationError}</p>}
    </div>
  );

  return (
    <main className="flex flex-col gap-4 p-4 md:p-6">
      {isError && (
        <div
          role="status"
          aria-live="polite"
          className="rounded border border-yellow-300 bg-yellow-50 text-yellow-800 px-3 py-2 text-sm"
        >
          USDA data is temporarily unavailable; showing last good results if available.
        </div>
      )}
      <div className="flex items-center justify-between">
        <h1 className="text-xl md:text-2xl font-semibold">Food Access</h1>
        <div className="text-sm text-gray-600">
          {lastUpdated && (
            <SourceChip
              source={source}
              lastUpdated={lastUpdated}
              href={
                (process.env.NEXT_PUBLIC_USDA_SNAP_ARCGIS_FEATURE_URL as string | undefined) ??
                (process.env.NEXT_PUBLIC_USDA_SNAP_ARCGIS_URL as string | undefined)
              }
            />
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        <section className="md:col-span-7">
          <div className="rounded border bg-white overflow-hidden" aria-label="Map of SNAP retailers">
            {mapReady ? (
              <MapView items={items} onBboxChange={onBboxChange} focus={focusedItem} initialCenter={initialCenter ?? undefined} />
            ) : (
              locationPrompt
            )}
          </div>
        </section>

        <aside className="md:col-span-5 flex flex-col gap-3" aria-label="Retailer list and filters">
          <div className="rounded border bg-white p-3">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-medium">Filters</h2>
              {mapReady && (isFetching || isLoading) && <span className="text-xs text-gray-500">Loading…</span>}
            </div>
            {!mapReady ? (
              <p className="text-sm text-gray-500">Choose a location to see available filters.</p>
            ) : availableTypes.length > 0 ? (
              <div className="flex flex-wrap gap-3">
                {availableTypes.map((t) => (
                  <label key={t} className="inline-flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      className="h-4 w-4"
                      checked={selectedTypes.has(t)}
                      onChange={() => onToggleType(t)}
                    />
                    <span>{t}</span>
                  </label>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No type filters available.</p>
            )}
          </div>

          <div className="rounded border bg-white">
            <div className="p-3 border-b font-medium">Retailers{mapReady ? ` (${items.length})` : ""}</div>
            <div className="divide-y">
              {!mapReady ? (
                <div className="p-3 text-sm text-gray-500">Choose a location to load nearby retailers.</div>
              ) : isLoading ? (
                <div className="p-3 animate-pulse space-y-3">
                  <div className="h-5 bg-gray-200 rounded" />
                  <div className="h-4 bg-gray-200 rounded w-5/6" />
                  <div className="h-4 bg-gray-200 rounded w-2/3" />
                </div>
              ) : items.length === 0 ? (
                <EmptyState kind="food" />
              ) : (
                <ul>
                  {items.map((it) => (
                    <li key={it.id}>
                      <StoreCard item={it} onFocus={handleStoreFocus} />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
