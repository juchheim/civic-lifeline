"use client";

import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { BenefitsLocation } from "../useBenefitsLocation";
import { useSocialSecurityOffices } from "../useSocialSecurityOffices";

const baseLocation: BenefitsLocation = {
  displayLabel: "Jackson, MS",
  latitude: 32.3,
  longitude: -90.2,
  stateCode: "MS",
  stateName: "Mississippi",
  countyName: "Hinds County",
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

describe("useSocialSecurityOffices", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    vi.restoreAllMocks();
    global.fetch = originalFetch;
  });

  it("fetches SSA offices when location is available", async () => {
    const mockResponse = {
      source: "ssa-field-offices",
      offices: [
        {
          id: "1",
          officeCode: "123",
          name: "Jackson Office",
          address1: "123 Main St",
          address2: null,
          city: "Jackson",
          state: "MS",
          postalCode: "39201",
          phone: "800-123-4567",
          fax: null,
          latitude: 32.3,
          longitude: -90.2,
          mondayHours: "9:00 AM – 4:00 PM",
          tuesdayHours: "9:00 AM – 4:00 PM",
          wednesdayHours: null,
          thursdayHours: null,
          fridayHours: "9:00 AM – 4:00 PM",
        },
      ],
      meta: {
        provider: "SSA Field Office Contact Information",
        datasetUrl: "https://www.ssa.gov/data/FO-RS-Address-Open-Close-Time-App-Devs.html",
      },
    };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const { result } = renderHook(() => useSocialSecurityOffices(baseLocation), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(result.current.offices).toHaveLength(1);
    });
    expect(result.current.meta?.provider).toBe("SSA Field Office Contact Information");
  });

  it("does not fetch when location is missing", async () => {
    const fetchMock = vi.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
    renderHook(() => useSocialSecurityOffices(null), { wrapper: createWrapper() });
    await waitFor(() => {
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });

  it("exposes error message when request fails", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: { message: "No offices" } }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;
    const { result } = renderHook(() => useSocialSecurityOffices(baseLocation), { wrapper: createWrapper() });
    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect(result.current.errorMessage).toContain("No offices");
  });
});
