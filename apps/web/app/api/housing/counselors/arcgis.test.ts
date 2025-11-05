import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchArcgisCounselors } from "./arcgis";

vi.mock("node:crypto", async () => {
  const actual = await vi.importActual<typeof import("node:crypto")>("node:crypto");
  return {
    ...actual,
    randomUUID: () => "mock-uuid",
  };
});

describe("fetchArcgisCounselors", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("parses counselor features", async () => {
    const payload = {
      features: [
        {
          attributes: {
            AGCID: 123,
            NME: "Example Agency",
            ADR1: "123 Main St",
            CITY: "Jackson",
            STATECD: "MS",
            ZIPCD: "39201",
            PHONE1: "601-555-0000",
            WEBURL: "example.org",
            SERVICES: "FBC,PPC",
            LANGUAGES: "ENG,SPA",
            COUNSLG_METHOD: "Face to Face Counseling,Phone Counseling",
            AGC_ADDR_LATITUDE: 32.3,
            AGC_ADDR_LONGITUDE: -90.2,
          },
        },
      ],
    };
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify(payload), { status: 200, headers: { "content-type": "application/json" } }) as Response
    );

    const items = await fetchArcgisCounselors({ lat: 32.2, lon: -90.1, radiusMiles: 100 });
    expect(items.length).toBe(1);
    expect(items[0].name).toBe("Example Agency");
    expect(items[0].services).toContain("Financial management/budget counseling");
    expect(items[0].languages).toEqual(["English", "Spanish"]);
    expect(items[0].website).toBe("https://example.org");
  });

  it("returns empty array on no results", async () => {
    const payload = { features: [] };
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify(payload), { status: 200, headers: { "content-type": "application/json" } }) as Response
    );
    const items = await fetchArcgisCounselors({ lat: 32.2, lon: -90.1, radiusMiles: 50 });
    expect(items).toEqual([]);
  });
});
