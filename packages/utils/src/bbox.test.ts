import { describe, it, expect } from "vitest";
import { parseBbox, bboxToQueryParam, centroid, contains, clampToWorld } from "./bbox";

describe("bbox helpers", () => {
  it("parses and serializes bbox", () => {
    const b = parseBbox("-90,30,-89,31");
    expect(bboxToQueryParam(b)).toBe("-90,30,-89,31");
  });
  it("centroid", () => {
    expect(centroid([-90, 30, -88, 34])).toEqual([-89, 32]);
  });
  it("contains", () => {
    expect(contains([-90, 30, -88, 34], [-89, 31])).toBe(true);
    expect(contains([-90, 30, -88, 34], [-91, 31])).toBe(false);
  });
  it("clamps to world", () => {
    expect(clampToWorld([-999, -999, 999, 999])).toEqual([-180, -90, 180, 90]);
  });
});
