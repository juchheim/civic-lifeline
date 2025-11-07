import { beforeEach, describe, expect, it, vi } from "vitest";
import type { County, State } from "@cl/types";

const { mockStates, mockCounties } = vi.hoisted(() => ({
  mockStates: [] as Array<State & { _id: string }>,
  mockCounties: [] as Array<County & { _id: string }>,
}));

vi.mock("@cl/db", () => {
  const project = <T extends Record<string, unknown>>(doc: T, projection?: Record<string, number>) => {
    if (!projection) return { ...doc };
    const projected: Record<string, unknown> = {};
    Object.keys(projection).forEach((key) => {
      if (projection[key]) projected[key] = doc[key];
    });
    return projected;
  };
  return {
    getStatesCollection: async () => ({
      find: (_query: unknown, options?: { projection?: Record<string, number> }) => ({
        toArray: async () => mockStates.map((doc) => project(doc, options?.projection)),
      }),
    }),
    getCountiesCollection: async () => ({
      find: (query?: { stateCode?: string }, options?: { projection?: Record<string, number> }) => ({
        toArray: async () => {
          const rows = query?.stateCode ? mockCounties.filter((doc) => doc.stateCode === query.stateCode) : mockCounties;
          return rows.map((doc) => project(doc, options?.projection));
        },
      }),
    }),
  };
});
import {
  __utilitiesTestHooks,
  fetchCountyFIPS,
  fetchPlaceCode,
  getElectricityCosts,
  getGasLDCByCounty,
  getPublicWaterSystemsByCounty,
  getWaterSewerAnnualCosts,
} from "./utilities";

function mockJsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

function seedMockData() {
  mockStates.length = 0;
  mockStates.push({ _id: "MS", code: "MS", name: "Mississippi", fips: "28" });
  mockCounties.length = 0;
  mockCounties.push({ _id: "28163", name: "Yazoo County", fips: "28163", stateCode: "MS", stateFips: "28" });
}

describe("utilities data layer", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    __utilitiesTestHooks.clearCaches();
    seedMockData();
  });

  it("resolves county fips by county name using Mongo data", async () => {
    const result = await fetchCountyFIPS({ state: "MS", county: "Yazoo" });
    expect(result).toEqual({ stateFips: "28", countyFips: "28163" });
  });

  it("resolves county fips by city using geocoder", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      mockJsonResponse({
        result: {
          addressMatches: [
            {
              geographies: {
                Counties: [{ NAME: "Yazoo County", COUNTY: "163", STATE: "28" }],
              },
            },
          ],
        },
      }),
    );
    const result = await fetchCountyFIPS({ state: "MS", city: "Yazoo City" });
    expect(result).toEqual({ stateFips: "28", countyFips: "28163" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("fetches place code for a city via ACS", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      mockJsonResponse([
        ["NAME", "state", "place"],
        ["Yazoo City city, Mississippi", "28", "85440"],
      ]),
    );
    const result = await fetchPlaceCode({ state: "MS", city: "Yazoo City" });
    expect(result).toEqual({ stateFips: "28", place: "85440" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("computes weighted median for electricity costs", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      mockJsonResponse([
        ["NAME", "B25132_001E", "B25132_005E", "B25132_006E", "B25132_007E", "B25132_008E", "B25132_009E", "state", "county"],
        ["Yazoo County, Mississippi", "100", "10", "20", "30", "20", "20", "28", "163"],
      ]),
    );
    const distribution = await getElectricityCosts({ state: "MS", county: "28163" });
    expect(distribution.total).toBe(100);
    expect(distribution.buckets).toHaveLength(5);
    expect(distribution.estTypicalMonthly).toBe(125);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("converts annual water costs to monthly estimate", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      mockJsonResponse([
        ["NAME", "B25134_001E", "B25134_003E", "B25134_004E", "B25134_005E", "B25134_006E", "B25134_007E", "state", "county"],
        ["Yazoo County, Mississippi", "60", "10", "10", "20", "10", "10", "28", "163"],
      ]),
    );
    const distribution = await getWaterSewerAnnualCosts({ state: "MS", county: "28163" });
    expect(distribution.total).toBe(60);
    expect(distribution.estTypicalMonthly).toBeCloseTo(500 / 12, 5);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("requests water systems using 5-digit FIPS and falls back to 6-digit when empty", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(mockJsonResponse([]))
      .mockResolvedValueOnce(mockJsonResponse([{ PWS_NAME: "Test", POP_SERVED_COUNTY: "100" }]));
    const results = await getPublicWaterSystemsByCounty("28163");
    expect(results).toHaveLength(1);
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "https://data.epa.gov/efservice/SDW_COUNTY_SERVED/FIPS_COUNTY_CODE/28163/JSON",
      expect.any(Object),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "https://data.epa.gov/efservice/SDW_COUNTY_SERVED/FIPS_COUNTY_CODE/280163/JSON",
      expect.any(Object),
    );
  });

  it("queries gas utilities with both 5- and 6-digit county FIPS", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      mockJsonResponse({
        features: [{ attributes: { name: "GasCo", state: "MS" } }],
      }),
    );
    const results = await getGasLDCByCounty("28163");
    expect(results).toHaveLength(1);
    const lastCall = fetchMock.mock.calls[0][0] as string;
    const where = new URL(lastCall).searchParams.get("where");
    expect(where).toBe("countyfips IN ('28163','280163')");
  });
});
