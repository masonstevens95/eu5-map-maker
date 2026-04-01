import { useState } from "react";
import type { ParsedSave, WarData, WarParticipantData, WarBattleData } from "../lib/types";

interface Props {
  parsed: ParsedSave;
}

/** Format a casus belli string for display. */
const fmtCb = (cb: string): string =>
  cb !== ""
    ? cb.replace(/^cb_/, "").replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())
    : "Unknown";

/** Resolve a tag to its display name. */
const resolveName = (tag: string, names: Readonly<Record<string, string>>): string =>
  names[tag] ?? tag;

/** Get attackers from participants. */
const attackers = (war: WarData): readonly WarParticipantData[] =>
  war.participants.filter(p => p.side === "attacker");

/** Get defenders from participants. */
const defenders = (war: WarData): readonly WarParticipantData[] =>
  war.participants.filter(p => p.side === "defender");

export const WarsTab = ({ parsed }: Props) => {
  const { wars, countryNames } = parsed;
  const [selectedWar, setSelectedWar] = useState<WarData | undefined>(undefined);

  const active = wars.filter(w => !w.isEnded);
  const ended = wars.filter(w => w.isEnded);

  return (
    <div className="rankings-tab">
      {wars.length === 0 ? (
        <div className="tab-placeholder">
          <h2>No Wars</h2>
          <p>There are no wars in this save.</p>
        </div>
      ) : (
        <div className="wars-grid">
          {active.length > 0 ? (
            <span className="war-section-label">Active Wars ({active.length})</span>
          ) : (<></>)}
          {active.map((war, i) => (
            <WarCard key={`a${i}`} war={war} countryNames={countryNames} onClick={() => setSelectedWar(war)} />
          ))}
          {ended.length > 0 ? (
            <span className="war-section-label war-section-ended">Past Wars ({ended.length})</span>
          ) : (<></>)}
          {ended.map((war, i) => (
            <WarCard key={`e${i}`} war={war} countryNames={countryNames} onClick={() => setSelectedWar(war)} />
          ))}
        </div>
      )}

      {selectedWar !== undefined ? (
        <WarModal war={selectedWar} countryNames={countryNames} onClose={() => setSelectedWar(undefined)} />
      ) : (<></>)}
    </div>
  );
};

const WarCard = ({ war, countryNames, onClick }: { war: WarData; countryNames: Readonly<Record<string, string>>; onClick: () => void }) => {
  const att = attackers(war);
  const def = defenders(war);
  const attackerName = resolveName(war.attackerTag, countryNames);
  const defenderName = resolveName(war.defenderTag, countryNames);

  return (
    <div className={`war-card${war.isEnded ? " war-card-ended" : ""}`} onClick={onClick}>
      <div className="war-header">
        <span className="war-title">{attackerName} vs {defenderName}</span>
        <span className="war-cb">{fmtCb(war.casusBelli)}</span>
      </div>
      <div className="war-sides">
        <div className="war-side war-side-attacker">
          <span className="war-side-label">Attackers ({att.length})</span>
          <span className="war-side-score">Score: {war.attackerScore}</span>
        </div>
        <div className="war-side war-side-defender">
          <span className="war-side-label">Defenders ({def.length})</span>
          <span className="war-side-score">Score: {war.defenderScore}</span>
        </div>
      </div>
      {war.battles.length > 0 ? (
        <div className="war-footer">
          {war.battles.length} battle{war.battles.length !== 1 ? "s" : ""} fought
        </div>
      ) : (<></>)}
    </div>
  );
};

const WarModal = ({ war, countryNames, onClose }: { war: WarData; countryNames: Readonly<Record<string, string>>; onClose: () => void }) => {
  const att = attackers(war);
  const def = defenders(war);
  const attackerName = resolveName(war.attackerTag, countryNames);
  const defenderName = resolveName(war.defenderTag, countryNames);

  const totalAttLosses = war.battles.reduce((sum, b) => sum + b.attackerLosses, 0);
  const totalDefLosses = war.battles.reduce((sum, b) => sum + b.defenderLosses, 0);
  const attWins = war.battles.filter(b => b.attackerWon).length;
  const defWins = war.battles.length - attWins;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ borderColor: "#c44", maxWidth: "700px" }} onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>x</button>

        <div className="modal-header" style={{ borderBottomColor: "#c44" }}>
          <div className="modal-titles">
            <h2 className="modal-name">{attackerName} vs {defenderName}</h2>
            <span className="modal-tag">{fmtCb(war.casusBelli)}{war.isEnded ? " — Ended" : ""}</span>
          </div>
        </div>

        <div className="modal-body">
          {/* Scores */}
          <div className="modal-stats-grid">
            <div className="modal-stat">
              <span className="modal-stat-value">{war.attackerScore}</span>
              <span className="modal-stat-label">Attacker Score</span>
            </div>
            <div className="modal-stat">
              <span className="modal-stat-value">{war.defenderScore}</span>
              <span className="modal-stat-label">Defender Score</span>
            </div>
            <div className="modal-stat">
              <span className="modal-stat-value">{war.battles.length}</span>
              <span className="modal-stat-label">Battles</span>
            </div>
            <div className="modal-stat">
              <span className="modal-stat-value">{attWins} / {defWins}</span>
              <span className="modal-stat-label">Wins (Att/Def)</span>
            </div>
          </div>

          {war.battles.length > 0 ? (
            <div className="modal-stats-grid">
              <div className="modal-stat">
                <span className="modal-stat-value">{totalAttLosses.toFixed(0)}</span>
                <span className="modal-stat-label">Attacker Losses</span>
              </div>
              <div className="modal-stat">
                <span className="modal-stat-value">{totalDefLosses.toFixed(0)}</span>
                <span className="modal-stat-label">Defender Losses</span>
              </div>
            </div>
          ) : (<></>)}

          <div className="modal-divider" />

          {/* Participants */}
          <div className="war-modal-sides">
            <div className="war-modal-side">
              <span className="war-side-label" style={{ color: "#c44" }}>Attackers ({att.length})</span>
              <div className="war-modal-members">
                {att.map(p => (
                  <div key={p.tag} className="war-modal-member">
                    <span className="war-modal-member-name">{resolveName(p.tag, countryNames)}</span>
                    {p.reason !== "" ? (
                      <span className="war-modal-member-reason">{p.reason}</span>
                    ) : (<></>)}
                  </div>
                ))}
              </div>
            </div>
            <div className="war-modal-side">
              <span className="war-side-label" style={{ color: "#48a" }}>Defenders ({def.length})</span>
              <div className="war-modal-members">
                {def.map(p => (
                  <div key={p.tag} className="war-modal-member">
                    <span className="war-modal-member-name">{resolveName(p.tag, countryNames)}</span>
                    {p.reason !== "" ? (
                      <span className="war-modal-member-reason">{p.reason}</span>
                    ) : (<></>)}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Battles */}
          {war.battles.length > 0 ? (
            <>
              <div className="modal-divider" />
              <div className="war-battles">
                <span className="war-side-label" style={{ color: "#aaa" }}>Battle History</span>
                {war.battles.map((b, i) => (
                  <div key={i} className={`war-battle ${b.attackerWon ? "war-battle-att-win" : "war-battle-def-win"}`}>
                    <span className="war-battle-result">{b.attackerWon ? "Attacker won" : "Defender won"}</span>
                    <span className="war-battle-losses">
                      Losses: {b.attackerLosses.toFixed(0)} / {b.defenderLosses.toFixed(0)}
                    </span>
                  </div>
                ))}
              </div>
            </>
          ) : (<></>)}
        </div>
      </div>
    </div>
  );
};
