import { createLogger } from "@/lib/logger";

const log = createLogger("api/housing/fmr/arcgis");

export interface ArcgisFmrRecord {
  areaName: string;
  br0: number;
  br1: number;
  br2: number;
  br3: number;
  br4: number;
  rawCode: string;
}

const DEFAULT_FEATURESERVER_URL =
  "https://services.arcgis.com/VTyQ9soqVukalItT/ArcGIS/rest/services/Fair_Market_Rents/FeatureServer/0/query";

/**
 * Queries HUD's public ArcGIS FeatureServer for FY FMR values while the HUD API is unavailable.
 * See docs/hud-fmr-static.md for setup details.
 */
export async function fetchArcgisFmrByFips(fips: string, abortSignal?: AbortSignal): Promise<ArcgisFmrRecord | null> {
  const trimmed = (fips ?? "").trim();
  if (!/^\d{5}$/.test(trimmed)) {
    throw new Error("Invalid county FIPS for ArcGIS lookup.");
  }

  const baseUrl = process.env.HUD_FMR_ARCGIS_URL?.trim() || DEFAULT_FEATURESERVER_URL;
  const params = new URLSearchParams({
    f: "json",
    where: `FMR_CODE LIKE '%${trimmed}'`,
    outFields: "FMR_CODE,FMR_AREANAME,FMR_0BDR,FMR_1BDR,FMR_2BDR,FMR_3BDR,FMR_4BDR",
    returnGeometry: "false",
    resultRecordCount: "1",
    cacheHint: "true",
  });

  const url = `${baseUrl}${baseUrl.includes("?") ? "&" : "?"}${params.toString()}`;
  const controller = new AbortController();
  const signal = abortSignal ?? controller.signal;
  let timeout: NodeJS.Timeout | undefined;

  if (!abortSignal) {
    timeout = setTimeout(() => controller.abort(), 5000);
  }

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: { accept: "application/json" },
      signal,
    });

    if (!res.ok) {
      throw new Error(`ArcGIS HTTP ${res.status}`);
    }

    const json = await res.json();
    if (json.error) {
      throw new Error(json.error.message || "ArcGIS error");
    }

    const features = Array.isArray(json.features) ? json.features : [];
    if (features.length === 0) {
      log.info("arcgis no match", { fips });
      return null;
    }

    const attrs = features[0]?.attributes ?? {};
    const record: ArcgisFmrRecord = {
      rawCode: String(attrs.FMR_CODE ?? ""),
      areaName: String(attrs.FMR_AREANAME ?? "").trim(),
      br0: Number(attrs.FMR_0BDR ?? 0),
      br1: Number(attrs.FMR_1BDR ?? 0),
      br2: Number(attrs.FMR_2BDR ?? 0),
      br3: Number(attrs.FMR_3BDR ?? 0),
      br4: Number(attrs.FMR_4BDR ?? 0),
    };

    return record;
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}
