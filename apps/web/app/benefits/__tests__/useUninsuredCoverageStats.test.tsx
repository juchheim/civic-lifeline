"use client";

import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { BenefitsLocation } from "../useBenefitsLocation";
import { useUninsuredCoverageStats } from "../useUninsuredCoverageStats";

const baseLocation: BenefitsLocation = {
  displayLabel: "Yazoo City, MS",
  latitude: 32.8,
  longitude: -90.4,
  countyName: "Yazoo County",
  stateCode: "MS",
  stateName: "Mississippi",
};

function createWrapper() {
  const client = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });
  const Wrapper = ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  Wrapper.displayName = "TestQueryClientProvider";
  return Wrapper;
}

function mockResponse(payload: unknown) {
  return Promise.resolve({
    ok: true,
    json: async () => payload,
  } as Response);
}

describe("useUninsuredCoverageStats", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    vi.restoreAllMocks();
    global.fetch = originalFetch;
  });

  it("fetches county + state uninsured stats when county is available", async () => {
    const fetchMock = vi.fn((input: RequestInfo) => {
      const url = typeof input === "string" ? input : input.url;
      if (url.startsWith("/api/states")) {
        return mockResponse([{ _id: "ms", code: "MS", name: "Mississippi", fips: "28" }]);
      }
      if (url.startsWith("/api/counties")) {
        return mockResponse([{ _id: "28163", name: "Yazoo County", fips: "28163", stateCode: "MS", stateFips: "28" }]);
      }
      if (url.startsWith("/api/stats/uninsured")) {
        return mockResponse({
          county: { name: "Yazoo County, Mississippi", percent: 12.3, estimate: 3300, scope: "county" },
          state: { name: "Mississippi", percent: 9.8, estimate: 289000, scope: "state" },
          national: { name: "United States", percent: 8.6, estimate: 28000000, scope: "national" },
          source: { dataset: "SAHIE", time: "2022", retrievedAt: "2024-01-01T00:00:00.000Z" },
        });
      }
      throw new Error(`Unhandled fetch: ${url}`);
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const { result } = renderHook(() => useUninsuredCoverageStats(baseLocation), { wrapper: createWrapper() });

    await waitFor(() => {
      const call = fetchMock.mock.calls.find(([url]) => typeof url === "string" && url.startsWith("/api/stats/uninsured"));
      expect(call).toBeDefined();
    });

    const statsCall = fetchMock.mock.calls.find(([url]) => typeof url === "string" && url.startsWith("/api/stats/uninsured"));
    expect(statsCall?.[0]).toContain("stateFips=28");
    expect(statsCall?.[0]).toContain("countyFips=28163");
    expect(fetchMock.mock.calls.filter(([url]) => typeof url === "string" && url.startsWith("/api/counties")).length).toBe(1);
    await waitFor(() => {
      expect(result.current.hasCountyMatch).toBe(true);
    });
  });

  it("falls back to state-only stats when no county is provided", async () => {
    const location: BenefitsLocation = { ...baseLocation, countyName: undefined };
    const fetchMock = vi.fn((input: RequestInfo) => {
      const url = typeof input === "string" ? input : input.url;
      if (url.startsWith("/api/states")) {
        return mockResponse([{ _id: "ms", code: "MS", name: "Mississippi", fips: "28" }]);
      }
      if (url.startsWith("/api/stats/uninsured")) {
        return mockResponse({
          county: null,
          state: { name: "Mississippi", percent: 9.8, estimate: 289000, scope: "state" },
          source: { dataset: "SAHIE", time: "2022", retrievedAt: "2024-01-01T00:00:00.000Z" },
        });
      }
      throw new Error(`Unhandled fetch: ${url}`);
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const { result } = renderHook(() => useUninsuredCoverageStats(location), { wrapper: createWrapper() });

    await waitFor(() => {
      const call = fetchMock.mock.calls.find(([url]) => typeof url === "string" && url.startsWith("/api/stats/uninsured"));
      expect(call).toBeDefined();
    });

    const statsCall = fetchMock.mock.calls.find(([url]) => typeof url === "string" && url.startsWith("/api/stats/uninsured"));
    expect(statsCall?.[0]).toContain("stateFips=28");
    expect(statsCall?.[0]).not.toContain("countyFips");
    const countiesCalls = fetchMock.mock.calls.filter(([url]) => typeof url === "string" && url.startsWith("/api/counties"));
    expect(countiesCalls.length).toBe(0);
    expect(result.current.hasCountyMatch).toBe(false);
  });
});
