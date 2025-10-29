import { describe, it, expect } from "vitest";
import { zSnapItem, zSnapResponse, zUnemploymentResponse, zBroadbandSummaryResponse, zCounselorsResponse, zFmrResponse } from "../src/api";

const meta = {
  source: "Test Source",
  lastUpdated: "2025-10-28T11:00:00Z",
};

describe("api zod schemas", () => {
  it("parses SnapItem and SnapResponse", () => {
    const item1 = zSnapItem.parse({
      id: "1",
      name: "ACME MARKET",
      address: "123 Main St, Yazoo City, MS",
      coords: [-90.41, 32.89],
      storeType: "Supermarket",
      phone: null,
      hours: null,
    });
    expect(item1.name).toBe("ACME MARKET");

    const item2 = zSnapItem.parse({
      id: "2",
      name: "SaveMore",
      address: "456 Oak St, Yazoo City, MS",
      coords: [-90.4, 32.88],
    });

    const resp = zSnapResponse.parse({
      items: [item1, item2],
      ...meta,
    });
    expect(resp.items.length).toBe(2);
  });

  it("parses UnemploymentResponse", () => {
    const resp = zUnemploymentResponse.parse({
      seriesId: "LAUCN281630000000003",
      adjusted: false,
      points: [{ date: "2025-08", value: 8.7 }],
      ...meta,
    });
    expect(resp.points[0].date).toBe("2025-08");
  });

  it("parses BroadbandSummaryResponse", () => {
    const resp = zBroadbandSummaryResponse.parse({
      providerCount: 3,
      speed: { "25_3": true, "100_20": true, "1000_100": false },
      tech: ["Fiber", "Cable"],
      asOf: "2025-06-30",
      ...meta,
    });
    expect(resp.providerCount).toBe(3);
  });

  it("parses CounselorsResponse", () => {
    const resp = zCounselorsResponse.parse({
      items: [
        {
          id: "HUD-123",
          name: "Delta Housing Aid",
          phone: "555-1234",
          website: "https://example.org",
          services: ["Rental", "Credit"],
          languages: ["English", "Spanish"],
          coords: [-90.41, 32.89],
        },
      ],
      ...meta,
    });
    expect(resp.items[0].name).toBe("Delta Housing Aid");
  });

  it("parses FmrResponse", () => {
    const resp = zFmrResponse.parse({
      year: 2025,
      areaName: "Yazoo County, MS",
      br0: 570,
      br1: 620,
      br2: 790,
      br3: 990,
      br4: 1150,
      ...meta,
    });
    expect(resp.year).toBe(2025);
  });
});
