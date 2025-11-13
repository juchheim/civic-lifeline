import { NextResponse } from "next/server";

const CENSUS_BASE_URL = "https://api.census.gov/data";
const DEFAULT_REVALIDATE_SECONDS = 60 * 60 * 6; // 6 hours

export class CensusApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly details?: string
  ) {
    super(message);
    this.name = "CensusApiError";
  }
}

type FetchOptions = {
  revalidate?: number;
  signal?: AbortSignal;
};

export async function fetchCensusDataset(path: string, params: Record<string, string>, options: FetchOptions = {}) {
  const url = new URL(`${CENSUS_BASE_URL}/${path}`);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  try {
    const response = await fetch(url.toString(), {
      headers: { accept: "application/json" },
      signal: options.signal,
      next: {
        revalidate: options.revalidate ?? DEFAULT_REVALIDATE_SECONDS,
      },
    });

    if (!response.ok) {
      const body = await response.text().catch(() => undefined);
      throw new CensusApiError("Census API request failed", response.status, body);
    }

    const json = await response.json();
    if (!Array.isArray(json) || json.length < 2) {
      throw new CensusApiError("Census API returned unexpected payload", 502, JSON.stringify(json));
    }

    return json;
  } catch (error) {
    if (error instanceof CensusApiError) throw error;
    if (error instanceof Error && error.name === "AbortError") {
      throw new CensusApiError("Census API request aborted", 499);
    }
    throw new CensusApiError(
      error instanceof Error ? error.message : "Unknown Census API error",
      500
    );
  }
}

export function invalidParamResponse(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export function censusErrorResponse(error: CensusApiError, context: string) {
  const status = error.status === 429 ? 503 : error.status >= 400 ? error.status : 502;
  console.error(`[Census:${context}]`, error.status, error.message, error.details ?? "");
  return NextResponse.json(
    {
      error: "Census data temporarily unavailable.",
      status: error.status,
      details: error.details ? truncate(error.details, 300) : undefined,
    },
    {
      status,
      headers: {
        "Cache-Control": "public, max-age=0, s-maxage=60",
      },
    }
  );
}

function truncate(value: string, maxLength: number) {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength)}…`;
}

