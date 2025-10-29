import { describe, it, expect } from "vitest";
import { toSeriesId, normalizeBlsTimeseries } from "./lib";

describe("unemployment lib", () => {
  it("creates series id from county fips", () => {
    expect(toSeriesId("28163")).toBe("LAUCN281630000000003");
    expect(toSeriesId("01001")).toBe("LAUCN010010000000003");
  });

  it("normalizes BLS response to points", () => {
    const json = {
      status: "REQUEST_SUCCEEDED",
      Results: {
        series: [
          {
            seriesID: "LAUCN281630000000003",
            data: [
              { year: "2025", period: "M02", periodName: "February", value: "9.1" },
              { year: "2025", period: "M01", periodName: "January", value: "8.9" },
              { year: "2024", period: "M13", periodName: "Annual", value: "8.2" },
              { year: "2024", period: "M12", periodName: "December", value: "8.7" }
            ],
          },
        ],
      },
    };
    const out = normalizeBlsTimeseries(json, "LAUCN281630000000003");
    expect(out.seriesId).toBe("LAUCN281630000000003");
    expect(out.adjusted).toBe(false);
    expect(out.points).toEqual([
      { date: "2024-12", value: 8.7 },
      { date: "2025-01", value: 8.9 },
      { date: "2025-02", value: 9.1 },
    ]);
  });
});
