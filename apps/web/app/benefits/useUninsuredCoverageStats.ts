"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { zBenefitUninsuredStatsResponse, zCounty, zState, type BenefitUninsuredStatsResponse, type County, type State } from "@cl/types";
import type { BenefitsLocation } from "./useBenefitsLocation";

const DEFAULT_SAHIE_YEAR = "2022";
const zStatesResponse = zState.array();
const zCountiesResponse = zCounty.array();

const ACCENT_REGEX = /[\u0300-\u036f]/g;
const COUNTY_SUFFIX_REGEX =
  /\b(county|parish|borough|city and borough|city|census area|municipality|township|town|plantation|municipio|district|reservation|nation)\b/g;

function normalizeCountyName(value?: string | null): string {
  if (!value) return "";
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(ACCENT_REGEX, "")
    .replace(/&/g, " and ")
    .replace(/\bste[.]?\b/g, "sainte")
    .replace(/\bst[.]?\b/g, "saint")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(COUNTY_SUFFIX_REGEX, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchStates(): Promise<State[]> {
  const res = await fetch("/api/states", { headers: { accept: "application/json" } });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = (json as any)?.error ?? "Unable to load states list.";
    throw new Error(typeof message === "string" ? message : "Unable to load states list.");
  }
  return zStatesResponse.parse(json);
}

async function fetchCounties(stateCode: string): Promise<County[]> {
  const res = await fetch(`/api/counties?stateCode=${encodeURIComponent(stateCode)}`, {
    headers: { accept: "application/json" },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = (json as any)?.error ?? "Unable to load counties.";
    throw new Error(typeof message === "string" ? message : "Unable to load counties.");
  }
  return zCountiesResponse.parse(json);
}

async function fetchUninsuredStats(params: { stateFips: string; countyFips?: string | null }): Promise<BenefitUninsuredStatsResponse> {
  const search = new URLSearchParams({ stateFips: params.stateFips, time: DEFAULT_SAHIE_YEAR });
  if (params.countyFips) {
    search.set("countyFips", params.countyFips);
  }
  const res = await fetch(`/api/stats/uninsured?${search.toString()}`, {
    headers: { accept: "application/json" },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = (json as any)?.error ?? "Unable to load uninsured stats.";
    throw new Error(typeof message === "string" ? message : "Unable to load uninsured stats.");
  }
  return zBenefitUninsuredStatsResponse.parse(json);
}

function resolveCountyFips(counties: County[], countyName?: string | null): string | null {
  if (!countyName) return null;
  const normalizedTarget = normalizeCountyName(countyName);
  if (!normalizedTarget) return null;

  const withNormalized = counties.map((county) => ({
    normalized: normalizeCountyName(county.name),
    fips: county.fips,
  }));

  const exact = withNormalized.find((county) => county.normalized === normalizedTarget);
  if (exact) return exact.fips;

  const partial = withNormalized.find(
    (county) => county.normalized.includes(normalizedTarget) || normalizedTarget.includes(county.normalized),
  );
  return partial?.fips ?? null;
}

interface UseUninsuredCoverageStatsResult {
  data: BenefitUninsuredStatsResponse | undefined;
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  error: unknown;
  refetch: () => void;
  stateFips: string | null;
  countyFips: string | null;
  hasCountyMatch: boolean;
  isResolvingLocation: boolean;
}

export function useUninsuredCoverageStats(location: BenefitsLocation | null): UseUninsuredCoverageStatsResult {
  const stateCode = location?.stateCode?.toUpperCase() ?? null;
  const countyName = location?.countyName ?? null;

  const statesQuery = useQuery({
    queryKey: ["states"],
    queryFn: fetchStates,
    staleTime: 1000 * 60 * 60 * 24, // 1 day
    enabled: Boolean(stateCode),
  });

  const stateFips = useMemo(() => {
    if (!stateCode) return null;
    const match = statesQuery.data?.find((state) => state.code === stateCode);
    return match?.fips ?? null;
  }, [stateCode, statesQuery.data]);

  const shouldResolveCounty = Boolean(!location?.countyFips && countyName && stateCode);
  const countiesQuery = useQuery({
    queryKey: ["counties", stateCode],
    queryFn: () => fetchCounties(stateCode!),
    staleTime: 1000 * 60 * 60 * 24,
    enabled: shouldResolveCounty,
  });

  const derivedCountyFips = useMemo(() => {
    if (!shouldResolveCounty) return null;
    if (!countiesQuery.data) return null;
    return resolveCountyFips(countiesQuery.data, countyName);
  }, [countyName, countiesQuery.data, shouldResolveCounty]);

  const countyFips = location?.countyFips ?? derivedCountyFips ?? null;
  const hasCountyMatch = Boolean(countyName && countyFips);

  const statsQuery = useQuery({
    queryKey: ["benefits", "uninsured", stateFips, countyFips ?? null],
    queryFn: () => fetchUninsuredStats({ stateFips: stateFips!, countyFips }),
    staleTime: 1000 * 60 * 10, // 10 minutes
    enabled: Boolean(stateFips),
  });

  const isResolvingLocation = statesQuery.isLoading || statesQuery.isFetching || countiesQuery.isLoading || countiesQuery.isFetching;
  const isStatsLoading = statsQuery.isLoading || statsQuery.isFetching;

  return {
    data: statsQuery.data,
    isLoading: isResolvingLocation || (Boolean(stateFips) && isStatsLoading && !statsQuery.data),
    isFetching: isStatsLoading,
    isError: statsQuery.isError,
    error: statsQuery.error,
    refetch: () => {
      void statsQuery.refetch();
    },
    stateFips,
    countyFips,
    hasCountyMatch,
    isResolvingLocation,
  };
}
