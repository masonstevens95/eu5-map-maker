import { describe, it, expect } from "vitest";
import { buildLocationToProvince, mapToProvinces } from "../province-mapping";

describe("buildLocationToProvince", () => {
  it("reverses province -> locations mapping", () => {
    const mapping = {
      Uppland: ["Stockholm", "Norrtalje", "Uppsala"],
      Ile_de_France: ["Paris", "Versailles"],
    };
    const result = buildLocationToProvince(mapping);
    expect(result["stockholm"]).toBe("Uppland");
    expect(result["norrtalje"]).toBe("Uppland");
    expect(result["paris"]).toBe("Ile_de_France");
  });

  it("lowercases all location keys", () => {
    const result = buildLocationToProvince({ Test: ["UPPER", "Mixed_Case"] });
    expect(result["upper"]).toBe("Test");
    expect(result["mixed_case"]).toBe("Test");
    expect(result["UPPER"]).toBeUndefined();
  });

  it("returns empty for empty mapping", () => {
    expect(buildLocationToProvince({})).toEqual({});
  });
});

describe("mapToProvinces", () => {
  const locToProvince: Record<string, string> = {
    stockholm: "Uppland",
    norrtalje: "Uppland",
    uppsala: "Uppland",
    paris: "Ile_de_France",
    versailles: "Ile_de_France",
    london: "Middlesex",
  };

  it("maps country locations to provinces", () => {
    const result = mapToProvinces(
      { SWE: ["stockholm", "norrtalje"], FRA: ["paris"] },
      locToProvince,
    );
    expect(result["SWE"]).toEqual(["Uppland"]);
    expect(result["FRA"]).toEqual(["Ile_de_France"]);
  });

  it("resolves majority owner for contested province", () => {
    // SWE owns 2 locations in Uppland, FRA owns 1
    const result = mapToProvinces(
      { SWE: ["stockholm", "norrtalje"], FRA: ["uppsala"] },
      locToProvince,
    );
    expect(result["SWE"]).toContain("Uppland");
    expect(result["FRA"]).toBeUndefined();
  });

  it("skips locations with no province mapping", () => {
    const result = mapToProvinces(
      { SWE: ["stockholm", "unmapped_location"] },
      locToProvince,
    );
    expect(result["SWE"]).toEqual(["Uppland"]);
  });

  it("returns empty for empty input", () => {
    expect(mapToProvinces({}, locToProvince)).toEqual({});
  });

  it("returns empty when no locations match", () => {
    expect(mapToProvinces({ SWE: ["nowhere"] }, locToProvince)).toEqual({});
  });
});
