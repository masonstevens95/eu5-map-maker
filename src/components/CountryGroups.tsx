import type { MapChartGroup } from "../lib/types";

interface CountryGroupsProps {
  groups: Record<string, MapChartGroup>;
}

export function CountryGroups({ groups }: CountryGroupsProps) {
  return (
    <div className="country-list">
      <h3>Country Groups</h3>
      <div className="group-grid">
        {Object.entries(groups).map(([hex, group]) => (
          <div key={hex} className="group-card">
            <div className="color-swatch" style={{ backgroundColor: hex }} />
            <div className="group-info">
              <span className="group-label">{group.label}</span>
              <span className="group-count">{group.paths.length} provinces</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
