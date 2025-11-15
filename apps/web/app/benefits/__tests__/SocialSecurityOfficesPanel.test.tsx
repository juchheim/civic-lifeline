"use client";

import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import type { BenefitsLocation } from "../useBenefitsLocation";
import { SocialSecurityOfficesPanel } from "../../../components/benefits/SocialSecurityOfficesPanel";
import { useSocialSecurityOffices } from "../useSocialSecurityOffices";

vi.mock("../useSocialSecurityOffices", () => ({
  useSocialSecurityOffices: vi.fn(),
}));

const mockLocation: BenefitsLocation = {
  displayLabel: "Jackson, MS",
  latitude: 32.3,
  longitude: -90.2,
  stateCode: "MS",
  stateName: "Mississippi",
};

const mockUseSocialSecurityOffices = vi.mocked(useSocialSecurityOffices);

function setupHookReturn(overrides?: Partial<ReturnType<typeof mockUseSocialSecurityOffices>>) {
  mockUseSocialSecurityOffices.mockReturnValue({
    offices: [],
    meta: { provider: "SSA Field Office Contact Information", datasetUrl: "https://www.ssa.gov/data/FO-RS-Address-Open-Close-Time-App-Devs.html" },
    isLoading: false,
    isFetching: false,
    isError: false,
    errorMessage: undefined,
    refetch: vi.fn(),
    ...overrides,
  });
}

describe("SocialSecurityOfficesPanel", () => {
  beforeEach(() => {
    setupHookReturn();
  });

  it("prompts for location when missing", () => {
    render(<SocialSecurityOfficesPanel location={null} promptForLocation={vi.fn()} />);
    expect(screen.getByText(/tell us where you are/i)).toBeInTheDocument();
  });

  it("renders offices when available", () => {
    setupHookReturn({
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
          wednesdayHours: "9:00 AM – 4:00 PM",
          thursdayHours: "9:00 AM – 4:00 PM",
          fridayHours: "9:00 AM – 4:00 PM",
        },
      ],
    });
    render(<SocialSecurityOfficesPanel location={mockLocation} promptForLocation={vi.fn()} />);
    expect(screen.getByText(/Jackson Office/i)).toBeInTheDocument();
    expect(screen.getByText(/Jackson, MS/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /800-123-4567/ })).toBeInTheDocument();
  });

  it("shows empty-state message when no offices returned", () => {
    render(<SocialSecurityOfficesPanel location={mockLocation} promptForLocation={vi.fn()} />);
    expect(screen.getByText(/We couldn't find a Social Security office/i)).toBeInTheDocument();
    expect(screen.getAllByText(/official SSA office locator/i).length).toBeGreaterThan(0);
  });

  it("shows error copy when the hook errors", () => {
    const refetch = vi.fn();
    setupHookReturn({
      isError: true,
      errorMessage: "No offices",
      refetch,
    });
    render(<SocialSecurityOfficesPanel location={mockLocation} promptForLocation={vi.fn()} />);
    expect(screen.getByText(/We couldn't load local Social Security offices/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Try again/i }));
    expect(refetch).toHaveBeenCalled();
  });
});
