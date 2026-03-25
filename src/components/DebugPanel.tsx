import type { ParsedSave, MapChartConfig } from "../lib/types";
import { Accordion } from "./Accordion";

interface DebugPanelProps {
  parsed: ParsedSave;
  locToProvince: Record<string, string>;
  config: MapChartConfig;
  provinceMapping: Record<string, string[]>;
}

export function DebugPanel({ parsed, locToProvince, config, provinceMapping }: DebugPanelProps) {
  return (
    <div className="debug-section">
      <h3>Debug Data</h3>

      <Accordion title={`Location Ownership (${Object.keys(parsed.countryLocations).length} countries)`}>
        <div className="debug-scroll">
          {Object.entries(parsed.countryLocations)
            .sort((a, b) => b[1].length - a[1].length)
            .map(([tag, locs]) => (
              <div key={tag} className="debug-entry">
                <strong>{tag}</strong>: {locs.length} locations
                <div className="debug-detail">
                  {locs.slice(0, 20).join(", ")}
                  {locs.length > 20 && ` ... +${locs.length - 20} more`}
                </div>
              </div>
            ))}
        </div>
      </Accordion>

      <Accordion title={`Country Colors (${Object.keys(parsed.countryColors).length})`}>
        <div className="debug-scroll color-grid">
          {Object.entries(parsed.countryColors)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([tag, [r, g, b]]) => (
              <div key={tag} className="color-entry">
                <div className="color-swatch-small" style={{ backgroundColor: `rgb(${r},${g},${b})` }} />
                <span>{tag}</span>
                <span className="color-hex">
                  #{r.toString(16).padStart(2, "0")}
                  {g.toString(16).padStart(2, "0")}
                  {b.toString(16).padStart(2, "0")}
                </span>
              </div>
            ))}
        </div>
      </Accordion>

      <Accordion title={`Players (${Object.keys(parsed.tagToPlayers).length} countries)`}>
        <div className="debug-scroll">
          {Object.entries(parsed.tagToPlayers)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([tag, players]) => (
              <div key={tag} className="debug-entry">
                <strong>{tag}</strong>: {players.join(", ")}
              </div>
            ))}
        </div>
      </Accordion>

      <Accordion title={`Vassal Relationships (${Object.values(parsed.overlordSubjects).reduce((n, s) => n + s.size, 0)} subjects)`}>
        <div className="debug-scroll">
          {Object.entries(parsed.overlordSubjects)
            .sort((a, b) => b[1].size - a[1].size)
            .map(([overlord, subjects]) => (
              <div key={overlord} className="debug-entry">
                <strong>{overlord}</strong> ({subjects.size} subjects):{" "}
                {[...subjects].sort().join(", ")}
              </div>
            ))}
        </div>
      </Accordion>

      <Accordion title={`Province Mapping (${Object.keys(provinceMapping).length} provinces)`}>
        <div className="debug-scroll">
          <p className="debug-hint">
            {Object.keys(provinceMapping).length} MapChart provinces mapping to{" "}
            {Object.keys(locToProvince).length} EU5 locations
          </p>
          {Object.entries(provinceMapping)
            .slice(0, 50)
            .map(([province, locs]) => (
              <div key={province} className="debug-entry">
                <strong>{province}</strong>: {locs.join(", ")}
              </div>
            ))}
          {Object.keys(provinceMapping).length > 50 && (
            <p className="debug-hint">... showing first 50 of {Object.keys(provinceMapping).length}</p>
          )}
        </div>
      </Accordion>

      <Accordion title="Raw Config JSON">
        <div className="debug-scroll">
          <pre className="json-pre">
            {JSON.stringify(config, null, 2).slice(0, 5000)}
            {JSON.stringify(config, null, 2).length > 5000 && "\n... (truncated)"}
          </pre>
        </div>
      </Accordion>
    </div>
  );
}
