import { Row, NumRow, fmtTitle } from "./ModalRow";
import { resolveDisplayName } from "../../lib/country-info";
import type { CountryInfo } from "../../lib/country-info";
import { fmtGovType, fmtLanguage } from "../../lib/format";
import { isGreatPower } from "../../lib/ranking-sort";

export const OverviewTab = ({
  info,
  stats,
  countryNames,
  subjectsOpen,
  setSubjectsOpen,
}: {
  info: CountryInfo;
  stats: CountryInfo["stats"];
  countryNames: Readonly<Record<string, string>>;
  subjectsOpen: boolean;
  setSubjectsOpen: (v: boolean) => void;
}) => (
  <div className="modal-rows">
    <Row
      label="Player"
      value={info.players.length > 0 ? info.players.join(", ") : "AI"}
      muted={info.players.length === 0}
    />
    {stats.govType !== "" ? (
      <Row label="Government" value={fmtGovType(stats.govType)} />
    ) : (
      <></>
    )}
    {stats.courtLanguage !== "" ? (
      <Row label="Language" value={fmtLanguage(stats.courtLanguage)} />
    ) : (
      <></>
    )}
    {stats.primaryCulture !== "" ? (
      <Row label="Culture" value={fmtTitle(stats.primaryCulture)} />
    ) : (
      <></>
    )}
    {stats.religion !== "" ? (
      <Row label="Religion" value={fmtTitle(stats.religion)} />
    ) : (
      <></>
    )}
    {stats.score > 0 ? (
      <Row
        label="Rank"
        value={`#${stats.score}${
          isGreatPower(stats.score) ? " (Great Power)" : ""
        }`}
      />
    ) : (
      <></>
    )}
    <NumRow label="Provinces" value={info.provinceCount} />
    {stats.numProvinces > 0 ? (
      <NumRow label="Provinces (parsed)" value={stats.numProvinces} />
    ) : (
      <></>
    )}
    {stats.totalDevelopment > 0 ? (
      <NumRow
        label="Total Development"
        value={stats.totalDevelopment}
        decimals={0}
      />
    ) : (
      <></>
    )}
    <NumRow label="Population" value={stats.population} />

    {info.overlord !== "" ? (
      <Row
        label="Overlord"
        value={`${resolveDisplayName(info.overlord, countryNames)} (${
          info.overlord
        })`}
      />
    ) : (
      <></>
    )}

    {info.subjects.length > 0 ? (
      <div className="modal-row">
        <span
          className="modal-row-label modal-collapsible"
          onClick={() => setSubjectsOpen(!subjectsOpen)}
        >
          {subjectsOpen ? "▾" : "▸"} Subjects ({info.subjects.length})
        </span>
        {subjectsOpen ? (
          <div className="modal-subject-list">
            {info.subjects.map((sub) => (
              <span key={sub} className="modal-subject-tag">
                {resolveDisplayName(sub, countryNames)} ({sub})
              </span>
            ))}
          </div>
        ) : (
          <></>
        )}
      </div>
    ) : (
      <></>
    )}
  </div>
);
