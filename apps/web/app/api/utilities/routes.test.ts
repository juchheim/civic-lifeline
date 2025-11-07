import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { County, State } from "@cl/types";
import { __utilitiesTestHooks } from "@/server/services/utilities";
import { GET as getCosts } from "./costs/route";
import { GET as getWaterProviders } from "./providers/water/route";
import { GET as getElectricProviders } from "./providers/electric/route";
import { GET as getGasProviders } from "./providers/gas/route";

vi.mock("../housing/_shared/redis", () => ({ getRedis: () => null }));

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

function mockJsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

function seedMockData() {
  mockStates.length = 0;
  mockStates.push({ _id: "MS", code: "MS", name: "Mississippi", fips: "28" });
  mockCounties.length = 0;
  mockCounties.push({ _id: "28163", name: "Yazoo County", fips: "28163", stateCode: "MS", stateFips: "28" });
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
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      mockJsonResponse([
        { PWS_NAME: "Yazoo Water", POP_SERVED_COUNTY: "1200", PWSID: "MS12345", STATE: "28" },
        { PWS_NAME: "Second System", POP_SERVED_COUNTY: "800", STATE: "28" },
      ]),
    );
    const request = new NextRequest("http://localhost/api/utilities/providers/water?state=MS&county=28163");
    const response = await getWaterProviders(request);
    expect(response.status).toBe(200);
    const body = (await response.json()) as any;
    expect(body.items).toHaveLength(2);
    expect(body.summary.total).toBe(2);
    expect(body.coverage?.countyFips).toBe("28163");
    expect(fetchMock).toHaveBeenCalledTimes(1);
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
