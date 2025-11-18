"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { clearStoredLocation, loadStoredLocation, saveStoredLocation, type StoredLocation } from "@/lib/location/locationStorage";
import { mapSelectionToStoredLocation } from "@/lib/location/locationMappers";
import type { LocationSelection } from "@/types/location";

export type SharedLocation = StoredLocation;

interface SharedLocationContextValue {
  location: SharedLocation | null;
  setLocationFromSelection: (selection: LocationSelection) => void;
  clearLocation: () => void;
}

const SharedLocationContext = createContext<SharedLocationContextValue | undefined>(undefined);

export function SharedLocationProvider({ children }: { children: ReactNode }) {
  const [location, setLocation] = useState<SharedLocation | null>(null);

  useEffect(() => {
    const stored = loadStoredLocation();
    if (stored) {
      setLocation(stored);
    }
  }, []);

  const setLocationFromSelection = useCallback((selection: LocationSelection) => {
    const mapped = mapSelectionToStoredLocation(selection);
    setLocation(mapped);
    saveStoredLocation(mapped);
  }, []);

  const clearLocation = useCallback(() => {
    setLocation(null);
    clearStoredLocation();
  }, []);

  const value = useMemo(
    () => ({
      location,
      setLocationFromSelection,
      clearLocation,
    }),
    [location, setLocationFromSelection, clearLocation],
  );

  return <SharedLocationContext.Provider value={value}>{children}</SharedLocationContext.Provider>;
}

export function useSharedLocation() {
  const context = useContext(SharedLocationContext);
  if (!context) {
    throw new Error("useSharedLocation must be used within a SharedLocationProvider");
  }
  return context;
}

