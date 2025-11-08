import { describe, expect, it } from "vitest";
import type { County, State } from "@cl/types";
import { buildTransformContext, mapSdwisRecord } from "./transform";

const mockStates: Array<State & { _id: string }> = [{ _id: "MS", code: "MS", name: "Mississippi", fips: "28" }];
const mockCounties: Array<County & { _id: string }> = [
  { _id: "28163", name: "Yazoo County", fips: "28163", stateCode: "MS", stateFips: "28" },
  { _id: "28001", name: "Adams County", fips: "28001", stateCode: "MS", stateFips: "28" },
];

const ctx = buildTransformContext(mockStates, mockCounties);

describe("mapSdwisRecord", () => {
  it("creates a normalized document with derived ids", () => {
    const result = mapSdwisRecord(
      {
        pwsid: "MS12345",
        pwsname: "Yazoo Water",
        state: "MS",
        countyserved: "YAZOO COUNTY",
        populationserved: "1200",
        contact: "Jane Doe",
        contactphone: "(555) 222-3333",
      },
      ctx,
    );
    expect(result.document).toBeTruthy();
    expect(result.document).toMatchObject({
      _id: "MS12345:28163",
      pwsId: "MS12345",
      systemName: "Yazoo Water",
      countyFips: "28163",
      countyName: "Yazoo County",
      stateCode: "MS",
      stateFips: "28",
      populationServed: 1200,
      contact: { name: "Jane Doe", phone: "555-222-3333" },
    });
  });

  it("resolves numeric state codes", () => {
    const result = mapSdwisRecord(
      {
        pwsid: "MS67890",
        pwsname: "Adams System",
        state: "28",
        countyserved: "Adams",
        populationserved: "75",
      },
      ctx,
    );
    expect(result.document).toBeTruthy();
    expect(result.document?.stateCode).toBe("MS");
    expect(result.document?._id).toBe("MS67890:28001");
  });

  it("reports county mismatches", () => {
    const result = mapSdwisRecord(
      {
        pwsid: "MS00001",
        pwsname: "Unknown",
        state: "MS",
        countyserved: "Imaginary",
      },
      ctx,
    );
    expect(result.document).toBeUndefined();
    expect(result.reason).toBe("county-unmapped");
  });
});
