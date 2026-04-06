import { Row, NumRow } from "./ModalRow";
import { resolveDisplayName } from "../../lib/country-info";
import type { CountryInfo } from "../../lib/country-info";
import type { RoyalMarriageData, ActiveCBData } from "../../lib/types";

export const DiplomacyTab = ({
  info,
  stats,
  countryNames,
  royalMarriages,
  activeCBs,
}: {
  info: CountryInfo;
  stats: CountryInfo["stats"];
  countryNames: Readonly<Record<string, string>>;
  royalMarriages: readonly RoyalMarriageData[];
  activeCBs: readonly ActiveCBData[];
}) => {
  const tag = info.tag;
  const myMarriages = royalMarriages.filter(
    (rm) => rm.countryATag === tag || rm.countryBTag === tag
  );
  const myCBsHeld = activeCBs.filter((cb) => cb.holderTag === tag);
  const myCBsAgainst = activeCBs.filter((cb) => cb.targetTag === tag);

  return (
    <div className="modal-rows">
      {stats.greatPowerScore > 0 ? (
        <NumRow
          label="Great Power Score"
          value={stats.greatPowerScore}
          decimals={0}
        />
      ) : (
        <></>
      )}
      {stats.diplomaticReputation !== 0 ? (
        <NumRow
          label="Diplomatic Reputation"
          value={stats.diplomaticReputation}
          decimals={1}
        />
      ) : (
        <></>
      )}
      {stats.powerProjection > 0 ? (
        <NumRow
          label="Power Projection"
          value={stats.powerProjection}
          decimals={1}
        />
      ) : (
        <></>
      )}
      <NumRow label="Allies" value={stats.numAllies} decimals={0} />
      {info.overlord !== "" ? (
        <NumRow
          label="Liberty Desire"
          value={stats.libertyDesire}
          decimals={1}
        />
      ) : (
        <></>
      )}
      {info.subjects.length > 0 ? (
        <Row label="Subjects" value={String(info.subjects.length)} />
      ) : (
        <></>
      )}

      {myMarriages.length > 0 ? (
        <>
          <div className="modal-row-divider" />
          <div className="modal-section-label">
            Royal Marriages ({myMarriages.length})
          </div>
          {myMarriages.map((rm, i) => {
            const otherTag =
              rm.countryATag === tag ? rm.countryBTag : rm.countryATag;
            return (
              <div key={`rm${i}`} className="modal-row">
                <span className="modal-row-label">
                  {resolveDisplayName(otherTag, countryNames)}
                </span>
                <span className="modal-row-value modal-muted">{otherTag}</span>
              </div>
            );
          })}
        </>
      ) : (
        <></>
      )}

      {myCBsHeld.length > 0 ? (
        <>
          <div className="modal-row-divider" />
          <div className="modal-section-label">
            Casus Belli Held ({myCBsHeld.length})
          </div>
          {myCBsHeld.map((cb, i) => (
            <div key={`cbh${i}`} className="modal-row">
              <span className="modal-row-label">
                vs {resolveDisplayName(cb.targetTag, countryNames)}
              </span>
              <span className="modal-row-value modal-muted">
                {cb.targetTag}
              </span>
            </div>
          ))}
        </>
      ) : (
        <></>
      )}

      {myCBsAgainst.length > 0 ? (
        <>
          <div className="modal-row-divider" />
          <div className="modal-section-label">
            Casus Belli Against ({myCBsAgainst.length})
          </div>
          {myCBsAgainst.map((cb, i) => (
            <div key={`cba${i}`} className="modal-row">
              <span className="modal-row-label">
                by {resolveDisplayName(cb.holderTag, countryNames)}
              </span>
              <span className="modal-row-value modal-muted">
                {cb.holderTag}
              </span>
            </div>
          ))}
        </>
      ) : (
        <></>
      )}
    </div>
  );
};
