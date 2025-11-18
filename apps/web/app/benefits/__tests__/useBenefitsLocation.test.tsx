import { renderHook, act } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import type { LocationSelection } from "@/types/location";
import { BenefitsLocationProvider, useBenefitsLocation, mapSelectionToBenefitsLocation } from "../useBenefitsLocation";

const wrapper = ({ children }: { children: React.ReactNode }) => <BenefitsLocationProvider>{children}</BenefitsLocationProvider>;

const sampleSelection: LocationSelection = {
  label: "Yazoo City, MS 39194",
  lat: 32.845,
  lon: -90.405,
  county: "Yazoo County",
  state: "Mississippi",
  stateCode: "ms",
  postalCode: "39194",
};

describe("useBenefitsLocation", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("maps a selection into a benefits location", () => {
    const mapped = mapSelectionToBenefitsLocation(sampleSelection);
    expect(mapped.displayLabel).toBe("Yazoo City, MS 39194");
    expect(mapped.stateCode).toBe("MS");
    expect(mapped.countyName).toBe("Yazoo County");
    expect(mapped.zip).toBe("39194");
  });

  it("derives state codes from full state names when needed", () => {
    const mapped = mapSelectionToBenefitsLocation({
      ...sampleSelection,
      stateCode: undefined,
      state: "Mississippi",
    });
    expect(mapped.stateCode).toBe("MS");
  });

  it("loads a stored location from localStorage", () => {
    window.localStorage.setItem("civiclifeline.location", JSON.stringify(mapSelectionToBenefitsLocation(sampleSelection)));
    const { result } = renderHook(() => useBenefitsLocation(), { wrapper });
    expect(result.current.location?.displayLabel).toBe("Yazoo City, MS 39194");
  });

  it("stores and clears the selected location", () => {
    const { result } = renderHook(() => useBenefitsLocation(), { wrapper });
    act(() => {
      result.current.setLocationFromResolved(sampleSelection);
    });
    expect(result.current.location?.displayLabel).toBe("Yazoo City, MS 39194");
    expect(window.localStorage.getItem("civiclifeline.location")).toContain("Yazoo City");
    act(() => {
      result.current.clearLocation();
    });
    expect(result.current.location).toBeNull();
    expect(window.localStorage.getItem("civiclifeline.location")).toBeNull();
  });
});
