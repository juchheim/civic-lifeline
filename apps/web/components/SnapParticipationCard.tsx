"use client";

import { useMemo } from "react";
import { fetchStat } from "@/utils/fetchStat";
import { useCachedStat } from "@/hooks/useCachedStat";
import StatCard from "@/components/StatCard";

type SnapParticipationData = {
  pct: number;
  countyName: string;
};

const parseSnapResponse = (json: unknown): SnapParticipationData => {
  if (!json || typeof json !== "object") {
    throw new Error("SNAP response malformed");
  }
  const record = json as { countyName?: string; percent?: number };
  if (typeof record.percent !== "number") {
    throw new Error("SNAP participation data missing");
  }
  return {
    countyName: record.countyName ?? "County",
    pct: record.percent,
  };
};

const formatPercent = (value: number | null) => {
  if (value === null) return null;
  return `${value.toFixed(1)}%`;
};

type SnapParticipationCardProps = {
  countyFips?: string;
  stateFips?: string;
};

export default function SnapParticipationCard({ countyFips, stateFips }: SnapParticipationCardProps) {
  const cacheKey = countyFips && stateFips ? `snapParticipation-${stateFips}-${countyFips}` : null;

  const { data, loading, error, loaded } = useCachedStat<SnapParticipationData>(
    cacheKey,
    async () => {
      const url = new URL("/api/snap-participation", window.location.origin);
      url.searchParams.set("countyFips", countyFips!);
      return fetchStat(url.toString(), parseSnapResponse);
    },
    [stateFips, countyFips]
  );

  const formattedPct = useMemo(() => formatPercent(data ? data.pct * 100 : null), [data]);
  const hasError = Boolean(error);
  const canFetch = Boolean(cacheKey);
  const showSpinner = canFetch && (!loaded || loading);
  const shouldShowError = canFetch && !showSpinner && (hasError || !formattedPct);

  return (
    <StatCard
      label="USDA ERS"
      region={data?.countyName ?? "SNAP Participation"}
      title="SNAP Participation"
      description="Share of residents using SNAP benefits"
      canFetch={canFetch}
      isLoading={showSpinner}
      hasError={shouldShowError}
      emptyMessage="Select a county to load SNAP data."
    >
      <p className="text-3xl font-semibold text-gray-900">{formattedPct}</p>
    </StatCard>
  );
}
