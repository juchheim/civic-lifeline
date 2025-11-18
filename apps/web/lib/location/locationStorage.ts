const STORAGE_KEY = "civiclifeline.location";

export interface StoredLocation {
  displayLabel: string;
  latitude: number;
  longitude: number;
  countyName?: string | null;
  countyFips?: string | null;
  stateCode?: string | null;
  stateName?: string | null;
  zip?: string | null;
}

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function loadStoredLocation(): StoredLocation | null {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredLocation> | null;
    if (!parsed || typeof parsed !== "object") return null;
    if (typeof parsed.displayLabel !== "string") return null;
    if (typeof parsed.latitude !== "number" || Number.isNaN(parsed.latitude)) return null;
    if (typeof parsed.longitude !== "number" || Number.isNaN(parsed.longitude)) return null;
    return {
      displayLabel: parsed.displayLabel,
      latitude: parsed.latitude,
      longitude: parsed.longitude,
      countyName: parsed.countyName ?? null,
      countyFips: parsed.countyFips ?? null,
      stateCode: parsed.stateCode ?? null,
      stateName: parsed.stateName ?? null,
      zip: parsed.zip ?? null,
    };
  } catch (error) {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore cleanup failure
    }
    return null;
  }
}

export function saveStoredLocation(location: StoredLocation): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(location));
  } catch {
    // ignore write failures (e.g., private browsing)
  }
}

export function clearStoredLocation(): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore removal failures
  }
}

