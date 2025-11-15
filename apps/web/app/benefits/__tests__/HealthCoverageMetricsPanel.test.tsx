"use client";

import "@testing-library/jest-dom/vitest";

import { render, screen, fireEvent } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { BenefitsLocation } from "../useBenefitsLocation";
import { HealthCoverageMetricsPanel } from "../BenefitsClient";
import { useUninsuredCoverageStats } from "../useUninsuredCoverageStats";

vi.mock("../useUninsuredCoverageStats", () => ({
  useUninsuredCoverageStats: vi.fn(),
}));

const mockedHook = vi.mocked(useUninsuredCoverageStats);

const baseHookReturn = {
  data: undefined,
  isLoading: false,
  isFetching: false,
  isError: false,
  error: null,
  refetch: vi.fn(),
  stateFips: null,
  countyFips: null,
  hasCountyMatch: false,
  isResolvingLocation: false,
};

const sampleLocation: BenefitsLocation = {
  displayLabel: "Jackson, MS",
  latitude: 32.3,
  longitude: -90.2,
  countyName: "Hinds County",
  stateCode: "MS",
  stateName: "Mississippi",
};

describe("HealthCoverageMetricsPanel", () => {
  beforeEach(() => {
    mockedHook.mockReturnValue({ ...baseHookReturn });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("prompts for location when missing", () => {
    render(<HealthCoverageMetricsPanel location={null} promptForLocation={vi.fn()} />);
    expect(screen.getByText(/Add your city or ZIP/i)).toBeInTheDocument();
  });

  it("shows loading message", () => {
    mockedHook.mockReturnValue({ ...baseHookReturn, isLoading: true, isResolvingLocation: true });
    render(<HealthCoverageMetricsPanel location={sampleLocation} promptForLocation={vi.fn()} />);
    expect(screen.getByText(/Loading coverage numbers/i)).toBeInTheDocument();
  });

  it("shows error fallback", () => {
    mockedHook.mockReturnValue({ ...baseHookReturn, isError: true });
    render(<HealthCoverageMetricsPanel location={sampleLocation} promptForLocation={vi.fn()} />);
    expect(screen.getByText(/We had trouble loading this data/i)).toBeInTheDocument();
  });

  it("renders metrics when data loaded", () => {
    mockedHook.mockReturnValue({
      ...baseHookReturn,
      data: {
        county: { name: "Hinds County, Mississippi", percent: 12.3, estimate: 15000, scope: "county" },
        state: { name: "Mississippi", percent: 9.8, estimate: 289000, scope: "state" },
        national: { name: "United States", percent: 8.6, estimate: 28000000, scope: "national" },
        source: { dataset: "SAHIE", time: "2022", retrievedAt: "2024-01-01T00:00:00.000Z" },
      },
      hasCountyMatch: true,
    });
    render(<HealthCoverageMetricsPanel location={sampleLocation} promptForLocation={vi.fn()} />);

    expect(screen.getByText("Uninsured in your county")).toBeInTheDocument();
    expect(screen.getByText("12.3%")).toBeInTheDocument();
    expect(screen.getByText("9.8%")).toBeInTheDocument();
    expect(screen.getByText("8.6%")).toBeInTheDocument();
    expect(screen.getByText(/About 12 out of 100/)).toBeInTheDocument();
    expect(screen.getByText(/Latest data/i)).toBeInTheDocument();
  });

  it("warns when county data missing", () => {
    mockedHook.mockReturnValue({
      ...baseHookReturn,
      data: {
        county: null,
        state: { name: "Mississippi", percent: 9.8, estimate: 289000, scope: "state" },
        source: { dataset: "SAHIE", time: "2022", retrievedAt: "2024-01-01T00:00:00.000Z" },
      },
      hasCountyMatch: false,
    });
    render(<HealthCoverageMetricsPanel location={sampleLocation} promptForLocation={vi.fn()} />);
    expect(screen.getByText(/Showing your state instead/i)).toBeInTheDocument();
  });

  it("focuses location prompt button", () => {
    const prompt = vi.fn();
    render(<HealthCoverageMetricsPanel location={null} promptForLocation={prompt} />);
    const buttons = screen.getAllByRole("button", { name: /Set my location/i });
    buttons.forEach((button) => {
      fireEvent.click(button);
    });
    expect(prompt).toHaveBeenCalled();
  });
});
