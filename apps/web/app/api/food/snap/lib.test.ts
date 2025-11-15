import { describe, it, expect } from "vitest";
import { transformArcgisToSnapItems, buildArcgisUrl, normalizeBbox } from "./lib";

const sample = {
  features: [
    {
      attributes: {
        Store_Name: "ACME MARKET",
        Street_Address: "123 Main St",
        City: "Yazoo City",
        State: "MS",
        ZIP_Code: "39194",
        Store_Type: "Supermarket",
        Phone_Number: null,
        HOURS: null,
      },
      geometry: { x: -90.405, y: 32.889 },
    },
  ],
};

describe("snap lib", () => {
  it("maps arcgis features to SnapItem[]", () => {
    const items = transformArcgisToSnapItems(sample);
    expect(items.length).toBe(1);
    expect(items[0].name).toBe("ACME MARKET");
    expect(items[0].address).toContain("Yazoo City");
    expect(items[0].coords).toEqual([-90.405, 32.889]);
  });

  it("builds arcgis url with bbox and limit", () => {
    const bbox = normalizeBbox("-90.7,32.6,-90.1,33.1");
    const url = buildArcgisUrl(bbox, 123, "https://services2.arcgis.com/xyz/ArcGIS/rest/services/Test/FeatureServer/0/query");
    const u = new URL(url);
    const params = u.searchParams;
    expect(params.get("resultRecordCount")).toBe("123");
    expect(params.get("f")).toBe("json");
    expect(params.get("inSR")).toBe("102100");
    expect(params.get("outSR")).toBe("4326");
    expect(params.get("geometryType")).toBe("esriGeometryEnvelope");
    // SNAP queries use Web Mercator meters (EPSG:3857/102100), so expect projected geometry.
    const geometry = params.get("geometry");
    expect(geometry).toBeTruthy();
    const projected = geometry!.split(",").map(Number);
    expect(projected).toHaveLength(4);
    const [xmin, ymin, xmax, ymax] = projected;
    expect(xmin).toBeLessThan(xmax);
    expect(ymin).toBeLessThan(ymax);
    expect(Math.abs(xmin)).toBeGreaterThan(1_000_000);
    expect(Math.abs(ymin)).toBeGreaterThan(3_000_000);
  });
});
