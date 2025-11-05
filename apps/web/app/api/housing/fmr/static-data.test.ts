import { describe, expect, it } from "vitest";
import { lookupStaticFmr } from "./static-data";

describe("static fmr dataset", () => {
  it("returns sample data when present", async () => {
    const record = await lookupStaticFmr("28163", 2024);
    expect(record).not.toBeNull();
    expect(record?.areaName).toContain("Yazoo County");
    expect(record?.br2).toBeGreaterThan(0);
  });

  it("returns null for missing entries", async () => {
    const record = await lookupStaticFmr("99999", 1900);
    expect(record).toBeNull();
  });
});
