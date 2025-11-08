import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { County, State } from "@cl/types";
import { __utilitiesTestHooks } from "@/server/services/utilities";
import { GET as getCosts } from "./costs/route";
import { GET as getWaterProviders } from "./providers/water/route";
import { GET as getElectricProviders } from "./providers/electric/route";
import { GET as getGasProviders } from "./providers/gas/route";

vi.mock("../housing/_shared/redis", () => ({ getRedis: () => null }));

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
  const matches = (doc: Record<string, unknown>, query: Record<string, unknown> = {}) => {
    return Object.entries(query).every(([key, value]) => {
      if (value === undefined) return true;
      return doc[key] === value;
    });
  };
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
            if (cmp !== 0) {
              return direction === -1 ? -cmp : cmp;
            }
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
      _id: "MS67890:28163",
      pwsId: "MS67890",
      systemName: "Second System",
      countyFips: "28163",
      countyName: "Yazoo County",
      stateCode: "MS",
      stateFips: "28",
      populationServed: 800,
    },
  );
}

describe("utilities api routes", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    __utilitiesTestHooks.clearCaches();
    seedMockData();
  });

  it("returns utilities costs for a county fips", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");
    const electricRow = [
      ["NAME", "B25132_001E", "B25132_005E", "B25132_006E", "B25132_007E", "B25132_008E", "B25132_009E", "state", "county"],
      ["Yazoo County, Mississippi", "100", "10", "20", "30", "20", "20", "28", "163"],
    ];
    const gasRow = [
      ["NAME", "B25133_001E", "B25133_005E", "B25133_006E", "B25133_007E", "B25133_008E", "B25133_009E", "state", "county"],
      ["Yazoo County, Mississippi", "80", "15", "15", "20", "15", "15", "28", "163"],
    ];
    const waterRow = [
      ["NAME", "B25134_001E", "B25134_003E", "B25134_004E", "B25134_005E", "B25134_006E", "B25134_007E", "state", "county"],
      ["Yazoo County, Mississippi", "60", "10", "10", "20", "10", "10", "28", "163"],
    ];
    fetchMock.mockResolvedValueOnce(mockJsonResponse(electricRow));
    fetchMock.mockResolvedValueOnce(mockJsonResponse(gasRow));
    fetchMock.mockResolvedValueOnce(mockJsonResponse(waterRow));

    const request = new NextRequest("http://localhost/api/utilities/costs?state=MS&county=28163");
    const response = await getCosts(request);
    expect(response.status).toBe(200);
    const body = (await response.json()) as any;
    expect(body.area).toBeTruthy();
    expect(body.electric?.estTypicalMonthly).toBe(125);
    expect(body.gas?.total).toBe(80);
    expect(body.waterSewer?.estTypicalMonthly).toBeCloseTo(500 / 12, 5);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("returns water providers for a county", async () => {
    const request = new NextRequest("http://localhost/api/utilities/providers/water?state=MS&county=28163");
    const response = await getWaterProviders(request);
    expect(response.status).toBe(200);
    const body = (await response.json()) as any;
    expect(body.items).toHaveLength(2);
    expect(body.summary.total).toBe(2);
    expect(body.coverage?.countyFips).toBe("28163");
    expect(body.notes).toContain("SDWIS");
  });

  it("returns electric providers for a county", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");
    fetchMock.mockResolvedValueOnce(
      mockJsonResponse({
        features: [{ attributes: { GEOID: "28163" }, geometry: { rings: [] } }],
      }),
    );
    fetchMock.mockResolvedValueOnce(
      mockJsonResponse({
        features: [
          { attributes: { NAME: "Yazoo Electric", STATE: "MS", TELEPHONE: "555-1111", WEBSITE: "https://example.com" } },
        ],
        exceededTransferLimit: false,
      }),
    );
    const request = new NextRequest("http://localhost/api/utilities/providers/electric?state=MS&county=28163");
    const response = await getElectricProviders(request);
    expect(response.status).toBe(200);
    const body = (await response.json()) as any;
    expect(body.items).toHaveLength(1);
    expect(body.items[0].name).toBe("Yazoo Electric");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("returns gas providers for a county", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      mockJsonResponse({
        features: [{ attributes: { name: "Yazoo Gas", state: "MS", telephone: "555-2222" } }],
      }),
    );
    const request = new NextRequest("http://localhost/api/utilities/providers/gas?state=MS&county=28163");
    const response = await getGasProviders(request);
    expect(response.status).toBe(200);
    const body = (await response.json()) as any;
    expect(body.items).toHaveLength(1);
    expect(body.items[0].name).toBe("Yazoo Gas");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
