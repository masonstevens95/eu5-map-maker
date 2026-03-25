import { describe, it, expect } from "vitest";
import { generateMapChartConfig } from "../mapchart-config";
import type { RGB } from "../types";

const locToProvince: Record<string, string> = {
  stockholm: "Uppland",
  paris: "Ile_de_France",
  london: "Middlesex",
};

describe("generateMapChartConfig", () => {
  it("produces valid config structure", () => {
    const config = generateMapChartConfig(
      { SWE: ["stockholm"], FRA: ["paris"] },
      { SWE: [0, 0, 255], FRA: [33, 33, 173] },
      locToProvince,
    );
    expect(config.page).toBe("eu-v-provinces");
    expect(config.v6).toBe(true);
    expect(config.areBordersShown).toBe(true);
    expect(config.defaultColor).toBe("#d1dbdd");
    expect(config.hidden).toEqual([]);
    expect(config.mapVersion).toBeNull();
  });

  it("uses provided colors", () => {
    const config = generateMapChartConfig(
      { SWE: ["stockholm"] },
      { SWE: [0, 0, 255] },
      locToProvince,
    );
    expect(config.groups["#0000ff"]).toBeDefined();
    expect(config.groups["#0000ff"].label).toBe("SWE");
    expect(config.groups["#0000ff"].paths).toEqual(["Uppland"]);
  });

  it("generates colors for countries without provided colors", () => {
    const config = generateMapChartConfig(
      { SWE: ["stockholm"], FRA: ["paris"] },
      {},
      locToProvince,
    );
    const hexKeys = Object.keys(config.groups);
    expect(hexKeys).toHaveLength(2);
    // Each should be a valid hex color
    for (const hex of hexKeys) {
      expect(hex).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  it("deduplicates hex color collisions", () => {
    const sameColor: RGB = [100, 100, 100];
    const config = generateMapChartConfig(
      { AAA: ["stockholm"], BBB: ["paris"] },
      { AAA: sameColor, BBB: [...sameColor] },
      locToProvince,
    );
    const hexKeys = Object.keys(config.groups);
    expect(hexKeys).toHaveLength(2);
    expect(hexKeys[0]).not.toBe(hexKeys[1]);
  });

  it("applies tagLabels", () => {
    const config = generateMapChartConfig(
      { SWE: ["stockholm"] },
      { SWE: [0, 0, 255] },
      locToProvince,
      { tagLabels: { SWE: "SWE - Alice" } },
    );
    expect(config.groups["#0000ff"].label).toBe("SWE - Alice");
  });

  it("uses tag as label when no tagLabels provided", () => {
    const config = generateMapChartConfig(
      { SWE: ["stockholm"] },
      { SWE: [0, 0, 255] },
      locToProvince,
    );
    expect(config.groups["#0000ff"].label).toBe("SWE");
  });

  it("sets title from options", () => {
    const config = generateMapChartConfig({}, {}, locToProvince, { title: "My Map" });
    expect(config.title).toBe("My Map");
  });

  it("sorts groups by province count descending", () => {
    const config = generateMapChartConfig(
      { SMALL: ["stockholm"], BIG: ["paris", "london"] },
      { SMALL: [255, 0, 0], BIG: [0, 255, 0] },
      locToProvince,
    );
    const labels = Object.values(config.groups).map((g) => g.label);
    expect(labels[0]).toBe("BIG");
    expect(labels[1]).toBe("SMALL");
  });

  it("returns config with no groups for empty input", () => {
    const config = generateMapChartConfig({}, {}, locToProvince);
    expect(Object.keys(config.groups)).toHaveLength(0);
  });
});
