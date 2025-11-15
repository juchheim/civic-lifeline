"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import type { LocationSelection } from "@/types/location";

export interface BenefitsLocation {
  displayLabel: string;
  latitude: number;
  longitude: number;
  countyName?: string | null;
  countyFips?: string | null;
  stateCode?: string | null;
  stateName?: string | null;
  zip?: string | null;
}

interface BenefitsLocationContextValue {
  location: BenefitsLocation | null;
  setLocationFromResolved: (selection: LocationSelection) => void;
  clearLocation: () => void;
}

const BenefitsLocationContext = createContext<BenefitsLocationContextValue | undefined>(undefined);

function mapSelectionToBenefitsLocation(selection: LocationSelection): BenefitsLocation {
  return {
    displayLabel: selection.label,
    latitude: selection.lat,
    longitude: selection.lon,
    countyName: selection.county ?? null,
    countyFips: null,
    stateCode: selection.stateCode ? selection.stateCode.toUpperCase() : selection.state ?? null,
    stateName: selection.state ?? null,
    zip: selection.postalCode ?? null,
  };
}

export function BenefitsLocationProvider({ children }: { children: ReactNode }) {
  const [location, setLocation] = useState<BenefitsLocation | null>(null);

  const setLocationFromResolved = useCallback((selection: LocationSelection) => {
    setLocation(mapSelectionToBenefitsLocation(selection));
  }, []);

  const clearLocation = useCallback(() => {
    setLocation(null);
  }, []);

  const value = useMemo(
    () => ({
      location,
      setLocationFromResolved,
      clearLocation,
    }),
    [location, setLocationFromResolved, clearLocation],
  );

  return <BenefitsLocationContext.Provider value={value}>{children}</BenefitsLocationContext.Provider>;
}

export function useBenefitsLocation() {
  const context = useContext(BenefitsLocationContext);
  if (!context) {
    throw new Error("useBenefitsLocation must be used within a BenefitsLocationProvider");
  }
  return context;
}

export { mapSelectionToBenefitsLocation };
