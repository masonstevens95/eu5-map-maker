import { describe, it, expect } from "vitest";
import { rankPrefix, knownName, buildDisplayName } from "../country-names";

describe("rankPrefix", () => {
  it("returns Kingdom for level 2 monarchy", () => {
    expect(rankPrefix(2, "monarchy")).toBe("Kingdom of");
  });

  it("returns Empire for level 4 monarchy", () => {
    expect(rankPrefix(4, "monarchy")).toBe("Empire of");
  });

  it("returns Republic for level 2 republic", () => {
    expect(rankPrefix(2, "republic")).toBe("Republic of");
  });

  it("returns Duchy for level 1 monarchy", () => {
    expect(rankPrefix(1, "monarchy")).toBe("Duchy of");
  });

  it("falls back to monarchy for unknown gov type", () => {
    expect(rankPrefix(2, "unknown_type")).toBe("Kingdom of");
  });

  it("falls back to level 0 for unknown level", () => {
    expect(rankPrefix(99, "monarchy")).toBe("County of");
  });
});

describe("knownName", () => {
  it("returns known name for common tags", () => {
    expect(knownName("GBR")).toBe("Great Britain");
    expect(knownName("BOH")).toBe("Bohemia");
    expect(knownName("TUR")).toBe("Ottomans");
    expect(knownName("FRA")).toBe("France");
  });

  it("returns empty for unknown tags", () => {
    expect(knownName("XYZ")).toBe("");
    expect(knownName("AAA62")).toBe("");
  });
});

describe("buildDisplayName", () => {
  it("builds Kingdom of Bohemia for BOH level 2 monarchy", () => {
    expect(buildDisplayName("BOH", "", 2, "monarchy")).toBe("Kingdom of Bohemia");
  });

  it("builds Empire of Ottomans for TUR level 4 monarchy", () => {
    expect(buildDisplayName("TUR", "", 4, "monarchy")).toBe("Empire of Ottomans");
  });

  it("builds Republic of Venice for VEN level 2 republic", () => {
    expect(buildDisplayName("VEN", "", 2, "republic")).toBe("Republic of Venice");
  });

  it("uses country_name for unknown tags", () => {
    expect(buildDisplayName("AAA62", "usolye_province", 1, "monarchy")).toBe("Duchy of Usolye");
  });

  it("strips _province from country_name", () => {
    expect(buildDisplayName("AEA11", "red_sea_coast_province", -1, "")).toBe("Red Sea Coast");
  });

  it("falls back to tag when no name and unknown tag", () => {
    expect(buildDisplayName("XYZ", "", -1, "")).toBe("XYZ");
  });

  it("returns just the name when level is -1", () => {
    expect(buildDisplayName("BOH", "", -1, "monarchy")).toBe("Bohemia");
  });
});
