import { NextRequest } from "next/server";

export const revalidate = 0;

const USER_AGENT = "CivicLifeline/1.0 (contact@civiclifeline.org)";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim();

  if (!query) {
    return Response.json({ error: "Missing location query." }, { status: 400 });
  }

  const params = new URLSearchParams({
    q: query,
    format: "jsonv2",
    addressdetails: "1",
    limit: "1",
    countrycodes: "us",
  });

  const nominatimUrl = `https://nominatim.openstreetmap.org/search?${params.toString()}`;

  try {
    const res = await fetch(nominatimUrl, {
      headers: {
        accept: "application/json",
        "user-agent": USER_AGENT,
      },
      cache: "no-store",
    });

    if (!res.ok) {
      return Response.json({ error: "Geocoding service returned an error." }, { status: 502 });
    }

    const results: Array<{
      lat: string;
      lon: string;
      display_name?: string;
      address?: Record<string, unknown>;
    }> = await res.json();
    const first = results[0];

    if (!first) {
      return Response.json({ error: "No matching locations found." }, { status: 404 });
    }

    const lat = Number.parseFloat(first.lat);
    const lon = Number.parseFloat(first.lon);

    if (Number.isNaN(lat) || Number.isNaN(lon)) {
      return Response.json({ error: "Geocoding returned invalid coordinates." }, { status: 502 });
    }

    const address = first.address && typeof first.address === "object" ? first.address : {};
    const postalCode = typeof address?.postcode === "string" ? address.postcode : undefined;
    const city =
      typeof address?.city === "string"
        ? address.city
        : typeof address?.town === "string"
          ? address.town
          : typeof address?.village === "string"
            ? address.village
            : typeof address?.hamlet === "string"
              ? address.hamlet
              : typeof address?.municipality === "string"
                ? address.municipality
                : undefined;
    const county =
      typeof address?.county === "string"
        ? address.county
        : typeof address?.county_name === "string"
          ? address.county_name
          : typeof address?.region === "string"
            ? address.region
            : undefined;
    const state =
      typeof address?.state === "string"
        ? address.state
        : typeof address?.state_district === "string"
          ? address.state_district
          : undefined;
    const stateCode = typeof address?.state_code === "string" ? address.state_code : undefined;

    return Response.json({
      lat,
      lon,
      name: first.display_name ?? query,
      address: {
        postalCode,
        city,
        county,
        state,
        stateCode,
      },
    });
  } catch (error) {
    console.error("geocode lookup failed", error);
    return Response.json({ error: "Geocoding service unavailable." }, { status: 504 });
  }
}
