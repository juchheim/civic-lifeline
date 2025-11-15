import { renderHook, act } from "@testing-library/react";
import { describe, expect, it } from "vitest";
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
  it("maps a selection into a benefits location", () => {
    const mapped = mapSelectionToBenefitsLocation(sampleSelection);
    expect(mapped.displayLabel).toBe("Yazoo City, MS 39194");
    expect(mapped.stateCode).toBe("MS");
    expect(mapped.countyName).toBe("Yazoo County");
    expect(mapped.zip).toBe("39194");
  });

  it("stores and clears the selected location", () => {
    const { result } = renderHook(() => useBenefitsLocation(), { wrapper });
    act(() => {
      result.current.setLocationFromResolved(sampleSelection);
    });
    expect(result.current.location?.displayLabel).toBe("Yazoo City, MS 39194");
    act(() => {
      result.current.clearLocation();
    });
    expect(result.current.location).toBeNull();
  });
});
