"use client";

import { useMemo } from "react";
import { fetchStat } from "@/utils/fetchStat";
import { useCachedStat } from "@/hooks/useCachedStat";
import StatCard from "@/components/StatCard";

type MinimumWageResponse = {
  stateName: string;
  stateWage: number | null;
  federalWage: number;
  effectiveDate: string;
  usesFederal: boolean;
};

const formatCurrency = (value: number | null) => {
  if (value === null || !Number.isFinite(value)) return null;
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(
    value
  );
};

export default function MinimumWageCard({ stateName }: { stateName?: string }) {
  const cacheKey = stateName ? `minimumWage-${stateName}` : null;

  const { data, loading, error, loaded } = useCachedStat<MinimumWageResponse>(
    cacheKey,
    async () => {
      const url = new URL("/api/minimum-wage", window.location.origin);
      url.searchParams.set("stateName", stateName!);
      return fetchStat(url.toString());
    },
    [stateName]
  );

  const formattedState = useMemo(() => formatCurrency(data?.stateWage ?? null), [data?.stateWage]);
  const formattedFederal = useMemo(() => formatCurrency(data?.federalWage ?? null), [data?.federalWage]);
  const usesFederal = data?.usesFederal ?? false;
  const canFetch = Boolean(cacheKey);
  const showSpinner = canFetch && (!loaded || loading);
  const hasError = Boolean(error);
  const shouldShowError = canFetch && !showSpinner && (hasError || !formattedFederal);

  return (
    <StatCard
      label="US DOL Open Data"
      region={stateName ?? "Minimum Wage"}
      title="Minimum Wage Rates"
      canFetch={canFetch}
      isLoading={showSpinner}
      hasError={shouldShowError}
      errorMessage={error}
      emptyMessage="Select a state to load minimum wage data."
    >
      {formattedFederal && (
        <div className="space-y-2 text-base font-semibold text-gray-900">
          <p>
            State Minimum Wage:{" "}
            {usesFederal ? "Uses Federal Minimum Wage" : `${formattedState} / hour`}
          </p>
          <p>Federal Minimum Wage: {formattedFederal} / hour</p>
          <p className="text-xs font-normal text-gray-500">
            Effective {data?.effectiveDate ?? "latest published date"}
          </p>
        </div>
      )}
    </StatCard>
  );
}
