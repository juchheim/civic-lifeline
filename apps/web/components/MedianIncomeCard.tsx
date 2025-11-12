"use client";

import { useMemo } from "react";
import { fetchStat } from "@/utils/fetchStat";
import { useCachedStat } from "@/hooks/useCachedStat";
import StatCard from "@/components/StatCard";

type MedianIncomeData = {
  countyName: string;
  medianIncome: string | null;
};

const parseMedianIncome = (json: unknown): MedianIncomeData => {
  if (!Array.isArray(json) || json.length < 2) {
    throw new Error("ACS median income returned no data");
  }
  const row = json[1] as [string, string | null];
  return {
    countyName: row[0] ?? "County",
    medianIncome: row[1] ?? null,
  };
};

const formatIncome = (value: string | null) => {
  if (value === null) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(
    parsed
  );
};

export default function MedianIncomeCard({ countyFips, stateFips, countyNameFallback }: { countyFips?: string; stateFips?: string; countyNameFallback?: string }) {
  const cacheKey = stateFips && countyFips ? `medianIncome-${stateFips}-${countyFips}` : null;

  const { data, loading, error, loaded } = useCachedStat<MedianIncomeData>(
    cacheKey,
    async () => {
      const countyCode = countyFips!.slice(-3);
      const url = new URL("https://api.census.gov/data/timeseries/poverty/saipe");
      url.searchParams.set("get", "NAME,SAEMHI_PT");
      url.searchParams.set("for", `county:${countyCode}`);
      url.searchParams.set("in", `state:${stateFips}`);
      url.searchParams.set("time", "2023");
      return fetchStat(url.toString(), parseMedianIncome);
    },
    [stateFips, countyFips]
  );

  const countyName = data?.countyName ?? countyNameFallback ?? "County income";
  const medianIncome = useMemo(() => formatIncome(data?.medianIncome ?? null), [data?.medianIncome]);
  const hasError = Boolean(error);
  const canFetch = Boolean(cacheKey);
  const showSpinner = canFetch && (!loaded || loading);
  const shouldShowError = canFetch && !showSpinner && (hasError || !medianIncome);

  return (
    <StatCard
      label="SAIPE 2023"
      region={countyName}
      title="Median Household Income"
      canFetch={canFetch}
      isLoading={showSpinner}
      hasError={shouldShowError}
      emptyMessage="Select a state and county to load median income."
    >
      <p className="text-3xl font-semibold text-gray-900">{medianIncome}</p>
    </StatCard>
  );
}
