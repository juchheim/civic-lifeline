"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { zCounselorsResponse, zFmrResponse } from "@cl/types";
import SourceChip from "@/components/SourceChip";
import SuccessAlert from "@/components/SuccessAlert";
import { locationCopy } from "@/config/locationCopy";
import { mapStoredLocationToSelection } from "@/lib/location/locationMappers";
import type { SharedLocation } from "@/components/location/SharedLocationContext";

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
  location?: SharedLocation | null;
  promptForLocation?: () => void;
}

const DEFAULT_RADIUS = "100";
// During the HUD shutdown we pin to the static dataset year. Update when live HUD API resumes (docs/hud-fmr-static.md).
const DEFAULT_FMR_YEAR = "2024";

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

export default function HousingExperience({
  showIntro = true,
  wrapperClassName,
  id,
  location = null,
  promptForLocation = () => {},
}: HousingExperienceProps) {
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [advanced, setAdvanced] = useState({ radius: DEFAULT_RADIUS, lat: "", lon: "", fips: "", year: DEFAULT_FMR_YEAR });
  const [counselorSearch, setCounselorSearch] = useState<CounselorSearchParams | null>(null);
  const [fmrSearch, setFmrSearch] = useState<FmrSearchParams | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const resolvedLocation = useMemo(() => (location ? mapStoredLocationToSelection(location) : null), [location]);

  const runSearch = useCallback(() => {
    const manualLat = advanced.lat.trim();
    const manualLon = advanced.lon.trim();
    const manualFips = advanced.fips.trim();
    const manualYear = advanced.year.trim() || DEFAULT_FMR_YEAR;
    const radius = advanced.radius.trim() || DEFAULT_RADIUS;

    const hasPartialCoords = (manualLat && !manualLon) || (!manualLat && manualLon);
    if (hasPartialCoords) {
      setFormError("Provide both latitude and longitude to use manual coordinates.");
      return;
    }

    const hasManualCoords = Boolean(manualLat && manualLon);
    const activeLocation = resolvedLocation;

    if (!hasManualCoords && !activeLocation && !manualFips) {
      setFormError(locationCopy.enterLocationOrProvideCoords);
      return;
    }

    setFormError(null);

    const counselorParams: CounselorSearchParams = { radius };
    if (hasManualCoords) {
      counselorParams.lat = manualLat;
      counselorParams.lon = manualLon;
    } else if (activeLocation) {
      counselorParams.lat = activeLocation.lat.toFixed(6);
      counselorParams.lon = activeLocation.lon.toFixed(6);
    }

    const fmrParams: FmrSearchParams = { year: manualYear };
    if (manualFips) {
      fmrParams.fips = manualFips;
    } else if (hasManualCoords) {
      fmrParams.lat = manualLat;
      fmrParams.lon = manualLon;
    } else if (activeLocation) {
      fmrParams.lat = activeLocation.lat.toFixed(6);
      fmrParams.lon = activeLocation.lon.toFixed(6);
    } else {
      setFormError(locationCopy.provideCountyFipsOrLocation);
      return;
    }

    setCounselorSearch(counselorParams);
    setFmrSearch(fmrParams);
  }, [advanced, resolvedLocation]);

  useEffect(() => {
    const manualLat = advanced.lat.trim();
    const manualLon = advanced.lon.trim();
    const manualFips = advanced.fips.trim();
    if (!resolvedLocation || manualLat || manualLon || manualFips) {
      return;
    }
    runSearch();
  }, [advanced.lat, advanced.lon, advanced.fips, resolvedLocation, runSearch]);

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

  const isSearching = counselorsQuery.isFetching || fmrQuery.isFetching;

  const searchSummary = useMemo(() => {
    const manualLat = advanced.lat.trim();
    const manualLon = advanced.lon.trim();
    const manualFips = advanced.fips.trim();

    if (manualLat && manualLon) {
      return `Manual coordinates (${manualLat}, ${manualLon})`;
    }
    if (manualFips) {
      return `FIPS ${manualFips}`;
    }
    if (resolvedLocation) return resolvedLocation.label;
    if (counselorSearch?.lat && counselorSearch?.lon) {
      return `Lat ${counselorSearch.lat}, Lon ${counselorSearch.lon}`;
    }
    if (fmrSearch?.lat && fmrSearch?.lon) {
      return `Lat ${fmrSearch.lat}, Lon ${fmrSearch.lon}`;
    }
    return "No location selected";
  }, [advanced.fips, advanced.lat, advanced.lon, counselorSearch, fmrSearch, resolvedLocation]);

  const hasManualCoords = Boolean(advanced.lat.trim() && advanced.lon.trim());
  const hasManualOverrides = hasManualCoords || Boolean(advanced.fips.trim());
  const canSearch = Boolean(resolvedLocation) || hasManualOverrides;

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

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="space-y-4">
          <div className="space-y-1">
            <div className="text-xs text-slate-500">
              Selected location: <span className="font-medium text-slate-700">{searchSummary}</span>
            </div>
            {!canSearch ? (
              <p className="text-sm text-slate-600">
                Add your city or ZIP above (or use the advanced options) to search for housing data.
              </p>
            ) : null}
            {formError ? (
              <div className="rounded-xl border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</div>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-full bg-brand-primary px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-brand-primary/50"
              onClick={runSearch}
              disabled={isSearching || !canSearch}
            >
              {isSearching ? "Searching…" : "Search housing data"}
            </button>
            <button
              type="button"
              onClick={promptForLocation}
              className="inline-flex items-center justify-center rounded-full border border-brand-primary/30 px-5 py-2 text-sm font-semibold text-brand-primary shadow-sm transition hover:bg-brand-primary/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2"
            >
              Change location
            </button>
            <button
              type="button"
              onClick={() => setAdvancedOpen((prev) => !prev)}
              className="text-sm font-medium text-brand-primary hover:text-brand-primary/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2"
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

          {(counselorsQuery.data || fmrQuery.data) && (
            <div className="mt-4">
              <SuccessAlert message="Location found – data loaded successfully" />
            </div>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
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
            <div className="rounded-xl border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
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

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
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
            <div className="rounded-xl border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
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
