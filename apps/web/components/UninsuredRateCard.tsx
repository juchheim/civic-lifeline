"use client";

import { useMemo } from "react";
import { fetchStat } from "@/utils/fetchStat";
import { useCachedStat } from "@/hooks/useCachedStat";
import StatCard from "@/components/StatCard";

type UninsuredData = {
  countyName: string;
  uninsuredEstimate: string | null;
  uninsuredPct: string | null;
};

const parseUninsured = (json: unknown): UninsuredData => {
  if (!Array.isArray(json) || json.length < 2) {
    throw new Error("SAHIE returned no data");
  }
  const row = json[1] as [string, string | null, string | null];
  return {
    countyName: row[0] ?? "County",
    uninsuredEstimate: row[1] ?? null,
    uninsuredPct: row[2] ?? null,
  };
};

const formatNumber = (value: string | null) => {
  if (!value) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(parsed);
};

const formatPercent = (value: string | null) => {
  if (!value) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return `${parsed.toFixed(1)}%`;
};

export default function UninsuredRateCard({ stateFips, countyFips }: { stateFips?: string; countyFips?: string }) {
  const cacheKey = stateFips && countyFips ? `uninsuredRate-${stateFips}-${countyFips}` : null;

  const { data, loading, error, loaded } = useCachedStat<UninsuredData>(
    cacheKey,
    async () => {
      const countyCode = countyFips!.slice(-3);
      const url = new URL("https://api.census.gov/data/timeseries/healthins/sahie");
      url.searchParams.set("get", "NAME,NUI_PT,PCTUI_PT");
      url.searchParams.set("for", `county:${countyCode}`);
      url.searchParams.set("in", `state:${stateFips}`);
      url.searchParams.set("time", "2022");
      return fetchStat(url.toString(), parseUninsured);
    },
    [stateFips, countyFips]
  );

  const estimate = useMemo(() => formatNumber(data?.uninsuredEstimate ?? null), [data?.uninsuredEstimate]);
  const pct = useMemo(() => formatPercent(data?.uninsuredPct ?? null), [data?.uninsuredPct]);
  const canFetch = Boolean(cacheKey);
  const showSpinner = canFetch && (!loaded || loading);
  const hasError = Boolean(error);
  const shouldShowError = canFetch && !showSpinner && (hasError || !estimate || !pct);

  return (
    <StatCard
      label="SAHIE 2022"
      region={data?.countyName ?? "Uninsured Residents"}
      title="Insurance Gap"
      description="Share of residents without health coverage"
      canFetch={canFetch}
      isLoading={showSpinner}
      hasError={shouldShowError}
      emptyMessage="Select a county to load insurance data."
    >
      <p className="text-base font-semibold text-gray-900">
        Uninsured Residents: {pct} ({estimate} people)
      </p>
    </StatCard>
  );
}
