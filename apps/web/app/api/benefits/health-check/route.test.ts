import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { POST } from "./route";

function buildRequest(body: Record<string, unknown>) {
  return new NextRequest("http://localhost/api/benefits/health-check", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

describe("benefits health-check route", () => {
  it("classifies likely Medicaid/CHIP in an expansion state", async () => {
    const response = await POST(
      buildRequest({
        locationText: "Seattle, WA 98101",
        stateCode: "WA",
        monthlyIncome: 1000,
        householdSize: 3,
      }),
    );
    expect(response.status).toBe(200);
    const body = (await response.json()) as any;
    expect(body.band).toBe("likely_medicaid_or_chip");
    expect(body.isMedicaidExpansionState).toBe(true);
    expect(body.fplRatio).toBeLessThanOrEqual(1.38);
  });

  it("classifies marketplace with savings when income is mid-range", async () => {
    const response = await POST(
      buildRequest({
        locationText: "Seattle, WA 98101",
        stateCode: "WA",
        monthlyIncome: 4000,
        householdSize: 3,
      }),
    );
    expect(response.status).toBe(200);
    const body = (await response.json()) as any;
    expect(body.band).toBe("likely_marketplace_with_savings");
    expect(body.fplRatio).toBeGreaterThan(1.38);
    expect(body.fplRatio).toBeLessThanOrEqual(4);
  });

  it("classifies marketplace full price when income is high", async () => {
    const response = await POST(
      buildRequest({
        locationText: "Seattle, WA 98101",
        stateCode: "WA",
        monthlyIncome: 9000,
        householdSize: 2,
      }),
    );
    expect(response.status).toBe(200);
    const body = (await response.json()) as any;
    expect(body.band).toBe("likely_marketplace_full_price");
    expect(body.fplRatio).toBeGreaterThan(4);
  });

  it("flags non-expansion states as uncertain when income is low", async () => {
    const response = await POST(
      buildRequest({
        locationText: "Houston, TX",
        stateCode: "TX",
        monthlyIncome: 900,
        householdSize: 2,
      }),
    );
    expect(response.status).toBe(200);
    const body = (await response.json()) as any;
    expect(body.band).toBe("uncertain_check_state_rules");
    expect(body.isMedicaidExpansionState).toBe(false);
  });

  it("returns 400 when state cannot be determined", async () => {
    const response = await POST(
      buildRequest({
        locationText: "Somewhere",
        monthlyIncome: 1200,
        householdSize: 2,
      }),
    );
    expect(response.status).toBe(400);
    const body = (await response.json()) as any;
    expect(body.error?.code).toBe("STATE_REQUIRED");
  });
});
