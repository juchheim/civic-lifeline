"use client";

import { useMemo } from "react";
import { fetchStat } from "@/utils/fetchStat";
import { useCachedStat } from "@/hooks/useCachedStat";
import StatCard from "@/components/StatCard";

type HousingBurdenData = {
  countyName: string;
  percent: string | null;
};

const toStringOrNull = (value: unknown): string | null => {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") return value;
  if (typeof value === "number" && Number.isFinite(value)) return value.toString();
  return null;
};

const parseHousingBurden = (json: unknown): HousingBurdenData => {
  if (!json || typeof json !== "object") {
    throw new Error("Housing burden payload malformed");
  }
  const payload = json as { countyName?: unknown; percent?: unknown };
  return {
    countyName: typeof payload.countyName === "string" && payload.countyName ? payload.countyName : "County",
    percent: toStringOrNull(payload.percent),
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
      const url = new URL("/api/stats/housing-burden", window.location.origin);
      url.searchParams.set("stateFips", stateFips!);
      url.searchParams.set("countyFips", countyFips!);
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
