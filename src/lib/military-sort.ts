/**
 * Military tab sort and entry helpers.
 *
 * All functions are pure. No null, no exceptions, every if has an else.
 */

import type { CountryEconomyStats } from "./types";

export type MilitarySortMode = "regiments" | "ships" | "armyStr" | "navyStr" | "manpower" | "sailors" | "country";

export interface MilitaryEntry {
  readonly tag: string;
  readonly name: string;
  readonly players: readonly string[];
  readonly color: string;
  readonly stats: CountryEconomyStats;
}

/** Sort military entries by the chosen mode. */
export const sortMilitary = (
  entries: readonly MilitaryEntry[],
  mode: MilitarySortMode,
): readonly MilitaryEntry[] => {
  const sorted = [...entries];
  sorted.sort((a, b) => {
    if (mode === "regiments") {
      const diff = b.stats.regiments - a.stats.regiments;
      return diff !== 0 ? diff : a.name.localeCompare(b.name);
    } else if (mode === "ships") {
      const diff = b.stats.ships - a.stats.ships;
      return diff !== 0 ? diff : a.name.localeCompare(b.name);
    } else if (mode === "armyStr") {
      const diff = b.stats.armyStrength - a.stats.armyStrength;
      return diff !== 0 ? diff : a.name.localeCompare(b.name);
    } else if (mode === "navyStr") {
      const diff = b.stats.navyStrength - a.stats.navyStrength;
      return diff !== 0 ? diff : a.name.localeCompare(b.name);
    } else if (mode === "manpower") {
      const diff = b.stats.maxManpower - a.stats.maxManpower;
      return diff !== 0 ? diff : a.name.localeCompare(b.name);
    } else if (mode === "sailors") {
      const diff = b.stats.maxSailors - a.stats.maxSailors;
      return diff !== 0 ? diff : a.name.localeCompare(b.name);
    } else if (mode === "country") {
      return a.name.localeCompare(b.name);
    } else {
      return 0;
    }
  });
  return sorted;
};

/** Build military entries from parsed save data. */
export const buildMilitaryEntries = (
  countryStats: Readonly<Record<string, CountryEconomyStats>>,
  countryNames: Readonly<Record<string, string>>,
  tagToPlayers: Readonly<Record<string, string[]>>,
  countryColors: Readonly<Record<string, readonly [number, number, number]>>,
): readonly MilitaryEntry[] =>
  Object.entries(countryStats)
    .filter(([, s]) => s.regiments > 0 || s.ships > 0 || s.maxManpower > 0)
    .map(([tag, stats]) => ({
      tag,
      name: countryNames[tag] ?? tag,
      players: tagToPlayers[tag] ?? [],
      color: countryColors[tag]
        ? `rgb(${countryColors[tag][0]},${countryColors[tag][1]},${countryColors[tag][2]})`
        : "#666",
      stats,
    }));
