import { useState } from "react";
import type { ParsedSave, CountryEconomyStats } from "../lib/types";
import { buildRankingEntries, sortRankings, filterPlayersOnly, isGreatPower } from "../lib/ranking-sort";
import type { RankingSortMode } from "../lib/ranking-sort";
import { fmtNum, fmtCurrency } from "../lib/format";

interface Props {
  parsed: ParsedSave;
  onCountryClick: (tag: string) => void;
}

interface StatCol {
  readonly sortMode: RankingSortMode;
  readonly label: string;
  readonly fmt: (s: CountryEconomyStats) => string;
}

const ALL_COLUMNS: readonly StatCol[] = [
  { sortMode: "rank", label: "Rank", fmt: s => s.score > 0 ? `#${s.score}` : "—" },
  { sortMode: "population", label: "Population", fmt: s => fmtNum(s.population) },
  { sortMode: "income", label: "Income", fmt: s => fmtCurrency(s.monthlyIncome) },
  { sortMode: "trade", label: "Trade", fmt: s => fmtCurrency(s.monthlyTradeValue) },
  { sortMode: "treasury", label: "Treasury", fmt: s => fmtCurrency(s.gold) },
  { sortMode: "maintenance", label: "Mil. Cost", fmt: s => fmtCurrency(s.armyMaintenance + s.navyMaintenance) },
  { sortMode: "development", label: "Development", fmt: s => fmtNum(s.totalDevelopment) },
  { sortMode: "prestige", label: "Prestige", fmt: s => s.prestige.toFixed(1) },
  { sortMode: "legitimacy", label: "Legitimacy", fmt: s => s.legitimacy.toFixed(1) },
];

/** For text-based sorts (country/player), show rank as the active column. */
const activeSortMode = (mode: RankingSortMode): RankingSortMode =>
  mode === "country" || mode === "player" ? "rank" : mode;

export const RankingsTab = ({ parsed, onCountryClick }: Props) => {
  const [sortMode, setSortMode] = useState<RankingSortMode>("rank");
  const [playersOnly, setPlayersOnly] = useState(false);
  const [highlightGP, setHighlightGP] = useState(true);
  const [showAll, setShowAll] = useState(false);

  const allEntries = buildRankingEntries(
    parsed.countryStats,
    parsed.countryNames,
    parsed.tagToPlayers,
    parsed.countryColors,
  );
  const filtered = filterPlayersOnly(allEntries, playersOnly);
  const sorted = sortRankings(filtered, sortMode);

  const active = activeSortMode(sortMode);
  const visibleCols = showAll
    ? ALL_COLUMNS
    : ALL_COLUMNS.filter(c => c.sortMode === active);

  return (
    <div className="rankings-tab">
      <div className="rankings-controls">
        <label className="option">
          Sort:
          <select
            value={sortMode}
            onChange={(e) => setSortMode(e.target.value as RankingSortMode)}
            className="style-select"
          >
            <optgroup label="General">
              <option value="rank">Rank</option>
              <option value="country">Country Name</option>
              <option value="player">Player Name</option>
              <option value="population">Population</option>
            </optgroup>
            <optgroup label="Economy">
              <option value="income">Monthly Income</option>
              <option value="trade">Trade Value</option>
              <option value="treasury">Treasury</option>
              <option value="maintenance">Military Cost</option>
              <option value="development">Development</option>
            </optgroup>
            <optgroup label="Politics">
              <option value="prestige">Prestige</option>
              <option value="legitimacy">Legitimacy</option>
            </optgroup>
          </select>
        </label>
        <label className="option">
          <input type="checkbox" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} />
          Show all values
        </label>
        <label className="option">
          <input type="checkbox" checked={playersOnly} onChange={(e) => setPlayersOnly(e.target.checked)} />
          Players only
        </label>
        <label className="option">
          <input type="checkbox" checked={highlightGP} onChange={(e) => setHighlightGP(e.target.checked)} />
          Highlight Great Powers
        </label>
      </div>
      <div className="rankings-grid">
        {sorted.map((entry, i) => (
          <div
            key={entry.tag}
            className={
              `ranking-row` +
              `${entry.players.length > 0 ? " ranking-player" : ""}` +
              `${highlightGP && isGreatPower(entry.stats.score) ? " ranking-gp" : ""}`
            }
            style={{ borderLeftColor: entry.color }}
            onClick={() => onCountryClick(entry.tag)}
          >
            <span className="ranking-pos">{i + 1}</span>
            <div className="ranking-info">
              <span className="ranking-name">{entry.name}</span>
              {entry.players.length > 0 ? (
                <span className="ranking-player-name">{entry.players.join(", ")}</span>
              ) : (
                <span className="ranking-ai">AI</span>
              )}
            </div>
            <div className="ranking-stats">
              {visibleCols.map(col => (
                <div key={col.sortMode} className={`ranking-stat${col.sortMode === active ? " ranking-stat-active" : ""}`}>
                  <span className="ranking-stat-val">{col.fmt(entry.stats)}</span>
                  <span className="ranking-stat-lbl">{col.label}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
