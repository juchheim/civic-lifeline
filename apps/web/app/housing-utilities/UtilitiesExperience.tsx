"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  zUtilitiesCostsResponse,
  zUtilitiesElectricProvidersResponse,
  zUtilitiesGasProvidersResponse,
  zUtilitiesWaterProvidersResponse,
  type UtilitiesCostDistribution,
} from "@cl/types";
import SuccessAlert from "@/components/SuccessAlert";
import type { LocationSelection } from "@/types/location";
import { mapStoredLocationToSelection } from "@/lib/location/locationMappers";
import type { SharedLocation } from "@/components/location/SharedLocationContext";

interface UtilitiesSearchParams {
  state: string;
  county?: string;
}

const currencyFormatter = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const numberFormatter = new Intl.NumberFormat("en-US");

async function fetchUtilitiesCosts(params: UtilitiesSearchParams) {
  const search = new URLSearchParams();
  search.set("state", params.state);
  if (params.county) search.set("county", params.county);
  const res = await fetch(`/api/utilities/costs?${search.toString()}`, { headers: { accept: "application/json" } });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = (json as any)?.error?.message || "We could not load utility costs.";
    throw new Error(message);
  }
  return zUtilitiesCostsResponse.parse(json);
}

async function fetchProviders(path: string, params: UtilitiesSearchParams) {
  const search = new URLSearchParams();
  search.set("state", params.state);
  if (params.county) search.set("county", params.county);
  const res = await fetch(`${path}?${search.toString()}`, { headers: { accept: "application/json" } });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = (json as any)?.error?.message || "We could not load providers.";
    throw new Error(message);
  }
  if (path.includes("water")) return zUtilitiesWaterProvidersResponse.parse(json);
  if (path.includes("electric")) return zUtilitiesElectricProvidersResponse.parse(json);
  return zUtilitiesGasProvidersResponse.parse(json);
}

async function fetchStates(): Promise<Array<{ code: string; name: string; fips: string }>> {
  const res = await fetch("/api/states", { headers: { accept: "application/json" } });
  const json = await res.json().catch(() => []);
  if (!res.ok) {
    throw new Error("Unable to load states.");
  }
  return (json as Array<{ code: string; name: string; fips: string }>).sort((a, b) => a.name.localeCompare(b.name));
}

function formatMonthly(value: number | null) {
  if (value === null || Number.isNaN(value)) return "—";
  return currencyFormatter.format(Math.round(value));
}

function sumBuckets(distribution: UtilitiesCostDistribution | null) {
  if (!distribution) return 0;
  return distribution.buckets.reduce((total, bucket) => total + bucket.count, 0);
}

const providerTabs = [
  { id: "water", label: "Water Systems", path: "/api/utilities/providers/water" },
  { id: "electric", label: "Electric Utilities", path: "/api/utilities/providers/electric" },
  { id: "gas", label: "Gas Utilities", path: "/api/utilities/providers/gas" },
] as const;

const ASSUMPTIONS = {
  topBucketMidpoints: { electricGas: 225, waterSewerAnnual: 900 },
};

interface UtilitiesExperienceProps {
  location?: SharedLocation | null;
  promptForLocation?: () => void;
}

