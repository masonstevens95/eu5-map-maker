import { describe, it, expect } from "vitest";
import { sortMilitary, buildMilitaryEntries } from "../military-sort";
import type { MilitaryEntry } from "../military-sort";
import type { CountryEconomyStats } from "../types";

const mkStats = (overrides: Partial<CountryEconomyStats> = {}): CountryEconomyStats => ({
  gold: 0, monthlyIncome: 0, monthlyTradeValue: 0, population: 1000,
  regiments: 0, ships: 0, armyStrength: 0, navyStrength: 0,
  maxManpower: 0, maxSailors: 0, monthlyManpower: 0, monthlySailors: 0,
  armyMaintenance: 0, navyMaintenance: 0,
  regiments: 0, ships: 0,
  courtLanguage: "", govType: "", score: 0, ...overrides,
});

const mkEntry = (tag: string, name: string, overrides: Partial<CountryEconomyStats> = {}): MilitaryEntry => ({
  tag, name, players: [], color: "#000", stats: mkStats(overrides),
});

describe("sortMilitary", () => {
  it("sorts by army size descending", () => {
    const entries = [
      mkEntry("A", "Alpha", { regiments: 100 }),
      mkEntry("B", "Bravo", { regiments: 500 }),
      mkEntry("C", "Charlie", { regiments: 300 }),
    ];
    const sorted = sortMilitary(entries, "regiments");
    expect(sorted.map(e => e.tag)).toEqual(["B", "C", "A"]);
  });

  it("sorts by navy size descending", () => {
    const entries = [
      mkEntry("A", "Alpha", { ships: 50 }),
      mkEntry("B", "Bravo", { ships: 200 }),
    ];
    const sorted = sortMilitary(entries, "ships");
    expect(sorted[0].tag).toBe("B");
  });

  it("sorts by max manpower descending", () => {
    const entries = [
      mkEntry("A", "Alpha", { maxManpower: 1000 }),
      mkEntry("B", "Bravo", { maxManpower: 5000 }),
    ];
    const sorted = sortMilitary(entries, "manpower");
    expect(sorted[0].tag).toBe("B");
  });

  it("sorts by max sailors descending", () => {
    const entries = [
      mkEntry("A", "Alpha", { maxSailors: 100 }),
      mkEntry("B", "Bravo", { maxSailors: 800 }),
    ];
    const sorted = sortMilitary(entries, "sailors");
    expect(sorted[0].tag).toBe("B");
  });

  it("sorts by country name alphabetically", () => {
    const entries = [mkEntry("B", "Zulu"), mkEntry("A", "Alpha")];
    const sorted = sortMilitary(entries, "country");
    expect(sorted.map(e => e.name)).toEqual(["Alpha", "Zulu"]);
  });

  it("breaks ties by name", () => {
    const entries = [
      mkEntry("B", "Bravo", { regiments: 100 }),
      mkEntry("A", "Alpha", { regiments: 100 }),
    ];
    const sorted = sortMilitary(entries, "regiments");
    expect(sorted.map(e => e.tag)).toEqual(["A", "B"]);
  });
});

describe("buildMilitaryEntries", () => {
  it("includes countries with army, navy, or manpower", () => {
    const entries = buildMilitaryEntries(
      {
        GBR: mkStats({ regiments: 100 }),
        FRA: mkStats({ maxManpower: 500 }),
        NUL: mkStats(),
      },
      { GBR: "Great Britain", FRA: "France" },
      {},
      { GBR: [255, 0, 0], FRA: [0, 0, 255] },
    );
    expect(entries).toHaveLength(2);
    expect(entries.map(e => e.tag).sort()).toEqual(["FRA", "GBR"]);
  });

  it("excludes countries with all zero military stats", () => {
    const entries = buildMilitaryEntries(
      { NUL: mkStats({ population: 1000 }) },
      {}, {}, {},
    );
    expect(entries).toHaveLength(0);
  });

  it("uses tag as fallback name", () => {
    const entries = buildMilitaryEntries(
      { XYZ: mkStats({ regiments: 10 }) },
      {}, {}, {},
    );
    expect(entries[0].name).toBe("XYZ");
  });
});
