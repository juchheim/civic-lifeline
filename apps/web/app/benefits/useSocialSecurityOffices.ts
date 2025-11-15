"use client";

import { useQuery } from "@tanstack/react-query";
import { zSocialSecurityOfficesResponse, type SocialSecurityFieldOffice, type SocialSecurityOfficesResponse } from "@cl/types";
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
  const hasValidLocation = Boolean(location?.latitude && location?.longitude && location?.stateCode);

  const query = useQuery({
    queryKey: ["benefits", "social-security-offices", location?.latitude ?? null, location?.longitude ?? null],
    queryFn: () => requestSocialSecurityOffices(location!),
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
