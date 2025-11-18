import { NextRequest } from "next/server";

export const revalidate = 0;

const USER_AGENT = "CivicLifeline/1.0 (contact@civiclifeline.org)";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const latParam = searchParams.get("lat");
  const lonParam = searchParams.get("lon");

  const lat = latParam ? Number.parseFloat(latParam) : Number.NaN;
  const lon = lonParam ? Number.parseFloat(lonParam) : Number.NaN;

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return Response.json({ error: "Missing or invalid coordinates." }, { status: 400 });
  }

  const params = new URLSearchParams({
    lat: lat.toString(),
    lon: lon.toString(),
    format: "jsonv2",
    addressdetails: "1",
    zoom: "13",
  });

  const nominatimUrl = `https://nominatim.openstreetmap.org/reverse?${params.toString()}`;

  try {
    const res = await fetch(nominatimUrl, {
      headers: {
        accept: "application/json",
        "user-agent": USER_AGENT,
      },
      cache: "no-store",
    });

    if (!res.ok) {
      return Response.json({ error: "Reverse geocoding service returned an error." }, { status: 502 });
    }

    const payload: {
      lat?: string;
      lon?: string;
      display_name?: string;
      address?: Record<string, unknown>;
    } = await res.json();

    if (!payload || typeof payload !== "object") {
      return Response.json({ error: "Reverse geocoding returned no data." }, { status: 502 });
    }

    const responseLat = payload.lat ? Number.parseFloat(payload.lat) : Number.NaN;
    const responseLon = payload.lon ? Number.parseFloat(payload.lon) : Number.NaN;

    if (!Number.isFinite(responseLat) || !Number.isFinite(responseLon)) {
      return Response.json({ error: "Reverse geocoding returned invalid coordinates." }, { status: 502 });
    }

    const address = payload.address && typeof payload.address === "object" ? payload.address : {};
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
      lat: responseLat,
      lon: responseLon,
      name: payload.display_name ?? `${responseLat.toFixed(4)}, ${responseLon.toFixed(4)}`,
      address: {
        postalCode,
        city,
        county,
        state,
        stateCode,
      },
    });
  } catch (error) {
    console.error("reverse geocode lookup failed", error);
    return Response.json({ error: "Reverse geocoding service unavailable." }, { status: 504 });
  }
}

