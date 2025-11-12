"use client";

import { useMemo } from "react";
import { fetchStat } from "@/utils/fetchStat";
import { useCachedStat } from "@/hooks/useCachedStat";
import StatCard from "@/components/StatCard";

type PovertyStatData = {
  countyName: string;
  povertyCount: string | null;
  povertyRate: string | null;
};

const parsePovertyData = (json: unknown): PovertyStatData => {
  if (!Array.isArray(json) || json.length < 2) {
    throw new Error("Census SAIPE returned no data");
  }
  const row = json[1] as [string, string | null, string | null];
  return {
    countyName: row[0] ?? "County",
    povertyCount: row[1] ?? null,
    povertyRate: row[2] ?? null,
  };
};

const formatNumber = (value: string | null) => {
  if (value === null) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(parsed);
};

const formatRate = (value: string | null) => {
  if (value === null) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return `${parsed.toFixed(1)}%`;
};

export default function PovertyStatCard({ countyFips, stateFips, countyNameFallback }: { countyFips?: string; stateFips?: string; countyNameFallback?: string }) {
  const cacheKey = stateFips && countyFips ? `poverty-${stateFips}-${countyFips}` : null;

  const { data, loading, error, loaded } = useCachedStat<PovertyStatData>(
    cacheKey,
    async () => {
      const countyCode = countyFips!.slice(-3);
      const url = new URL("https://api.census.gov/data/timeseries/poverty/saipe");
      url.searchParams.set("get", "NAME,SAEPOVALL_PT,SAEPOVRTALL_PT");
      url.searchParams.set("for", `county:${countyCode}`);
      url.searchParams.set("in", `state:${stateFips}`);
      url.searchParams.set("time", "2023");
      return fetchStat(url.toString(), parsePovertyData);
    },
    [stateFips, countyFips]
  );

  const countyName = data?.countyName ?? countyNameFallback ?? "County poverty";
  const povertyCount = useMemo(() => formatNumber(data?.povertyCount ?? null), [data?.povertyCount]);
  const povertyRate = useMemo(() => formatRate(data?.povertyRate ?? null), [data?.povertyRate]);
  const hasError = Boolean(error);
  const canFetch = Boolean(cacheKey);
  const showSpinner = canFetch && (!loaded || loading);
  const shouldShowError = canFetch && !showSpinner && (hasError || !povertyCount || !povertyRate);

  return (
    <StatCard
      label="SAIPE 2023"
      region={countyName}
      title="Poverty Snapshot"
      canFetch={canFetch}
      isLoading={showSpinner}
      hasError={shouldShowError}
      emptyMessage="Select a state and county to load poverty data."
    >
      <div className="space-y-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">People in poverty</p>
          <p className="text-3xl font-semibold text-gray-900">{povertyCount}</p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Poverty rate</p>
          <p className="text-2xl font-semibold text-gray-900">{povertyRate}</p>
        </div>
      </div>
    </StatCard>
  );
}
