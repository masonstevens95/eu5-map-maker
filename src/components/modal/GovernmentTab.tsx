import { Row, NumRow, fmtTitle } from "./ModalRow";
import { fmtGovType } from "../../lib/format";
import type { CountryInfo } from "../../lib/country-info";
import type { EstateData } from "../../lib/types";

/** Map raw estate_type strings to display names. */
export const fmtEstateType = (type: string): string => {
  const known: Record<string, string> = {
    estate_nobles: "Nobility",
    estate_clergy: "Clergy",
    estate_burghers: "Burghers",
    estate_peasants: "Commoners",
    estate_dhimmi: "Dhimmi",
    estate_tribes: "Tribes",
    estate_cossacks: "Cossacks",
    estate_crown: "Crown",
  };
  return known[type] ?? fmtTitle(type.replace(/^estate_/, ""));
};

export const EstatesSection = ({ estates }: { estates: readonly EstateData[] }) => {
  const active = estates.filter((e) => e.type !== "");
  if (active.length === 0) {
    return <></>;
  }
  return (
    <>
      <div className="modal-row-divider" />
      <div className="modal-section-label">Estates</div>
      <div className="estates-table">
        <div className="estates-header">
          <span>Estate</span>
          <span>Power</span>
          <span>Satisfaction</span>
          <span>Privileges</span>
        </div>
        {active.map((e) => (
          <div key={e.type} className="estates-row">
            <span>{fmtEstateType(e.type)}</span>
            <span>{e.power > 0 ? `${(e.power / 100).toFixed(1)}%` : "—"}</span>
            <span>
              {e.satisfaction > 0
                ? `${(e.satisfaction / 100).toFixed(1)}%`
                : "—"}
            </span>
            <span>
              {e.maxPrivileges > 0
                ? `${e.numPrivileges}/${e.maxPrivileges}`
                : e.numPrivileges > 0
                ? `${e.numPrivileges}`
                : "—"}
            </span>
          </div>
        ))}
      </div>
    </>
  );
};

export const GovernmentTab = ({ stats }: { stats: CountryInfo["stats"] }) => {
  // Show the government-type-specific legitimacy variant
  const legitLabel =
    stats.republicanTradition > 0
      ? "Republican Tradition"
      : stats.hordeUnity > 0
      ? "Horde Unity"
      : stats.devotion > 0
      ? "Devotion"
      : stats.tribalCohesion > 0
      ? "Tribal Cohesion"
      : "Legitimacy";
  const legitValue =
    stats.republicanTradition > 0
      ? stats.republicanTradition
      : stats.hordeUnity > 0
      ? stats.hordeUnity
      : stats.devotion > 0
      ? stats.devotion
      : stats.tribalCohesion > 0
      ? stats.tribalCohesion
      : stats.legitimacy;

  return (
    <div className="modal-rows">
      {stats.govType !== "" ? (
        <Row label="Government Type" value={fmtGovType(stats.govType)} />
      ) : (
        <></>
      )}
      {stats.governmentPower > 0 ? (
        <NumRow
          label="Government Power"
          value={stats.governmentPower / 100}
          decimals={0}
        />
      ) : (
        <></>
      )}
      {stats.diplomaticCapacity > 0 ? (
        <NumRow
          label="Diplomatic Capacity"
          value={stats.diplomaticCapacity / 100}
          decimals={0}
        />
      ) : (
        <></>
      )}
      {stats.religiousInfluence > 0 ? (
        <NumRow
          label="Religious Influence"
          value={stats.religiousInfluence / 100}
          decimals={1}
        />
      ) : (
        <></>
      )}
      {stats.karma > 0 &&
      stats.karma < 99000 &&
      stats.religion.includes("buddh") ? (
        <NumRow label="Karma" value={stats.karma / 100} decimals={1} />
      ) : (
        <></>
      )}
      {stats.purity > 0 && stats.purity !== 6000 ? (
        <NumRow label="Purity" value={stats.purity / 100} decimals={1} />
      ) : (
        <></>
      )}
      {stats.righteousness > 0 && stats.righteousness !== 9000 ? (
        <NumRow
          label="Righteousness"
          value={stats.righteousness / 100}
          decimals={1}
        />
      ) : (
        <></>
      )}
      <div className="modal-row-divider" />
      <NumRow label="Stability" value={stats.stability / 100} decimals={1} />
      {stats.stabilityInvestment > 0 ? (
        <NumRow
          label="Stability Investment"
          value={stats.stabilityInvestment / 100}
          decimals={1}
        />
      ) : (
        <></>
      )}
      <div className="modal-row-divider" />
      <NumRow label={legitLabel} value={legitValue / 100} decimals={1} />
      <div className="modal-row-divider" />
      <NumRow label="Prestige" value={stats.prestige / 100} decimals={1} />
      {stats.monthlyPrestige !== 0 ? (
        <NumRow
          label="Monthly Prestige"
          value={stats.monthlyPrestige / 100}
          decimals={2}
        />
      ) : (
        <></>
      )}
      {stats.prestigeDecay !== 0 ? (
        <NumRow
          label="Prestige Decay"
          value={stats.prestigeDecay / 100}
          decimals={2}
        />
      ) : (
        <></>
      )}
      <div className="modal-row-divider" />
      {stats.powerProjection > 0 ? (
        <NumRow
          label="Power Projection"
          value={stats.powerProjection / 100}
          decimals={1}
        />
      ) : (
        <></>
      )}
      {stats.warExhaustion > 0 ? (
        <NumRow
          label="War Exhaustion"
          value={stats.warExhaustion / 100}
          decimals={1}
        />
      ) : (
        <></>
      )}
      <EstatesSection estates={stats.estates} />
    </div>
  );
};
