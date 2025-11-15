import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

function mockJsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

describe("state social security route", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns stats for a valid state", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      mockJsonResponse({
        features: [
          {
            attributes: {
              State_Territory: "Mississippi",
              ORDER1_ABB: "MS",
              Total_Population: 2959.5,
              Total_Population_Receiving_Bene: 620.2,
              Population65_Older: 400.1,
              Population65_Older_Receiving_Be: 320.3,
            },
          },
        ],
      }),
    );

    const request = new NextRequest("http://localhost/api/benefits/state-social-security?stateCode=ms");
    const response = await GET(request);
    expect(response.status).toBe(200);
    const body = (await response.json()) as any;
    expect(body.stats.stateCode).toBe("MS");
    expect(body.stats.stateName).toBe("Mississippi");
    expect(body.stats.totalPopulation).toBe(2_959_500);
    expect(body.stats.totalReceivingBenefits).toBe(620_200);
    expect(body.stats.shareReceivingBenefits).toBeCloseTo(620.2 / 2959.5, 6);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("returns 404 when ArcGIS has no records", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(mockJsonResponse({ features: [] }));
    const request = new NextRequest("http://localhost/api/benefits/state-social-security?stateCode=MS");
    const response = await GET(request);
    expect(response.status).toBe(404);
    const body = (await response.json()) as any;
    expect(body.error?.code).toBe("STATE_NOT_FOUND");
  });

  it("validates missing state code", async () => {
    const response = await GET(new NextRequest("http://localhost/api/benefits/state-social-security"));
    expect(response.status).toBe(400);
    const body = (await response.json()) as any;
    expect(body.error?.code).toBe("INVALID_STATE");
  });
});
