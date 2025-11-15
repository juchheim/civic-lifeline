import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

vi.mock("../../housing/_shared/redis", () => ({
  getRedis: () => null,
}));

function buildRequest(body: Record<string, unknown>) {
  return new NextRequest("http://localhost/api/benefits/social-security-offices", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

describe("benefits social-security-offices route", () => {
  const sampleAttributes = {
    OFFICE_CODE: "659",
    OFFICE_NAME: "TALLAHASSEE FL",
    ADDRESS_LINE_1: "SOCIAL SECURITY",
    ADDRESS_LINE_2: "STE B-12",
    ADDRESS_LINE_3: "2002 OLD ST AUGUSTINE",
    CITY: "TALLAHASSEE",
    STATE: "FL",
    ZIP_CODE: "32301",
    PHONE: "(866) 248-2088",
    FAX: "(833) 679-0237",
    MONDAY_OPEN_TIME: "9:00 AM",
    MONDAY_CLOSE_TIME: "4:00 PM",
    LATITUDE_NUM: 30.426687,
    LONGITUDE_NUM: -84.2463,
    ObjectId: 1,
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns SSA offices when data is available", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          features: [{ attributes: sampleAttributes, geometry: { x: -84.2463, y: 30.426687 } }],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );

    const request = buildRequest({ latitude: 30.4, longitude: -84.2, stateCode: "fl" });
    const response = await POST(request);
    expect(response.status).toBe(200);
    const body = (await response.json()) as any;
    expect(body.source).toBe("ssa-field-offices");
    expect(body.offices).toHaveLength(1);
    expect(body.offices[0].officeCode).toBe("659");
    expect(body.meta.provider).toBe("SSA Field Office Contact Information");
  });

  it("returns empty offices when none are found", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ features: [] }), { status: 200, headers: { "content-type": "application/json" } }),
    );

    const request = buildRequest({ latitude: 40, longitude: -80, stateCode: "pa" });
    const response = await POST(request);
    expect(response.status).toBe(200);
    const body = (await response.json()) as any;
    expect(Array.isArray(body.offices)).toBe(true);
    expect(body.offices.length).toBe(0);
    expect(String(body.meta.notes)).toContain("No SSA field offices found");
  });

  it("returns 400 for invalid payloads", async () => {
    const request = buildRequest({ longitude: -80 });
    const response = await POST(request);
    expect(response.status).toBe(400);
    const body = (await response.json()) as any;
    expect(body.error?.code).toBe("BAD_LOCATION");
  });

  it("returns 502 when ArcGIS fails", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response("error", { status: 500 }));
    const request = buildRequest({ latitude: 30, longitude: -84, stateCode: "FL" });
    const response = await POST(request);
    expect(response.status).toBe(502);
    const body = (await response.json()) as any;
    expect(body.error?.code).toBe("UPSTREAM_UNAVAILABLE");
  });
});
