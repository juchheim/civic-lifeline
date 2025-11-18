import type { LocationSelection } from "@/types/location";

interface ReverseGeocodeResponse {
  lat: number;
  lon: number;
  name?: string;
  address?: {
    postalCode?: string;
    county?: string;
    state?: string;
    stateCode?: string;
  };
}

export async function reverseGeocodeLocation(latitude: number, longitude: number): Promise<LocationSelection> {
  const search = new URLSearchParams();
  search.set("lat", latitude.toString());
  search.set("lon", longitude.toString());

  const res = await fetch(`/api/geocode/reverse?${search.toString()}`, {
    headers: { accept: "application/json" },
  });

  const json = (await res.json().catch(() => ({}))) as ReverseGeocodeResponse & { error?: string };

  if (!res.ok) {
    const message = typeof json?.error === "string" ? json.error : "We couldn't resolve your current location.";
    throw new Error(message);
  }

  if (typeof json.lat !== "number" || Number.isNaN(json.lat) || typeof json.lon !== "number" || Number.isNaN(json.lon)) {
    throw new Error("We couldn't resolve your current location.");
  }

  const label = typeof json.name === "string" ? json.name : `${json.lat.toFixed(4)}, ${json.lon.toFixed(4)}`;

  return {
    label,
    lat: json.lat,
    lon: json.lon,
    postalCode: json.address?.postalCode,
    county: json.address?.county,
    state: json.address?.state,
    stateCode: json.address?.stateCode,
  };
}

