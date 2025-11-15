"use client";

import "@testing-library/jest-dom/vitest";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { HealthCoveragePanel } from "../BenefitsClient";
import type { BenefitsLocation } from "../useBenefitsLocation";

const baseLocation: BenefitsLocation = {
  displayLabel: "Jackson, MS 39201",
  latitude: 32.3,
  longitude: -90.2,
  countyName: "Hinds County",
  stateCode: "MS",
  stateName: "Mississippi",
  zip: "39201",
  countyFips: undefined,
};

const originalFetch = global.fetch;

function renderPanel() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <HealthCoveragePanel location={baseLocation} promptForLocation={vi.fn()} />
    </QueryClientProvider>,
  );
}

afterEach(() => {
  vi.restoreAllMocks();
  global.fetch = originalFetch;
});

describe("HealthCoveragePanel screener", () => {
  it("shows summary after a successful check", async () => {
    const mockResponse = {
      annualIncome: 48000,
      fplRatio: 1.86,
      fplPercent: 186,
      householdSize: 3,
      stateCode: "MS",
      isMedicaidExpansionState: true,
      band: "likely_marketplace_with_savings",
      summary: "You may qualify for savings on a Marketplace health plan.",
      programHints: ["Look for Marketplace plans with premium tax credits."],
      disclaimers: ["This is not a final decision."],
      source: "fpl-2024 + medicaid-expansion-map",
      dataVintage: "2024",
    };

    global.fetch = vi
      .fn((input: RequestInfo) => {
        const url = typeof input === "string" ? input : input.url;
        if (url.includes("/api/benefits/health-check")) {
          return Promise.resolve(new Response(JSON.stringify(mockResponse), { status: 200 }));
        }
        return Promise.resolve(new Response(JSON.stringify({}), { status: 200 }));
      })
      .mockName("fetch") as any;

    renderPanel();
    const user = userEvent.setup();
    await user.clear(screen.getByLabelText(/Your city or ZIP/i));
    await user.type(screen.getByLabelText(/Your city or ZIP/i), "Jackson, MS");
    await user.clear(screen.getByLabelText(/People in your home/i));
    await user.type(screen.getByLabelText(/People in your home/i), "3");
    await user.clear(screen.getByLabelText(/Monthly income/i));
    await user.type(screen.getByLabelText(/Monthly income/i), "4000");
    const [checkButton] = screen.getAllByRole("button", { name: /Check my health coverage options/i });
    await user.click(checkButton);

    await waitFor(() => {
      expect(screen.getByText(/your quick coverage check/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/186% of the federal poverty level/i)).toBeInTheDocument();
    expect(screen.getByText(/your state or healthcare.gov/i)).toBeInTheDocument();
  });

  it("shows an error when the API fails", async () => {
    global.fetch = vi
      .fn((input: RequestInfo) => {
        const url = typeof input === "string" ? input : input.url;
        if (url.includes("/api/benefits/health-check")) {
          return Promise.resolve(new Response(JSON.stringify({ error: { message: "fail" } }), { status: 500 }));
        }
        return Promise.resolve(new Response(JSON.stringify({}), { status: 200 }));
      })
      .mockName("fetch") as any;

    renderPanel();
    const user = userEvent.setup();
    await user.clear(screen.getByLabelText(/Your city or ZIP/i));
    await user.type(screen.getByLabelText(/Your city or ZIP/i), "Jackson, MS");
    await user.clear(screen.getByLabelText(/People in your home/i));
    await user.type(screen.getByLabelText(/People in your home/i), "2");
    await user.clear(screen.getByLabelText(/Monthly income/i));
    await user.type(screen.getByLabelText(/Monthly income/i), "1000");
    const [submitButton] = screen.getAllByRole("button", { name: /Check my health coverage options/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/We had trouble running this check/i)).toBeInTheDocument();
    });
  });
});
