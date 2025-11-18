"use client";

import type { ReactNode } from "react";
import { SharedLocationProvider, useSharedLocation, type SharedLocation } from "@/components/location/SharedLocationContext";
import { mapSelectionToStoredLocation } from "@/lib/location/locationMappers";

export type BenefitsLocation = SharedLocation;

export function BenefitsLocationProvider({ children }: { children: ReactNode }) {
  return <SharedLocationProvider>{children}</SharedLocationProvider>;
}

export function useBenefitsLocation() {
  const { location, setLocationFromSelection, clearLocation } = useSharedLocation();
  return {
    location,
    setLocationFromResolved: setLocationFromSelection,
    clearLocation,
  };
}

export const mapSelectionToBenefitsLocation = mapSelectionToStoredLocation;
