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
import { Check, Crosshair, Loader2, Sparkles } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { zSnapResponse, type SnapResponse, type SnapItem } from "@cl/types";
import { bboxToQueryParam } from "@cl/utils";
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
  const [manualQuery, setManualQuery] = useState("");
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isManualOpen, setIsManualOpen] = useState(false);
  const [isLocationBlocked, setIsLocationBlocked] = useState(false);
  const [overlayState, setOverlayState] = useState<"awaiting" | "confirming" | "hidden">("awaiting");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [suggestError, setSuggestError] = useState<string | null>(null);
  const [isSuggestLoading, setIsSuggestLoading] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState<number | null>(null);
  const [isSuggestionOpen, setIsSuggestionOpen] = useState(false);
  const [liveMessage, setLiveMessage] = useState("");
  const debouncedBbox = useDebouncedValue(bbox, 400);
  const debouncedManualQuery = useDebouncedValue(manualQuery, 350);
  const comboboxRef = useRef<HTMLDivElement | null>(null);
  const manualInputRef = useRef<HTMLInputElement | null>(null);
  const overlayTimerRef = useRef<number | null>(null);
  const listboxId = "manual-location-listbox";
  const mapSectionRef = useRef<HTMLDivElement | null>(null);
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

  const { data, isLoading, isError } = useQuery<SnapResponse | null>({
    queryKey: ["snap", bboxParam, typesParam],
    queryFn: fetchSnap,
    enabled: !!bboxParam,
    staleTime: 60_000,
    placeholderData: (prev) => prev as any,
    retry: 1,
    refetchOnWindowFocus: false,
  });

  const items = useMemo(() => data?.items ?? [], [data]);
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

  const handleStoreFocus = useCallback(
    (store: SnapItem) => {
      setFocusedItem({ ...store });
      if (mapSectionRef.current) {
        mapSectionRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    },
    [],
  );

  useEffect(() => {
    setFocusedItem(null);
  }, [typesParam]);

  useEffect(() => {
    return () => {
      if (overlayTimerRef.current) {
        clearTimeout(overlayTimerRef.current);
        overlayTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
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
  }, [debouncedManualQuery]);

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

  useEffect(() => {
    if (!initialCenter) {
      if (overlayTimerRef.current) {
        clearTimeout(overlayTimerRef.current);
        overlayTimerRef.current = null;
      }
      setOverlayState("awaiting");
    }
  }, [initialCenter]);

  const handleLocationSelected = useCallback(
    (lat: number, lon: number) => {
      setInitialCenter([lat, lon]);
      setBbox(null);
      setFocusedItem(null);
      setLocationError(null);
      setManualQuery("");
      setIsLocationBlocked(false);
      if (overlayTimerRef.current) {
        clearTimeout(overlayTimerRef.current);
        overlayTimerRef.current = null;
      }
      setOverlayState("confirming");
      overlayTimerRef.current = window.setTimeout(() => {
        setOverlayState("hidden");
        overlayTimerRef.current = null;
      }, 1500);
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
    setIsLocationBlocked(false);
    if (!navigator.geolocation) {
      setLocationError("Your browser does not support geolocation. Please enter your location instead.");
      return;
    }
    setIsGeolocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsGeolocating(false);
        setIsLocationBlocked(false);
        handleLocationSelected(pos.coords.latitude, pos.coords.longitude);
        setTimeout(() => {
          mapSectionRef.current?.focus({ preventScroll: false });
        }, 50);
      },
      (err) => {
        setIsGeolocating(false);
        const blocked =
          typeof err?.code === "number" &&
          typeof err?.PERMISSION_DENIED === "number" &&
          err.code === err.PERMISSION_DENIED;
        if (blocked) {
          setIsLocationBlocked(true);
          setIsManualOpen(true);
          setTimeout(() => {
            manualInputRef.current?.focus();
          }, 16);
          setLocationError("Location is blocked. Type an address instead.");
          return;
        }
        setLocationError("We couldn't access your current location. Please allow access or enter it manually.");
      },
      { enableHighAccuracy: true }
    );
  }, [handleLocationSelected]);

  const mapReady = !!initialCenter;
  const isMapInteractive = mapReady && overlayState === "hidden";

  return (
    <main className={`space-y-12 bg-neutral-bg ${!mapReady ? "pb-28" : "pb-16"}`}>
      <section className="mt-4 overflow-hidden rounded-[2.25rem] border border-slate-200 bg-white shadow-md shadow-slate-400/5">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,0.55fr)_minmax(0,1.45fr)] lg:items-stretch">
          <div className="flex flex-col px-6 py-6 sm:px-10 sm:py-8">
            <div className="w-full max-w-[480px] space-y-4">
              <span className="inline-flex w-fit items-center gap-2 rounded-full border border-brand-primary/20 bg-brand-primary/10 px-4 py-1.5 text-sm font-semibold uppercase tracking-[0.24em] text-brand-primary">
                <Sparkles className="h-4 w-4" />
                Food Help
              </span>
              <div className="space-y-4">
                <h1 className="text-3xl font-semibold leading-[1.1] text-slate-900 sm:text-[2.5rem]">
                  Find food retailers who accept SNAP.
                </h1>
                <div className="space-y-2">
                  {isLocationBlocked ? (
                    <p className="max-w-xl text-base font-medium leading-snug text-rose-600 sm:text-lg">
                      Location is blocked. Type an address instead.
                    </p>
                  ) : (
                    <>
                      <p className="max-w-xl text-base leading-normal text-slate-600 sm:text-lg">
                        Tap <strong>Use my current location</strong> to see stores that accept EBT.
                      </p>
                      <p className="text-xs font-medium text-slate-500">We don&apos;t save your location.</p>
                    </>
                  )}
                </div>
              </div>
            </div>
            <div className="mt-3 w-full max-w-[480px]">
              <div>
                <button
                  type="button"
                  onClick={handleUseCurrentLocation}
                  disabled={isGeolocating || isGeocoding}
                  className="inline-flex w-full items-center justify-center gap-3 rounded-2xl bg-brand-primary px-6 py-4 text-lg font-semibold text-white shadow-lg shadow-brand-primary/30 transition hover:bg-brand-primary/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isGeolocating ? (
                    <>
                      <Loader2 className="h-6 w-6 animate-spin" aria-hidden />
                      <span>Finding your location…</span>
                    </>
                  ) : (
                    <>
                      <Crosshair className="h-6 w-6" aria-hidden />
                      <span>Use my current location</span>
                    </>
                  )}
                </button>
              </div>

              <button
                type="button"
                onClick={() => setIsManualOpen((prev) => !prev)}
                aria-expanded={isManualOpen}
                aria-controls={isManualOpen ? "manual-location-form" : undefined}
                className="mt-2 inline-flex text-sm font-semibold text-brand-primary underline decoration-brand-primary/20 underline-offset-4 transition hover:text-brand-primary/80"
              >
                {isManualOpen ? "Hide address form" : "Type an address instead"}
              </button>

              {isManualOpen && (
                <form
                  id="manual-location-form"
                  className="mt-4 space-y-4 rounded-2xl border border-slate-200/80 bg-white/70 p-4 shadow-inner shadow-slate-200/70"
                  onSubmit={handleManualSubmit}
                >
                  <div>
                    <label htmlFor="manual-location" className="block text-sm font-semibold text-slate-700">
                      Search another location
                    </label>
                    <div ref={comboboxRef} className="relative mt-2" onBlur={handleComboboxBlur} onFocus={handleInputFocus}>
                      <input
                        ref={manualInputRef}
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
                        className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-base text-slate-900 placeholder:text-slate-400 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/40"
                      />
                      {shouldShowDropdown && (
                        <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-10 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-500/10">
                          {isSuggestLoading ? (
                            <div className="px-4 py-3 text-sm text-slate-500">Searching…</div>
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
                                    className={`cursor-pointer px-4 py-2 text-sm font-medium transition ${
                                      isActive ? "bg-brand-primary text-white" : "text-slate-800 hover:bg-brand-primary/5"
                                    }`}
                                    onMouseDown={(event) => event.preventDefault()}
                                    onMouseEnter={() => setActiveSuggestionIndex(index)}
                                    onClick={() => handleSuggestionPick(suggestion)}
                                  >
                                    <div>{suggestion.name}</div>
                                    {kindLabel && (
                                      <div className={`text-xs ${isActive ? "text-brand-primary/20" : "text-slate-500"}`}>{kindLabel}</div>
                                    )}
                                  </li>
                                );
                              })}
                            </ul>
                          ) : (
                            <div className="px-4 py-3 text-sm text-slate-500">
                              {suggestError ?? "No matches. Try a full address, city & state, or ZIP."}
                            </div>
                          )}
                        </div>
                      )}
                      <p aria-live="polite" className="sr-only">
                        {liveMessage}
                      </p>
                    </div>
                    <p className="mt-2 mb-6 text-xs text-slate-500">Enter address, city & state, or ZIP code.</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="submit"
                      disabled={isGeocoding || isGeolocating}
                      className="inline-flex flex-1 items-center justify-center rounded-2xl bg-brand-primary px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-primary/30 transition hover:opacity-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isGeocoding ? "Searching…" : "Search"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setManualQuery("");
                        setSuggestions([]);
                        setSuggestError(null);
                        setLocationError(null);
                        setIsSuggestionOpen(false);
                        setActiveSuggestionIndex(null);
                        setIsSuggestLoading(false);
                        setLiveMessage("");
                      }}
                      className="rounded-2xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2"
                    >
                      Clear
                    </button>
                  </div>
                </form>
              )}

              {locationError && <p className="text-sm font-medium text-rose-600">{locationError}</p>}
            </div>
          </div>
          <div className="relative">
            <div className="relative flex h-full flex-col gap-6 rounded-t-3xl px-6 py-8 text-slate-900 sm:px-10 lg:rounded-none">
              {isMapInteractive && (
                <div className="rounded-3xl border border-white/70 bg-white p-4 shadow-lg shadow-slate-400/20">
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="flex flex-col">
                      <span className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-primary">Store types</span>
                      <span className="text-xs text-slate-500">Tap a chip to filter the pins and the list.</span>
                    </div>
                    <div className="flex flex-1 flex-wrap items-center gap-2">
                      {availableTypes.length > 0 ? (
                        availableTypes.map((t) => {
                          const isChecked = selectedTypes.has(t);
                          return (
                            <button
                              key={t}
                              type="button"
                              onClick={() => onToggleType(t)}
                              aria-pressed={isChecked}
                              className={`inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-semibold shadow-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/40 ${
                                isChecked
                                  ? "border-brand-primary bg-brand-primary text-white"
                                  : "border-slate-200 bg-white text-slate-700 hover:border-brand-primary/40"
                              }`}
                            >
                              <span
                                className={`flex h-4 w-4 items-center justify-center rounded-full border ${
                                  isChecked ? "border-white/50 bg-white/20" : "border-slate-200 bg-slate-100"
                                }`}
                                aria-hidden
                              >
                                <Check className={`h-3 w-3 ${isChecked ? "opacity-100" : "opacity-0"}`} />
                              </span>
                              <span>{t}</span>
                            </button>
                          );
                        })
                      ) : (
                        <p className="text-sm text-slate-500">No filters here.</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="relative">
                <div
                  role="status"
                  aria-live="polite"
                  className={`absolute inset-0 z-10 flex items-center justify-center rounded-[2.25rem] border border-slate-200 bg-slate-100 px-6 text-center text-base font-medium text-slate-700 transition-opacity duration-500 ${
                    overlayState === "hidden" ? "pointer-events-none opacity-0" : "opacity-100"
                  }`}
                >
                  <div className="flex flex-col items-center gap-2">
                    <Crosshair className="h-6 w-6 text-slate-500" aria-hidden />
                    <span>
                      {overlayState === "confirming" ? "Location on — showing stores near you." : "Turn on location or type an address to unlock the map."}
                    </span>
                  </div>
                </div>
                <div className={`grid items-stretch gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] ${isMapInteractive ? "" : "opacity-60"}`}>
                  <div
                    ref={mapSectionRef}
                    tabIndex={-1}
                    className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-50"
                    aria-label="Map of SNAP retailers"
                    style={{ height: "31rem" }}
                  >
                    {mapReady ? (
                      <MapView
                        items={items}
                        onBboxChange={onBboxChange}
                        focus={focusedItem}
                        initialCenter={initialCenter ?? undefined}
                        height="100%"
                      />
                    ) : (
                      <div className="h-full w-full bg-slate-50" aria-hidden />
                    )}
                  </div>

                  <div className="flex flex-col rounded-3xl border border-slate-200 bg-white shadow-md shadow-slate-300/30" style={{ height: "31rem" }}>
                    {isMapInteractive && (
                      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-primary">Nearby retailers</p>
                          <p className="text-2xl font-semibold text-slate-900">
                            {`${items.length} ${items.length === 1 ? "match" : "matches"}`}
                          </p>
                          <p className="text-xs text-slate-500">Tap a store to highlight the pin.</p>
                        </div>
                      </div>
                    )}
                    <div
                      className="custom-scrollbar flex-1 overflow-y-scroll divide-y divide-slate-100 bg-white"
                      aria-live="polite"
                      style={{ height: isMapInteractive ? "calc(31rem - 5rem)" : "100%" }}
                    >
                      {!isMapInteractive ? (
                        <div className="sr-only">Choose a location to load nearby retailers.</div>
                      ) : isLoading ? (
                        <div className="space-y-4 p-5">
                          <div className="h-5 rounded-full bg-brand-primary/10" />
                          <div className="h-4 w-5/6 rounded-full bg-brand-primary/10" />
                          <div className="h-4 w-2/3 rounded-full bg-brand-primary/10" />
                        </div>
                      ) : items.length === 0 ? (
                        <div className="p-5">
                          <EmptyState kind="food" />
                        </div>
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
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      <p className="mt-4 text-center text-xs text-slate-500">Search by Nominatim, © OpenStreetMap contributors.</p>
      {isError && (
        <div
          role="status"
          aria-live="polite"
          className="rounded-3xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900 shadow-md shadow-amber-200/50"
        >
          USDA data is temporarily unavailable; showing last good results if available.
        </div>
      )}
      {!mapReady && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white/95 px-4 py-3 shadow-[0_-8px_24px_rgba(15,23,42,0.12)] sm:hidden">
          <button
            type="button"
            onClick={handleUseCurrentLocation}
            disabled={isGeolocating || isGeocoding}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-primary px-4 py-3 text-base font-semibold text-white shadow-md shadow-brand-primary/40 transition hover:bg-brand-primary/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isGeolocating ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
                <span>Finding your location…</span>
              </>
            ) : (
              <>
                <Crosshair className="h-6 w-6" aria-hidden />
                <span>Use my current location</span>
              </>
            )}
          </button>
        </div>
      )}
    </main>
  );
}