export default function UtilitiesExperience({ location = null, promptForLocation = () => {} }: UtilitiesExperienceProps) {
  const [locationError, setLocationError] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useState<UtilitiesSearchParams | null>(null);
  const [resolvedLabel, setResolvedLabel] = useState<string | null>(null);
  const [expandedCost, setExpandedCost] = useState<string | null>(null);
  const [activeProviderTab, setActiveProviderTab] = useState<(typeof providerTabs)[number]["id"]>("water");

  const { data: states = [], isPending: isStatesLoading, error: statesError } = useQuery({
    queryKey: ["utilities-states"],
    queryFn: fetchStates,
    staleTime: 86_400_000,
  });

  const stateLookup = useMemo(() => {
    const map = new Map<string, string>();
    for (const state of states) {
      map.set(state.name.toLowerCase(), state.code.toUpperCase());
    }
    return map;
  }, [states]);

  const resolveStateCode = useCallback(
    (selection: LocationSelection) => {
      if (selection.stateCode && selection.stateCode.length === 2) {
        return selection.stateCode.toUpperCase();
      }
      if (selection.state) {
        const match = stateLookup.get(selection.state.toLowerCase());
        if (match) return match;
      }
      return null;
    },
    [stateLookup],
  );

  const resolveCountyName = useCallback((selection: LocationSelection) => {
    if (selection.county) return selection.county;
    const countyPattern = /([^,]*(county|parish|borough|census area|municipality|city and borough))/i;
    const match = selection.label.match(countyPattern);
    if (match) return match[0].trim();
    const firstComma = selection.label.split(",")[0]?.trim();
    return firstComma || null;
  }, []);

  const handleLocationResolved = useCallback(
    (selection: LocationSelection | null) => {
      if (!selection) {
        setSearchParams(null);
        setResolvedLabel(null);
        setLocationError(null);
        return;
      }

      const state = resolveStateCode(selection);
      if (!state) {
        setSearchParams(null);
        setResolvedLabel(null);
        setLocationError("We couldn't determine the state for that location. Try another search.");
        return;
      }
      const county = resolveCountyName(selection);
      if (!county) {
        setSearchParams(null);
        setResolvedLabel(null);
        setLocationError("We couldn't determine the county for that location. Try another search.");
        return;
      }
      setSearchParams({ state, county });
      setResolvedLabel(`${county}, ${state}`);
      setLocationError(null);
    },
    [resolveCountyName, resolveStateCode],
  );

  useEffect(() => {
    if (!location) {
      handleLocationResolved(null);
      return;
    }
    const selection = mapStoredLocationToSelection(location);
    handleLocationResolved(selection);
  }, [handleLocationResolved, location]);

  const costsQuery = useQuery({
    queryKey: ["utilities-costs", searchParams?.state ?? "", searchParams?.county ?? ""],
    queryFn: () => fetchUtilitiesCosts(searchParams as UtilitiesSearchParams),
    enabled: Boolean(searchParams),
    retry: 1,
  });

  const waterQuery = useQuery({
    queryKey: ["utilities-water", searchParams?.state ?? "", searchParams?.county ?? ""],
    queryFn: () => fetchProviders("/api/utilities/providers/water", searchParams as UtilitiesSearchParams),
    enabled: Boolean(searchParams),
    retry: false,
  });

  const electricQuery = useQuery({
    queryKey: ["utilities-electric", searchParams?.state ?? "", searchParams?.county ?? ""],
    queryFn: () => fetchProviders("/api/utilities/providers/electric", searchParams as UtilitiesSearchParams),
    enabled: Boolean(searchParams),
    retry: false,
  });

  const gasQuery = useQuery({
    queryKey: ["utilities-gas", searchParams?.state ?? "", searchParams?.county ?? ""],
    queryFn: () => fetchProviders("/api/utilities/providers/gas", searchParams as UtilitiesSearchParams),
    enabled: Boolean(searchParams),
    retry: false,
  });

  const costCards = useMemo(() => {
    if (!costsQuery.data) return [];
    return [
      {
        id: "electric",
        title: "Typical monthly electricity cost (estimate)",
        distribution: costsQuery.data.electric,
        description: "Owner-occupied households reporting monthly electric costs.",
      },
      {
        id: "gas",
        title: "Typical monthly natural gas cost (estimate)",
        distribution: costsQuery.data.gas,
        description: "Owner-occupied households reporting monthly gas costs.",
      },
      {
        id: "water",
        title: "Typical monthly water & sewer (estimate)",
        distribution: costsQuery.data.waterSewer.annual,
        monthlyOverride: costsQuery.data.waterSewer.estTypicalMonthly,
        description: "Annual ACS buckets divided by 12 for a monthly estimate.",
      },
    ];
  }, [costsQuery.data]);

  const activeProviderQuery = (() => {
    if (activeProviderTab === "electric") return electricQuery;
    if (activeProviderTab === "gas") return gasQuery;
    return waterQuery;
  })();

  const isAnyLoading = Boolean(searchParams && (costsQuery.isFetching || activeProviderQuery.isFetching));
  const hasLocation = Boolean(searchParams);

  return (
    <div className="space-y-6">
      <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="space-y-3">
          <div className="space-y-1">
            <p className="text-sm text-slate-600">
              {resolvedLabel
                ? `Showing utilities costs and providers near ${resolvedLabel}.`
                : "Add your city or ZIP above to see utilities costs and providers."}
            </p>
            {locationError ? (
              <div className="rounded-xl border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">{locationError}</div>
            ) : null}
            {statesError ? (
              <p className="text-xs text-amber-600">
                {statesError.message || "Unable to load state metadata."}
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={promptForLocation}
              className="inline-flex items-center justify-center rounded-full border border-brand-primary/30 px-5 py-2 text-sm font-semibold text-brand-primary shadow-sm transition hover:bg-brand-primary/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2"
            >
              {hasLocation ? "Change location" : "Set location"}
            </button>
            {isStatesLoading && <span className="text-xs text-slate-500">Loading states…</span>}
          </div>
          {hasLocation && (costsQuery.data || activeProviderQuery.data) ? (
            <SuccessAlert
              message={resolvedLabel ? `Showing utilities data for ${resolvedLabel}` : "Location found – data loaded successfully"}
            />
          ) : null}
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Monthly costs</p>
              <p className="mt-1 text-sm text-slate-600">Estimates from ACS 5-year tables.</p>
            </div>
            {costsQuery.isFetching && <span className="text-xs text-slate-500">Refreshing…</span>}
          </div>
          {!searchParams && <p className="mt-4 text-sm text-slate-500">Search for an address or ZIP code to see typical utility bills.</p>}
          {costsQuery.error && (
            <p className="mt-4 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
              {costsQuery.error instanceof Error ? costsQuery.error.message : "Unable to load cost data."}
            </p>
          )}
          {costCards.length > 0 && (
            <div className="mt-4 space-y-4">
              {costCards.map((card) => {
                const monthlyValue = card.monthlyOverride ?? card.distribution?.estTypicalMonthly ?? null;
                const isOpen = expandedCost === card.id;
                return (
                  <div key={card.id} className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-800">{card.title}</p>
                        <p className="text-2xl font-bold text-slate-900">{formatMonthly(monthlyValue)}</p>
                      </div>
                      {card.distribution && (
                        <button
                          type="button"
                          onClick={() => setExpandedCost(isOpen ? null : card.id)}
                          className="text-sm font-semibold text-civic-blue hover:underline focus:outline-none"
                        >
                          {isOpen ? "Hide distribution" : "See distribution"}
                        </button>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-slate-500">{card.description}</p>
                    {isOpen && card.distribution && (
                      <div className="mt-3 rounded-xl border border-slate-200 bg-white">
                        <table className="w-full text-left text-xs text-slate-600">
                          <thead>
                            <tr className="text-slate-500">
                              <th className="px-3 py-2 font-medium">Bucket</th>
                              <th className="px-3 py-2 font-medium text-right">Households</th>
                            </tr>
                          </thead>
                          <tbody>
                            {card.distribution.buckets.map((bucket) => (
                              <tr key={bucket.var} className="border-t border-slate-100">
                                <td className="px-3 py-2">{bucket.label}</td>
                                <td className="px-3 py-2 text-right">{numberFormatter.format(bucket.count)}</td>
                              </tr>
                            ))}
                            <tr className="border-t border-slate-200 font-semibold">
                              <td className="px-3 py-2">Total sample</td>
                              <td className="px-3 py-2 text-right">{numberFormatter.format(sumBuckets(card.distribution))}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })}
              {costCards.length > 0 && (
                <div className="rounded-xl border border-slate-100 bg-white px-4 py-3 text-xs text-slate-500">
                  <p>
                    Midpoints for top buckets: ${ASSUMPTIONS.topBucketMidpoints.electricGas} (electric & gas) and $
                    {ASSUMPTIONS.topBucketMidpoints.waterSewerAnnual} annually for water/sewer before dividing by 12.
                  </p>
                  <a
                    href="https://www.census.gov/programs-surveys/acs"
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 inline-flex items-center text-civic-blue underline"
                  >
                    About this data
                  </a>
                </div>
              )}
            </div>
          )}
          {isAnyLoading && searchParams && costCards.length === 0 && (
            <p className="mt-4 text-sm text-slate-500">Loading cost estimates…</p>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Providers</p>
              <p className="text-sm text-slate-600">Systems serving your county.</p>
            </div>
            <div className="flex rounded-full border border-slate-200 bg-white p-1 text-xs font-semibold text-slate-600">
              {providerTabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveProviderTab(tab.id)}
                  className={`rounded-full px-3 py-1 transition ${activeProviderTab === tab.id ? "bg-brand-primary text-white shadow-sm" : "hover:bg-slate-100"}`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
          {!searchParams && <p className="mt-4 text-sm text-slate-500">Search for a location to list local providers.</p>}
          {activeProviderQuery.error && (
            <p className="mt-4 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
              {activeProviderQuery.error instanceof Error ? activeProviderQuery.error.message : "Unable to load providers."}
            </p>
          )}
          {activeProviderQuery.data && (
            <div className="mt-4 space-y-3">
              {activeProviderTab === "water" &&
                "summary" in activeProviderQuery.data &&
                activeProviderQuery.data.summary && (
                  <p className="text-xs text-slate-500">
                    {activeProviderQuery.data.summary.total && activeProviderQuery.data.summary.returned
                      ? `Showing the top ${numberFormatter.format(activeProviderQuery.data.summary.returned ?? 0)} of ${numberFormatter.format(activeProviderQuery.data.summary.total ?? 0)} water systems by population served.`
                      : "Showing the largest water systems reported for this county."}
                  </p>
                )}
              {activeProviderQuery.data.items.length === 0 && (
                <p className="text-sm text-slate-500">No providers listed for this county yet.</p>
              )}
              {activeProviderQuery.data.items.map((item) => {
                const key = "systemName" in item ? `${item.systemName}-${item.pwsId ?? ""}` : `${item.name}-${item.state ?? ""}-${item.phone ?? ""}`;
                return (
                  <div key={key} className="rounded-xl border border-slate-100 bg-slate-50/70 px-4 py-3">
                    {"systemName" in item ? (
                      <>
                        <p className="text-sm font-semibold text-slate-900">{item.systemName}</p>
                        <p className="text-xs text-slate-500">
                          {item.populationServed ? `${numberFormatter.format(item.populationServed)} people served` : "Population not listed"}
                          {item.pwsId ? ` · PWS ID ${item.pwsId}` : ""}
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-sm font-semibold text-slate-900">{item.name}</p>
                        {item.state && item.state !== "NOT AVAILABLE" && (
                          <p className="text-xs text-slate-500">{item.state}</p>
                        )}
                        {(item.phone || item.website) && (
                          <div className="mt-1 text-xs text-slate-600">
                            {item.phone && item.phone !== "NOT AVAILABLE" && <p>{item.phone}</p>}
                            {item.website && item.website !== "NOT AVAILABLE" && (
                              <a href={item.website} target="_blank" rel="noreferrer" className="text-civic-blue underline">
                                Website
                              </a>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
              {activeProviderQuery.data.notes && <p className="text-xs text-slate-500">{activeProviderQuery.data.notes}</p>}
            </div>
          )}
          {activeProviderQuery.isPending && searchParams && (
            <p className="mt-4 text-sm text-slate-500">Looking up providers…</p>
          )}
        </div>
      </section>
    </div>
  );
}
