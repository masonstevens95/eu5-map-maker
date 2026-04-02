/**
 * Rankings sort and filter helpers.
 *
 * All functions are pure. No null, no exceptions, every if has an else.
 */

import type { CountryEconomyStats } from "./types";

export type RankingSortMode =
  | "rank" | "country" | "player" | "population" | "income"
  | "trade" | "treasury" | "maintenance" | "development" | "prestige" | "legitimacy";

export interface RankingEntry {
  readonly tag: string;
  readonly name: string;
  readonly players: readonly string[];
  readonly color: string;
  readonly stats: CountryEconomyStats;
}

/** Check if a country is a great power (rank 1-8). */
export const isGreatPower = (score: number): boolean =>
  score >= 1 && score <= 8;

/** Build a set of scores that appear more than once (tied ranks). */
export const findTiedScores = (entries: readonly RankingEntry[]): ReadonlySet<number> => {
  const counts: Record<number, number> = {};
  for (const e of entries) {
    if (e.stats.score > 0) {
      counts[e.stats.score] = (counts[e.stats.score] ?? 0) + 1;
    }
  }
  return new Set(
    Object.entries(counts)
      .filter(([, count]) => count > 1)
      .map(([score]) => Number(score)),
  );
};

/** Sort ranking entries by the chosen mode (descending for numeric, ascending for text). */
export const sortRankings = (
  entries: readonly RankingEntry[],
  mode: RankingSortMode,
): readonly RankingEntry[] => {
  const sorted = [...entries];
  const byNum = (fn: (s: CountryEconomyStats) => number) => (a: RankingEntry, b: RankingEntry) => {
    const diff = fn(b.stats) - fn(a.stats);
    return diff !== 0 ? diff : a.name.localeCompare(b.name);
  };
  if (mode === "rank") {
    sorted.sort((a, b) => {
      const aRank = a.stats.score > 0 ? a.stats.score : 9999;
      const bRank = b.stats.score > 0 ? b.stats.score : 9999;
      const diff = aRank - bRank;
      return diff !== 0 ? diff : a.name.localeCompare(b.name);
    });
  } else if (mode === "country") {
    sorted.sort((a, b) => a.name.localeCompare(b.name));
  } else if (mode === "player") {
    sorted.sort((a, b) => {
      const aPlayer = a.players.length > 0 ? a.players[0] : "\uffff";
      const bPlayer = b.players.length > 0 ? b.players[0] : "\uffff";
      const diff = aPlayer.localeCompare(bPlayer);
      return diff !== 0 ? diff : a.name.localeCompare(b.name);
    });
  } else if (mode === "population") { sorted.sort(byNum(s => s.population)); }
  else if (mode === "income") { sorted.sort(byNum(s => s.monthlyIncome)); }
  else if (mode === "trade") { sorted.sort(byNum(s => s.monthlyTradeValue)); }
  else if (mode === "treasury") { sorted.sort(byNum(s => s.gold)); }
  else if (mode === "maintenance") { sorted.sort(byNum(s => s.armyMaintenance + s.navyMaintenance)); }
  else if (mode === "development") { sorted.sort(byNum(s => s.totalDevelopment)); }
  else if (mode === "prestige") { sorted.sort(byNum(s => s.prestige)); }
  else if (mode === "legitimacy") { sorted.sort(byNum(s => s.legitimacy)); }
  else { /* unknown */ }
  return sorted;
};

/** Filter rankings to players only. */
export const filterPlayersOnly = (
  entries: readonly RankingEntry[],
  playersOnly: boolean,
): readonly RankingEntry[] =>
  playersOnly
    ? entries.filter((e) => e.players.length > 0)
    : entries;

/** Build ranking entries from parsed save data. */
export const buildRankingEntries = (
  countryStats: Readonly<Record<string, CountryEconomyStats>>,
  countryNames: Readonly<Record<string, string>>,
  tagToPlayers: Readonly<Record<string, string[]>>,
  countryColors: Readonly<Record<string, readonly [number, number, number]>>,
): readonly RankingEntry[] =>
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
