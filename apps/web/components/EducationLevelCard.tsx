"use client";

import { useMemo } from "react";
import { fetchStat } from "@/utils/fetchStat";
import { useCachedStat } from "@/hooks/useCachedStat";
import StatCard from "@/components/StatCard";

type EducationLevelData = {
  name: string;
  totalAdults: number;
  highSchoolDiploma: number;
};

const parseEducationLevel = (json: unknown): EducationLevelData => {
  if (!json || typeof json !== "object") {
    throw new Error("Education data malformed");
  }
  const payload = json as Record<string, unknown>;
  const name = typeof payload.name === "string" ? payload.name : "";
  const totalAdults = typeof payload.totalAdults === "number" ? payload.totalAdults : Number(payload.totalAdults);
  const highSchoolDiploma =
    typeof payload.highSchoolDiploma === "number" ? payload.highSchoolDiploma : Number(payload.highSchoolDiploma);
  if (!name) {
    throw new Error("Education data missing name");
  }
  if (!Number.isFinite(totalAdults) || !Number.isFinite(highSchoolDiploma)) {
    throw new Error("Education data missing counts");
  }
  return { name, totalAdults, highSchoolDiploma };
};

const calculatePercent = (total: number, numerator: number) => {
  if (!Number.isFinite(total) || total === 0 || !Number.isFinite(numerator)) return null;
  return (numerator / total) * 100;
};

const formatPercent = (value: number | null) => {
  if (value === null) return null;
  return `${value.toFixed(1)}%`;
};

export default function EducationLevelCard({ countyFips, stateFips }: { countyFips?: string; stateFips?: string }) {
  const cacheKey = stateFips && countyFips ? `educationLevel-${stateFips}-${countyFips}` : null;

  const { data, loading, error, loaded } = useCachedStat<EducationLevelData>(
    cacheKey,
    async () => {
      const url = new URL("/api/education-level", window.location.origin);
      url.searchParams.set("stateFips", stateFips!);
      url.searchParams.set("countyFips", countyFips!);
      return fetchStat(url.toString(), parseEducationLevel);
    },
    [stateFips, countyFips]
  );

  const percent = useMemo(() => {
    if (!data) return null;
    return calculatePercent(data.totalAdults, data.highSchoolDiploma);
  }, [data]);

  const formattedPercent = useMemo(() => formatPercent(percent), [percent]);

  const canFetch = Boolean(cacheKey);
  const showSpinner = canFetch && (!loaded || loading);
  const hasError = Boolean(error);
  const shouldShowError = canFetch && !showSpinner && (hasError || !formattedPercent);

  return (
    <StatCard
      label="ACS 5-Year 2023"
      region={data?.name ?? "Education levels"}
      title="High School Completion"
      description="Adults aged 25+ with at least a high-school diploma"
      canFetch={canFetch}
      isLoading={showSpinner}
      hasError={shouldShowError}
      emptyMessage="Select a state and county to load education data."
    >
      <p className="text-2xl font-semibold text-gray-900">{formattedPercent}</p>
    </StatCard>
  );
}
