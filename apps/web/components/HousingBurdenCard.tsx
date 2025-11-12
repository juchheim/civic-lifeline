"use client";

import { useMemo } from "react";
import { fetchStat } from "@/utils/fetchStat";
import { useCachedStat } from "@/hooks/useCachedStat";
import StatCard from "@/components/StatCard";

type HousingBurdenData = {
  countyName: string;
  percent: string | null;
};

const parseHousingBurden = (json: unknown): HousingBurdenData => {
  if (!Array.isArray(json) || json.length < 2) {
    throw new Error("ACS housing profile returned no data");
  }
  const row = json[1] as [string, string | null];
  return {
    countyName: row[0] ?? "County",
    percent: row[1] ?? null,
  };
};

const formatPercent = (value: string | null) => {
  if (!value) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return `${parsed.toFixed(1)}%`;
};

export default function HousingBurdenCard({ stateFips, countyFips }: { stateFips?: string; countyFips?: string }) {
  const cacheKey = stateFips && countyFips ? `housingBurden-${stateFips}-${countyFips}` : null;

  const { data, loading, error, loaded } = useCachedStat<HousingBurdenData>(
    cacheKey,
    async () => {
      const countyCode = countyFips!.slice(-3);
      const url = new URL("https://api.census.gov/data/2023/acs/acs5/profile");
      url.searchParams.set("get", "NAME,DP04_0142PE");
      url.searchParams.set("for", `county:${countyCode}`);
      url.searchParams.set("in", `state:${stateFips}`);
      return fetchStat(url.toString(), parseHousingBurden);
    },
    [stateFips, countyFips]
  );

  const formattedPercent = useMemo(() => formatPercent(data?.percent ?? null), [data?.percent]);
  const canFetch = Boolean(cacheKey);
  const showSpinner = canFetch && (!loaded || loading);
  const hasError = Boolean(error);
  const shouldShowError = canFetch && !showSpinner && (hasError || !formattedPercent);

  return (
    <StatCard
      label="ACS Profile 2023"
      region={data?.countyName ?? "Housing Cost Burden"}
      title="Renters Spending 35%+"
      description="Share of households devoting at least 35% of income to rent"
      canFetch={canFetch}
      isLoading={showSpinner}
      hasError={shouldShowError}
      emptyMessage="Select a county to load housing data."
    >
      <p className="text-base font-semibold text-gray-900">
        Housing Cost Burden: {formattedPercent} of households
      </p>
    </StatCard>
  );
}
