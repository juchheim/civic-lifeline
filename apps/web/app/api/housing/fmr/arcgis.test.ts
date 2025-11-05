import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchArcgisFmrByFips } from "./arcgis";

describe("fetchArcgisFmrByFips", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("parses ArcGIS payload", async () => {
    const payload = {
      features: [
        {
          attributes: {
            FMR_CODE: "NCNTY28083N28083",
            FMR_AREANAME: "Leflore County, MS",
            FMR_0BDR: 600,
            FMR_1BDR: 650,
            FMR_2BDR: 900,
            FMR_3BDR: 1100,
            FMR_4BDR: 1250,
          },
        },
      ],
    };
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify(payload), { status: 200, headers: { "content-type": "application/json" } }) as Response
    );

    const result = await fetchArcgisFmrByFips("28083");
    expect(result).not.toBeNull();
    expect(result?.areaName).toBe("Leflore County, MS");
    expect(result?.br2).toBe(900);
  });

  it("returns null when nothing matches", async () => {
    const payload = { features: [] };
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify(payload), { status: 200, headers: { "content-type": "application/json" } }) as Response
    );

    const result = await fetchArcgisFmrByFips("99999");
    expect(result).toBeNull();
  });

  it("throws on HTTP errors", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response("ouch", { status: 500 }) as Response);
    await expect(fetchArcgisFmrByFips("28083")).rejects.toThrow("ArcGIS HTTP 500");
  });
});
