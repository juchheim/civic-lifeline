"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  zUtilitiesCostsResponse,
  zUtilitiesElectricProvidersResponse,
  zUtilitiesGasProvidersResponse,
  zUtilitiesWaterProvidersResponse,
  type UtilitiesCostDistribution,
} from "@cl/types";

type LocationMode = "county" | "city";

interface UtilitiesSearchParams {
  state: string;
  county?: string;
  city?: string;
}

interface ChoiceOption {
  label: string;
  value: string;
}

const ACS_DATASET = "https://api.census.gov/data/2023/acs/acs5";
const currencyFormatter = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const numberFormatter = new Intl.NumberFormat("en-US");

async function fetchUtilitiesCosts(params: UtilitiesSearchParams) {
  const search = new URLSearchParams();
  search.set("state", params.state);
  if (params.county) search.set("county", params.county);
  if (params.city) search.set("city", params.city);
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
  if (params.city) search.set("city", params.city);
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

async function fetchCountyOptions(stateCode: string): Promise<ChoiceOption[]> {
  if (!stateCode) return [];
  const res = await fetch(`/api/counties?stateCode=${encodeURIComponent(stateCode)}`, { headers: { accept: "application/json" } });
  const json = await res.json().catch(() => []);
  if (!res.ok) {
    throw new Error("Unable to load counties for that state.");
  }
  return (json as Array<{ name: string }>).map((county) => ({ label: county.name, value: county.name }));
}

async function fetchCityChoices(stateFips: string): Promise<ChoiceOption[]> {
  if (!stateFips) return [];
  const params = new URLSearchParams();
  params.set("get", "NAME");
  params.set("in", `state:${stateFips}`);
  params.set("for", "place:*");
  const res = await fetch(`${ACS_DATASET}?${params.toString()}`, { headers: { accept: "application/json" } });
  const json = (await res.json().catch(() => [])) as string[][];
  if (!Array.isArray(json) || json.length < 2) {
    throw new Error("We could not load cities for that state.");
  }
  return json.slice(1).map((row) => {
    const nameWithState = row[0] ?? "";
    const commaIndex = nameWithState.indexOf(",");
    const label = commaIndex >= 0 ? nameWithState.slice(0, commaIndex).trim() : nameWithState.trim();
    return { label, value: label };
  });
}

function buildSearchParams(state: string, mode: LocationMode, value: string): UtilitiesSearchParams {
  const trimmed = value.trim();
  if (!trimmed) throw new Error(`Enter a ${mode === "county" ? "county" : "city"} name.`);
  return mode === "county"
    ? { state, county: trimmed }
    : { state, city: trimmed };
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

export default function UtilitiesExperience() {
  const [stateCode, setStateCode] = useState("MS");
  const [mode, setMode] = useState<LocationMode>("county");
  const [locationInput, setLocationInput] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useState<UtilitiesSearchParams | null>(null);
  const [expandedCost, setExpandedCost] = useState<string | null>(null);
  const [activeProviderTab, setActiveProviderTab] = useState<(typeof providerTabs)[number]["id"]>("water");

  const { data: states = [], isPending: isStatesLoading, error: statesError } = useQuery({
    queryKey: ["utilities-states"],
    queryFn: fetchStates,
    staleTime: 86_400_000,
  });

  const stateMeta = useMemo(() => states.find((state) => state.code === stateCode) ?? null, [states, stateCode]);

  const { data: countyChoices = [], isPending: isCountyLoading, error: countyError } = useQuery({
    queryKey: ["utilities-counties", stateCode],
    queryFn: () => fetchCountyOptions(stateCode),
    staleTime: 3600_000,
    enabled: Boolean(stateCode),
  });

  const { data: cityChoices = [], isPending: isCityLoading, error: cityError } = useQuery({
    queryKey: ["utilities-cities", stateCode, stateMeta?.fips ?? ""],
    queryFn: () => fetchCityChoices(stateMeta?.fips ?? ""),
    staleTime: 3600_000,
    enabled: Boolean(stateMeta?.fips),
  });

  const costsQuery = useQuery({
    queryKey: ["utilities-costs", searchParams?.state ?? "", searchParams?.county ?? "", searchParams?.city ?? ""],
    queryFn: () => fetchUtilitiesCosts(searchParams as UtilitiesSearchParams),
    enabled: Boolean(searchParams),
    retry: 1,
  });

  const waterQuery = useQuery({
    queryKey: ["utilities-water", searchParams?.state ?? "", searchParams?.county ?? "", searchParams?.city ?? ""],
    queryFn: () => fetchProviders("/api/utilities/providers/water", searchParams as UtilitiesSearchParams),
    enabled: Boolean(searchParams),
    retry: false,
  });

  const electricQuery = useQuery({
    queryKey: ["utilities-electric", searchParams?.state ?? "", searchParams?.county ?? "", searchParams?.city ?? ""],
    queryFn: () => fetchProviders("/api/utilities/providers/electric", searchParams as UtilitiesSearchParams),
    enabled: Boolean(searchParams),
    retry: false,
  });

  const gasQuery = useQuery({
    queryKey: ["utilities-gas", searchParams?.state ?? "", searchParams?.county ?? "", searchParams?.city ?? ""],
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

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setFormError(null);
    try {
      const params = buildSearchParams(stateCode, mode, locationInput);
      setSearchParams(params);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Enter a location.");
    }
  };

  const handleModeChange = (next: LocationMode) => {
    setMode(next);
    setLocationInput("");
    setFormError(null);
  };

  const locationPlaceholder = mode === "county" ? "Start typing a county (e.g., Yazoo County)" : "Start typing a city (e.g., Yazoo City)";
  const isAnyLoading = costsQuery.isPending || activeProviderQuery.isPending;

  return (
    <div className="space-y-6">
      <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Search</p>
            <p className="text-sm text-slate-600">Pick a state, then search by county (best) or city.</p>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-medium text-slate-700">
              State
              <select
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-civic-blue focus:outline-none focus:ring-2 focus:ring-civic-blue/30"
                value={stateCode}
                onChange={(event) => {
                  setStateCode(event.target.value);
                  setLocationInput("");
                  setFormError(null);
                }}
              >
                {states.length === 0 && <option value="">Loading states…</option>}
                {states.map((state) => (
                  <option key={state.code} value={state.code}>
                    {state.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="text-sm font-medium text-slate-700">
              Location type
              <div className="mt-1 flex rounded-xl border border-slate-300 bg-white p-1 text-sm font-semibold text-slate-600">
                {(["county", "city"] as const).map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => handleModeChange(option)}
                    className={`flex-1 rounded-lg px-3 py-2 transition ${
                      mode === option ? "bg-civic-blue text-white shadow-sm" : "hover:bg-slate-100"
                    }`}
                  >
                    {option === "county" ? "County" : "City"}
                  </button>
                ))}
              </div>
              <p className="mt-1 text-xs text-slate-500">Counties are more reliable. Cities resolve to Census “place” codes.</p>
            </div>
          </div>
          <label className="text-sm font-medium text-slate-700">
            {mode === "county" ? "County name" : "City name"}
            <input
              list={`utilities-${mode}-options`}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm placeholder-slate-400 focus:border-civic-blue focus:outline-none focus:ring-2 focus:ring-civic-blue/30"
              placeholder={locationPlaceholder}
              value={locationInput}
              onChange={(event) => setLocationInput(event.target.value)}
            />
            {mode === "county" ? (
              <datalist id="utilities-county-options">
                {countyChoices.map((option) => (
                  <option key={option.value} value={option.label} />
                ))}
              </datalist>
            ) : (
              <datalist id="utilities-city-options">
                {cityChoices.map((option) => (
                  <option key={option.value} value={option.label} />
                ))}
              </datalist>
            )}
          </label>
          {formError && <p className="text-sm text-red-600">{formError}</p>}
          {(countyError || cityError) && (
            <p className="text-xs text-amber-600">
              {mode === "county"
                ? countyError?.message || "Unable to load county suggestions."
                : cityError?.message || "Unable to load city suggestions."}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              className="inline-flex items-center rounded-full bg-civic-blue px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-civic-blue/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-civic-blue focus-visible:ring-offset-2"
            >
              Check utilities
            </button>
            {(isStatesLoading || isCountyLoading || isCityLoading) && <span className="text-xs text-slate-500">Loading choices…</span>}
            {statesError && <span className="text-xs text-red-600">{statesError.message}</span>}
          </div>
        </form>
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
          {!searchParams && <p className="mt-4 text-sm text-slate-500">Enter a county or city to see typical utility bills.</p>}
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
                  className={`rounded-full px-3 py-1 transition ${activeProviderTab === tab.id ? "bg-civic-blue text-white shadow-sm" : "hover:bg-slate-100"}`}
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
                        <p className="text-xs text-slate-500">{item.state || "—"}</p>
                        <div className="mt-1 text-xs text-slate-600">
                          {item.phone && <p>{item.phone}</p>}
                          {item.website && (
                            <a href={item.website} target="_blank" rel="noreferrer" className="text-civic-blue underline">
                              Website
                            </a>
                          )}
                        </div>
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
