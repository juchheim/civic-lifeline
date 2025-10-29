import { describe, it, expect } from "vitest";
import { transformHudFmr, buildHudFmrUrl } from "./lib";

describe("fmr lib", () => {
  it("maps HUD fmr record to values", () => {
    const json = { fmr: { area_name: "Yazoo County, MS", fmr0: 570, fmr1: 620, fmr2: 790, fmr3: 990, fmr4: 1150 } };
    const out = transformHudFmr(json);
    expect(out.areaName).toBe("Yazoo County, MS");
    expect(out.br2).toBe(790);
  });

  it("builds url with fips/year", () => {
    const url = buildHudFmrUrl("28163", 2025, "https://api.example/fmr");
    const u = new URL(url);
    expect(u.searchParams.get("fips")).toBe("28163");
    expect(u.searchParams.get("year")).toBe("2025");
  });
});
