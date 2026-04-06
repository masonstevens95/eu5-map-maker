import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { within } from "@testing-library/dom";
import { ValuesTab, SocietalValuesSection } from "../ValuesTab";
import type { CountryEconomyStats } from "../../../lib/types";
import type { CountryInfo } from "../../../lib/country-info";

const mkSV = (overrides: Partial<CountryEconomyStats["societalValues"]> = {}): CountryEconomyStats["societalValues"] => ({
  centralization: 0, innovative: 0, humanist: 0, plutocracy: 0,
  freeSubjects: 0, freeTrade: 0, conciliatory: 0, quantity: 0,
  defensive: 0, naval: 0, traditionalEconomy: 0, communalism: 0,
  inward: 0, liberalism: 0, jurisprudence: 0, unsinicized: 0,
  ...overrides,
});

const mkStats = (overrides: Partial<CountryEconomyStats> = {}): CountryEconomyStats => ({
  gold: 0, stability: 0, prestige: 0, monthlyIncome: 0, monthlyTradeValue: 0, population: 0,
  infantry: 0, cavalry: 0, artillery: 0, infantryStr: 0, cavalryStr: 0, artilleryStr: 0,
  levyInfantry: 0, levyCavalry: 0, levyInfantryStr: 0, levyCavalryStr: 0,
  heavyShips: 0, lightShips: 0, galleys: 0, transports: 0,
  armyFrontage: 0, navyFrontage: 0,
  maxManpower: 0, maxSailors: 0, monthlyManpower: 0, monthlySailors: 0,
  armyMaintenance: 0, navyMaintenance: 0, expectedArmySize: 0, expectedNavySize: 0,
  legitimacy: 0, inflation: 0, stabilityInvestment: 0,
  republicanTradition: 0, hordeUnity: 0, devotion: 0, tribalCohesion: 0,
  governmentPower: 0, karma: 0, religiousInfluence: 0, purity: 0, righteousness: 0,
  diplomaticCapacity: 0, diplomaticReputation: 0, warExhaustion: 0, powerProjection: 0,
  libertyDesire: 0, greatPowerScore: 0, numAllies: 0, militaryTactics: 0,
  armyTradition: 0, navyTradition: 0,
  monthlyGoldIncome: 0, monthlyGoldExpense: 0, monthlyPrestige: 0, prestigeDecay: 0,
  totalDevelopment: 0, numProvinces: 0,
  institutions: [], estates: [],
  societalValues: mkSV(),
  courtLanguage: "", govType: "", primaryCulture: "", religion: "", score: 0,
  ...overrides,
});

describe("ValuesTab", () => {
  it("renders no institutions section when institutions is empty", () => {
    const { container } = render(<ValuesTab stats={mkStats({ institutions: [] })} />);
    expect(container.textContent).not.toContain("Institutions");
  });

  it("renders institution names when institutions are present", () => {
    const stats = mkStats({ institutions: ["feudalism", "renaissance"] });
    const { container } = render(<ValuesTab stats={stats} />);
    expect(container.textContent).toContain("Institutions (2)");
    expect(container.textContent).toContain("Feudalism");
    expect(container.textContent).toContain("Renaissance");
  });
});

describe("SocietalValuesSection", () => {
  it("renders nothing when all values are zero", () => {
    const { container } = render(<SocietalValuesSection sv={mkSV()} />);
    expect(container.textContent).toBe("");
  });

  it("renders section when one active value is present (1-100 range)", () => {
    const { container } = render(<SocietalValuesSection sv={mkSV({ centralization: 70 })} />);
    expect(container.textContent).toContain("Societal Values");
    expect(container.querySelector(".sv-axis")).not.toBeNull();
  });

  it("does not render axis when value > 100 (disabled)", () => {
    const { container } = render(<SocietalValuesSection sv={mkSV({ centralization: 101 })} />);
    // No active values
    expect(container.textContent).toBe("");
  });

  it("shows negative display sign when value < 50", () => {
    const { container } = render(<SocietalValuesSection sv={mkSV({ centralization: 25 })} />);
    // display = (25 - 50) * 2 = -50, sign = ""
    const valueEl = container.querySelector(".sv-bar-value");
    expect(valueEl?.textContent).toBe("-50");
  });

  it("shows positive display sign when value > 50", () => {
    const { container } = render(<SocietalValuesSection sv={mkSV({ centralization: 75 })} />);
    // display = (75 - 50) * 2 = 50, sign = "+"
    const valueEl = container.querySelector(".sv-bar-value");
    expect(valueEl?.textContent).toBe("+50");
  });

  it("shows 0 display when value = 50", () => {
    const { container } = render(<SocietalValuesSection sv={mkSV({ centralization: 50 })} />);
    // display = (50 - 50) * 2 = 0, sign = ""
    const valueEl = container.querySelector(".sv-bar-value");
    expect(valueEl?.textContent).toBe("0");
  });
});
