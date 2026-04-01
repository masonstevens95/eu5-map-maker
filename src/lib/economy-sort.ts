/**
 * Economy tab sort and entry helpers.
 *
 * All functions are pure. No null, no exceptions, every if has an else.
 */

import type { CountryEconomyStats } from "./types";

export type EconomySortMode = "income" | "trade" | "treasury" | "population" | "maintenance" | "country";

export interface EconomyEntry {
  readonly tag: string;
  readonly name: string;
  readonly players: readonly string[];
  readonly color: string;
  readonly stats: CountryEconomyStats;
}

/** Total military maintenance. */
export const totalMaintenance = (s: CountryEconomyStats): number =>
  s.armyMaintenance + s.navyMaintenance;

/** Sort economy entries by the chosen mode. */
export const sortEconomy = (
  entries: readonly EconomyEntry[],
  mode: EconomySortMode,
): readonly EconomyEntry[] => {
  const sorted = [...entries];
  const byField = (fn: (s: CountryEconomyStats) => number) => (a: EconomyEntry, b: EconomyEntry) => {
    const diff = fn(b.stats) - fn(a.stats);
    return diff !== 0 ? diff : a.name.localeCompare(b.name);
  };
  if (mode === "income") { sorted.sort(byField(s => s.monthlyIncome)); }
  else if (mode === "trade") { sorted.sort(byField(s => s.monthlyTradeValue)); }
  else if (mode === "treasury") { sorted.sort(byField(s => s.gold)); }
  else if (mode === "population") { sorted.sort(byField(s => s.population)); }
  else if (mode === "maintenance") { sorted.sort(byField(totalMaintenance)); }
  else if (mode === "country") { sorted.sort((a, b) => a.name.localeCompare(b.name)); }
  else { /* unknown */ }
  return sorted;
};

/** Build economy entries from parsed save data. */
export const buildEconomyEntries = (
  countryStats: Readonly<Record<string, CountryEconomyStats>>,
  countryNames: Readonly<Record<string, string>>,
  tagToPlayers: Readonly<Record<string, string[]>>,
  countryColors: Readonly<Record<string, readonly [number, number, number]>>,
): readonly EconomyEntry[] =>
  Object.entries(countryStats)
    .filter(([, s]) => s.population > 0)
    .map(([tag, stats]) => ({
      tag,
      name: countryNames[tag] ?? tag,
      players: tagToPlayers[tag] ?? [],
      color: countryColors[tag]
        ? `rgb(${countryColors[tag][0]},${countryColors[tag][1]},${countryColors[tag][2]})`
        : "#666",
      stats,
    }));
