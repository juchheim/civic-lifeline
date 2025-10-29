import { describe, it, expect } from "vitest";
import { transformHudToCounselors, buildHudCounselorsUrl } from "./lib";

describe("counselors lib", () => {
  it("maps HUD results to items", () => {
    const json = {
      results: [
        { agency_name: "Delta Housing Aid", PHONE: "555-1234", WEBSITE: "https://example.org", services_offered: "Rental,Credit", languages_spoken: "English,Spanish", LATITUDE: 32.889, LONGITUDE: -90.405 },
      ],
    };
    const items = transformHudToCounselors(json);
    expect(items.length).toBe(1);
    expect(items[0].name).toBe("Delta Housing Aid");
    expect(items[0].coords).toEqual([-90.405, 32.889]);
    expect(items[0].services).toEqual(["Rental", "Credit"]);
  });

  it("builds url with lat/lon/radius", () => {
    const url = buildHudCounselorsUrl(32.8, -90.4, 30, "https://api.example/counselors");
    const u = new URL(url);
    expect(u.searchParams.get("lat")).toBe("32.8");
    expect(u.searchParams.get("lng")).toBe("-90.4");
    expect(u.searchParams.get("distance")).toBe("30");
  });
});
