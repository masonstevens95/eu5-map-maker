import { useState } from "react";
import type { ParsedSave } from "../lib/types";
import { buildEconomyEntries, sortEconomy } from "../lib/economy-sort";
import type { EconomySortMode } from "../lib/economy-sort";
import { filterPlayersOnly } from "../lib/ranking-sort";
import { fmtNum, fmtCurrency } from "../lib/format";

interface Props {
  parsed: ParsedSave;
  onCountryClick: (tag: string) => void;
}

export const EconomyTab = ({ parsed, onCountryClick }: Props) => {
  const [sortMode, setSortMode] = useState<EconomySortMode>("income");
  const [playersOnly, setPlayersOnly] = useState(false);

  const allEntries = buildEconomyEntries(
    parsed.countryStats,
    parsed.countryNames,
    parsed.tagToPlayers,
    parsed.countryColors,
  );
  const filtered = filterPlayersOnly(allEntries, playersOnly);
  const sorted = sortEconomy(filtered, sortMode);

  return (
    <div className="rankings-tab">
      <div className="rankings-controls">
        <label className="option">
          Sort:
          <select
            value={sortMode}
            onChange={(e) => setSortMode(e.target.value as EconomySortMode)}
            className="style-select"
          >
            <option value="income">Monthly Income</option>
            <option value="trade">Trade Value</option>
            <option value="treasury">Treasury</option>
            <option value="population">Population</option>
            <option value="maintenance">Military Cost</option>
            <option value="country">Country Name</option>
          </select>
        </label>
        <label className="option">
          <input
            type="checkbox"
            checked={playersOnly}
            onChange={(e) => setPlayersOnly(e.target.checked)}
          />
          Players only
        </label>
      </div>
      <div className="rankings-grid">
        {sorted.map((entry, i) => (
          <div
            key={entry.tag}
            className={
              `ranking-row` +
              `${entry.players.length > 0 ? " ranking-player" : ""}`
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
              <div className="ranking-stat">
                <span className="ranking-stat-val">{fmtCurrency(entry.stats.monthlyIncome)}</span>
                <span className="ranking-stat-lbl">Income</span>
              </div>
              <div className="ranking-stat">
                <span className="ranking-stat-val">{fmtCurrency(entry.stats.monthlyTradeValue)}</span>
                <span className="ranking-stat-lbl">Trade</span>
              </div>
              <div className="ranking-stat">
                <span className="ranking-stat-val">{fmtCurrency(entry.stats.gold)}</span>
                <span className="ranking-stat-lbl">Treasury</span>
              </div>
              <div className="ranking-stat">
                <span className="ranking-stat-val">{fmtNum(entry.stats.population)}</span>
                <span className="ranking-stat-lbl">Population</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
