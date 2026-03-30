import type { CountryInfo } from "../lib/country-info";
import { resolveDisplayName } from "../lib/country-info";

interface Props {
  info: CountryInfo;
  countryNames: Readonly<Record<string, string>>;
  onClose: () => void;
}

export const CountryModal = ({ info, countryNames, onClose }: Props) => {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        style={{ borderColor: info.color }}
        onClick={(e) => e.stopPropagation()}
      >
        <button className="modal-close" onClick={onClose}>x</button>

        <div className="modal-header" style={{ borderBottomColor: info.color }}>
          <span className="modal-swatch" style={{ backgroundColor: info.color }} />
          <div className="modal-titles">
            <h2 className="modal-name">{info.displayName}</h2>
            <span className="modal-tag">{info.tag}</span>
          </div>
        </div>

        <div className="modal-body">
          {info.players.length > 0 ? (
            <div className="modal-field">
              <span className="modal-label">Player{info.players.length > 1 ? "s" : ""}</span>
              <span className="modal-value">{info.players.join(", ")}</span>
            </div>
          ) : (
            <div className="modal-field">
              <span className="modal-label">Player</span>
              <span className="modal-value modal-muted">AI</span>
            </div>
          )}

          <div className="modal-field">
            <span className="modal-label">Provinces</span>
            <span className="modal-value">{info.provinceCount}</span>
          </div>

          {info.overlord !== "" ? (
            <div className="modal-field">
              <span className="modal-label">Overlord</span>
              <span className="modal-value">{resolveDisplayName(info.overlord, countryNames)} ({info.overlord})</span>
            </div>
          ) : (
            /* no overlord — independent */
            <></>
          )}

          {info.subjects.length > 0 ? (
            <div className="modal-field">
              <span className="modal-label">Subjects</span>
              <div className="modal-subject-list">
                {info.subjects.map((sub) => (
                  <span key={sub} className="modal-subject-tag">
                    {resolveDisplayName(sub, countryNames)} ({sub})
                  </span>
                ))}
              </div>
            </div>
          ) : (
            /* no subjects */
            <></>
          )}
        </div>
      </div>
    </div>
  );
};
