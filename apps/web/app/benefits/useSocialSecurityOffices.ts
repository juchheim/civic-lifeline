"use client";

import { useQuery } from "@tanstack/react-query";
import { zSocialSecurityOfficesResponse, type SocialSecurityFieldOffice, type SocialSecurityOfficesResponse } from "@cl/types";
import { resolveStateCode } from "@/lib/location/stateCodes";
import type { BenefitsLocation } from "./useBenefitsLocation";

async function requestSocialSecurityOffices(location: BenefitsLocation): Promise<SocialSecurityOfficesResponse> {
  const res = await fetch("/api/benefits/social-security-offices", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({
      latitude: location.latitude,
      longitude: location.longitude,
      stateCode: location.stateCode ?? "",
      displayLabel: location.displayLabel,
      countyName: location.countyName ?? null,
      countyFips: location.countyFips ?? null,
      zip: location.zip ?? null,
    }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = (json as any)?.error?.message ?? "We could not load local Social Security offices.";
    throw new Error(message);
  }
  return zSocialSecurityOfficesResponse.parse(json);
}

export interface UseSocialSecurityOfficesResult {
  offices: SocialSecurityFieldOffice[] | undefined;
  meta: SocialSecurityOfficesResponse["meta"] | undefined;
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  errorMessage?: string;
  refetch: () => void;
}

export function useSocialSecurityOffices(location: BenefitsLocation | null): UseSocialSecurityOfficesResult {
  const normalizedStateCode = resolveStateCode(location?.stateCode);
  const hasValidLocation = Boolean(location?.latitude && location?.longitude && normalizedStateCode);

  const query = useQuery({
    queryKey: ["benefits", "social-security-offices", location?.latitude ?? null, location?.longitude ?? null, normalizedStateCode ?? null],
    queryFn: () =>
      requestSocialSecurityOffices({
        ...location!,
        stateCode: normalizedStateCode!,
      }),
    enabled: hasValidLocation,
    staleTime: 1000 * 60 * 10,
  });

  return {
    offices: query.data?.offices,
    meta: query.data?.meta,
    isLoading: query.isPending,
    isFetching: query.isFetching,
    isError: query.isError,
    errorMessage: query.error instanceof Error ? query.error.message : undefined,
    refetch: () => {
      void query.refetch();
    },
  };
}
