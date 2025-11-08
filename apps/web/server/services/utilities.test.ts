import { beforeEach, describe, expect, it, vi } from "vitest";
import type { County, State } from "@cl/types";

const { mockStates, mockCounties, mockWaterSystems } = vi.hoisted(() => ({
  mockStates: [] as Array<State & { _id: string }>,
  mockCounties: [] as Array<County & { _id: string }>,
  mockWaterSystems: [] as Array<{
    _id: string;
    pwsId: string;
    systemName: string;
    countyFips: string;
    countyName: string;
    stateCode: string;
    stateFips: string;
    populationServed?: number;
  }>,
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
  const matches = (doc: Record<string, unknown>, query: Record<string, unknown> = {}) =>
    Object.entries(query).every(([key, value]) => {
      if (value === undefined) return true;
      return doc[key] === value;
    });
  const buildCursor = (docs: Array<Record<string, unknown>>) => {
    let working = [...docs];
    return {
      sort(sortSpec: Record<string, 1 | -1>) {
        const entries = Object.entries(sortSpec);
        working = working.sort((a, b) => {
          for (const [field, direction] of entries) {
            const av = (a[field] as number | string | undefined);
            const bv = (b[field] as number | string | undefined);
            if (av === bv) continue;
            if (typeof av === "number" && typeof bv === "number") {
              return direction === -1 ? bv - av : av - bv;
            }
            const aStr = av === undefined ? "" : String(av);
            const bStr = bv === undefined ? "" : String(bv);
            const cmp = aStr.localeCompare(bStr);
            if (cmp !== 0) return direction === -1 ? -cmp : cmp;
          }
          return 0;
        });
        return this;
      },
      limit(limit: number) {
        working = working.slice(0, limit);
        return this;
      },
      async toArray() {
        return working;
      },
    };
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
    getPublicWaterSystemsCollection: async () => ({
      find: (query?: Record<string, unknown>, options?: { projection?: Record<string, number> }) => {
        const rows = mockWaterSystems.filter((doc) => matches(doc, query));
        const docs = rows.map((doc) => project(doc, options?.projection));
        return buildCursor(docs);
      },
      countDocuments: async (query?: Record<string, unknown>) =>
        mockWaterSystems.filter((doc) => matches(doc, query)).length,
      createIndex: async () => {},
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
  mockWaterSystems.length = 0;
  mockWaterSystems.push(
    {
      _id: "MS12345:28163",
      pwsId: "MS12345",
      systemName: "Yazoo Water",
      countyFips: "28163",
      countyName: "Yazoo County",
      stateCode: "MS",
      stateFips: "28",
      populationServed: 1200,
    },
    {
      _id: "MS00000:28001",
      pwsId: "MS00000",
      systemName: "Adams System",
      countyFips: "28001",
      countyName: "Adams County",
      stateCode: "MS",
      stateFips: "28",
      populationServed: 500,
    },
  );
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

  it("loads water systems from Mongo by county fips", async () => {
    const results = await getPublicWaterSystemsByCounty({ countyFips: "28163", stateCode: "MS" });
    expect(results.scope).toBe("county");
    expect(results.total).toBe(1);
    expect(results.items[0]).toMatchObject({ systemName: "Yazoo Water", pwsId: "MS12345" });
  });

  it("falls back to state scope when county has no entries", async () => {
    const results = await getPublicWaterSystemsByCounty({ countyFips: "99999", stateCode: "MS", limit: 5 });
    expect(results.scope).toBe("state");
    expect(results.total).toBe(2);
    expect(results.items[0].systemName).toBe("Yazoo Water");
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
