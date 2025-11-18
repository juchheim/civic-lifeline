import type { LocationSelection } from "@/types/location";
import { resolveStateCode } from "./stateCodes";
import type { StoredLocation } from "./locationStorage";

export function mapSelectionToStoredLocation(selection: LocationSelection): StoredLocation {
  const normalizedStateCode = resolveStateCode(selection.stateCode) ?? resolveStateCode(selection.state);
  return {
    displayLabel: selection.label,
    latitude: selection.lat,
    longitude: selection.lon,
    countyName: selection.county ?? null,
    countyFips: null,
    stateCode: normalizedStateCode ?? null,
    stateName: selection.state ?? null,
    zip: selection.postalCode ?? null,
  };
}

export function mapStoredLocationToSelection(stored: StoredLocation): LocationSelection {
  return {
    label: stored.displayLabel,
    lat: stored.latitude,
    lon: stored.longitude,
    county: stored.countyName ?? undefined,
    state: stored.stateName ?? undefined,
    stateCode: stored.stateCode ?? undefined,
    postalCode: stored.zip ?? undefined,
  };
}

