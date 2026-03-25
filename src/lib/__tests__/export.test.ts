import { describe, it, expect } from "vitest";
import { exportMapChartConfig } from "../export";
import { buildMinimalSave } from "./fixtures/minimal-save";

const provinceMapping: Record<string, string[]> = {
  Uppland: ["Stockholm"],
  Ile_de_France: ["Paris"],
  Middlesex: ["London"],
  Edinburgh: ["Edinburgh"],
};

describe("exportMapChartConfig", () => {
  it("exports all countries by default", () => {
    const save = buildMinimalSave({
      locationNames: ["stockholm", "paris", "london"],
      tags: { 0: "SWE", 1: "FRA", 2: "ENG" },
      ownership: { 0: 0, 1: 1, 2: 2 },
      players: [{ name: "Alice", country: 0 }],
    });
    const config = exportMapChartConfig(save, provinceMapping);
    const labels = Object.values(config.groups).map((g) => g.label);
    expect(labels).toContain("SWE - Alice");
    expect(labels).toContain("FRA");
    expect(labels).toContain("ENG");
  });

  it("filters to players only when playersOnly=true", () => {
    const save = buildMinimalSave({
      locationNames: ["stockholm", "paris", "london"],
      tags: { 0: "SWE", 1: "FRA", 2: "ENG" },
      ownership: { 0: 0, 1: 1, 2: 2 },
      players: [{ name: "Alice", country: 0 }],
    });
    const config = exportMapChartConfig(save, provinceMapping, { playersOnly: true });
    const labels = Object.values(config.groups).map((g) => g.label);
    expect(labels).toContain("SWE - Alice");
    expect(labels).not.toContain("FRA");
    expect(labels).not.toContain("ENG");
  });

  it("adds vassal territory with lightened colors", () => {
    const save = buildMinimalSave({
      locationNames: ["stockholm", "edinburgh"],
      tags: { 0: "ENG", 1: "SCO" },
      ownership: { 0: 0, 1: 1 },
      colors: { ENG: [255, 0, 0], SCO: [0, 0, 255] },
      ioVassals: [{ leader: 0, members: [0, 1] }],
      players: [{ name: "Alice", country: 0 }],
    });
    const config = exportMapChartConfig(save, provinceMapping, { playersOnly: true });
    const labels = Object.values(config.groups).map((g) => g.label);
    expect(labels).toContain("ENG - Alice");
    expect(labels).toContain("ENG - subjects");

    // Vassal color should be lighter than parent
    const vassalGroup = Object.entries(config.groups).find(
      ([, g]) => g.label === "ENG - subjects",
    );
    expect(vassalGroup).toBeDefined();
    // #ff0000 lightened 2/3 toward white = #ffaaaa
    expect(vassalGroup![0]).toBe("#ffaaaa");
  });

  it("includes player names in labels for multi-player countries", () => {
    const save = buildMinimalSave({
      locationNames: ["paris"],
      tags: { 0: "FRA" },
      ownership: { 0: 0 },
      players: [
        { name: "Alice", country: 0 },
        { name: "Bob", country: 0 },
      ],
    });
    const config = exportMapChartConfig(save, provinceMapping);
    const labels = Object.values(config.groups).map((g) => g.label);
    expect(labels).toContain("FRA - Alice, Bob");
  });

  it("sets title from options", () => {
    const save = buildMinimalSave();
    const config = exportMapChartConfig(save, provinceMapping, { title: "Test Map" });
    expect(config.title).toBe("Test Map");
  });

  it("handles save with no players gracefully", () => {
    const save = buildMinimalSave({
      locationNames: ["stockholm"],
      tags: { 0: "SWE" },
      ownership: { 0: 0 },
      players: [],
    });
    const config = exportMapChartConfig(save, provinceMapping, { playersOnly: true });
    // No players found, so playersOnly should still show all
    const labels = Object.values(config.groups).map((g) => g.label);
    expect(labels).toContain("SWE");
  });

  it("skips vassal entry when vassals have no locations", () => {
    const save = buildMinimalSave({
      locationNames: ["stockholm"],
      tags: { 0: "ENG", 1: "SCO" },
      ownership: { 0: 0 }, // SCO has no owned locations
      ioVassals: [{ leader: 0, members: [0, 1] }],
      players: [{ name: "Alice", country: 0 }],
    });
    const config = exportMapChartConfig(save, provinceMapping, { playersOnly: true });
    const labels = Object.values(config.groups).map((g) => g.label);
    expect(labels).not.toContain("ENG - subjects");
  });
});
