import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const originalEnv = { ...process.env };

function mockJsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

function buildRequest(body: Record<string, unknown>) {
  return new NextRequest("http://localhost/api/benefits/local-help", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

describe("benefits local-help route", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("returns sample data when AJC env vars are missing", async () => {
    delete process.env.CAREERONESTOP_API_TOKEN;
    delete process.env.CAREERONESTOP_USER_ID;

    const request = buildRequest({ locationText: "Yazoo City, MS", kind: "food" });
    const response = await POST(request);
    expect(response.status).toBe(200);
    const body = (await response.json()) as any;
    expect(body.source).toBe("sample-local-data");
    expect(Array.isArray(body.items)).toBe(true);
    expect(body.items.length).toBeGreaterThan(0);
  });

  it("calls the CareerOneStop AJC API when configured", async () => {
    process.env.CAREERONESTOP_API_BASE = "https://api.example-ajc.test";
    process.env.CAREERONESTOP_API_TOKEN = "test-token";
    process.env.CAREERONESTOP_USER_ID = "user-123";
    process.env.CAREERONESTOP_AJC_RADIUS_MILES = "30";

    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      mockJsonResponse({
        OneStopCenterList: [
          {
            ID: "abc",
            Name: "Test Job Center",
            Address1: "10 Main",
            City: "City",
            StateAbbr: "MS",
            Zip: "39194",
            Phone: "555-111-2222",
            Miles: 2.5,
          },
        ],
      }),
    );

    const request = buildRequest({
      locationText: "Yazoo City, MS",
      latitude: 32.89,
      longitude: -90.4,
      kind: "health",
    });
    const response = await POST(request);
    expect(response.status).toBe(200);
    const body = (await response.json()) as any;
    expect(body.source).toBe("career-onestop-ajc");
    expect(body.items[0]?.name).toBe("Test Job Center");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const calledUrl = new URL(fetchMock.mock.calls[0]![0] as string);
    expect(calledUrl.origin + calledUrl.pathname).toBe(
      "https://api.example-ajc.test/v1/ajcfinder/user-123/Yazoo%20City%2C%20MS/30/0/0/0/0/Distance/ASC/0/25",
    );
    expect(fetchMock.mock.calls[0]![1]).toMatchObject({
      headers: expect.objectContaining({ Authorization: "Bearer test-token" }),
    });
  });

  it("falls back to sample data when the AJC API fails", async () => {
    process.env.CAREERONESTOP_API_BASE = "https://api.example-ajc.test";
    process.env.CAREERONESTOP_API_TOKEN = "test-token";
    process.env.CAREERONESTOP_USER_ID = "user-123";

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(mockJsonResponse({ error: "fail" }, 500));

    const request = buildRequest({ locationText: "Yazoo City, MS", kind: "food" });
    const response = await POST(request);
    expect(response.status).toBe(200);
    const body = (await response.json()) as any;
    expect(body.source).toBe("sample-local-data");
  });
});
