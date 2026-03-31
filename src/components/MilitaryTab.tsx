import { useState } from "react";
import type { ParsedSave } from "../lib/types";
import { buildMilitaryEntries, sortMilitary } from "../lib/military-sort";
import type { MilitarySortMode } from "../lib/military-sort";
import { filterPlayersOnly } from "../lib/ranking-sort";
import { fmtNum } from "../lib/format";

interface Props {
  parsed: ParsedSave;
  onCountryClick: (tag: string) => void;
}

export const MilitaryTab = ({ parsed, onCountryClick }: Props) => {
  const [sortMode, setSortMode] = useState<MilitarySortMode>("regiments");
  const [playersOnly, setPlayersOnly] = useState(false);

  const allEntries = buildMilitaryEntries(
    parsed.countryStats,
    parsed.countryNames,
    parsed.tagToPlayers,
    parsed.countryColors,
  );
  const filtered = filterPlayersOnly(allEntries, playersOnly);
  const sorted = sortMilitary(filtered, sortMode);

  return (
    <div className="rankings-tab">
      <div className="rankings-controls">
        <label className="option">
          Sort:
          <select
            value={sortMode}
            onChange={(e) => setSortMode(e.target.value as MilitarySortMode)}
            className="style-select"
          >
            <option value="regiments">Regiments</option>
            <option value="ships">Ships</option>
            <option value="armyStr">Army Strength</option>
            <option value="navyStr">Navy Strength</option>
            <option value="manpower">Max Manpower</option>
            <option value="sailors">Max Sailors</option>
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
                <span className="ranking-stat-val">{fmtNum(entry.stats.regiments)}</span>
                <span className="ranking-stat-lbl">Regiments</span>
              </div>
              <div className="ranking-stat">
                <span className="ranking-stat-val">{fmtNum(entry.stats.armyStrength)}</span>
                <span className="ranking-stat-lbl">Army Str</span>
              </div>
              <div className="ranking-stat">
                <span className="ranking-stat-val">{fmtNum(entry.stats.ships)}</span>
                <span className="ranking-stat-lbl">Ships</span>
              </div>
              <div className="ranking-stat">
                <span className="ranking-stat-val">{fmtNum(entry.stats.maxManpower)}</span>
                <span className="ranking-stat-lbl">Manpower</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
