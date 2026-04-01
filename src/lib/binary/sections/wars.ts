/**
 * War manager reader — active wars with participants, scores, and battles.
 *
 * All functions are pure arrow expressions with immutable variables.
 * No null, no exceptions, every if has an else.
 */

import { TokenReader } from "../token-reader";
import { BinaryToken, isValueToken, valuePayloadSize } from "../tokens";
import { tokenId } from "../token-names";
import { isFixed5, readFixed5 } from "./fixed5";

// =============================================================================
// Types
// =============================================================================

export interface WarParticipant {
  readonly country: number;
  readonly side: "attacker" | "defender";
  readonly reason: string;
}

export interface WarBattle {
  readonly location: number;
  readonly date: number;
  readonly attackerWon: boolean;
  readonly attackerLosses: number;
  readonly defenderLosses: number;
}

export interface War {
  readonly attackerId: number;
  readonly defenderId: number;
  readonly casusBelli: string;
  readonly startDate: number;
  readonly endDate: number;
  readonly isEnded: boolean;
  readonly attackerScore: number;
  readonly defenderScore: number;
  readonly participants: readonly WarParticipant[];
  readonly battles: readonly WarBattle[];
}

// =============================================================================
// Token IDs
// =============================================================================

const WAR_MGR = tokenId("war_manager") ?? -1;
const DATABASE = tokenId("database") ?? -1;
const ALL = tokenId("all") ?? -1;
const COUNTRY = tokenId("country") ?? -1;
const SIDE = 0x33; // "side" engine token
const REASON = tokenId("reason") ?? -1;
const ORIGINAL_ATTACKER = tokenId("original_attacker") ?? -1;
const ORIGINAL_ATTACKER_TARGET = tokenId("original_attacker_target") ?? -1;
const CASUS_BELLI = tokenId("casus_belli") ?? -1;
const START_DATE = tokenId("start_date") ?? -1;
const END_DATE = tokenId("end_date") ?? -1;
const PREVIOUS = tokenId("previous") ?? -1;
const ATTACKER_SCORE = tokenId("attacker_score") ?? -1;
const DEFENDER_SCORE = tokenId("defender_score") ?? -1;
const BATTLE = tokenId("battle") ?? -1;
const TAKE_PROVINCE = tokenId("take_province") ?? -1;
const LOCATION = tokenId("location") ?? -1;
const DATE = tokenId("date") ?? -1;
const RESULT = tokenId("result") ?? -1;
const ATTACKER = tokenId("attacker") ?? -1;
const DEFENDER = tokenId("defender") ?? -1;
const LOSSES = tokenId("losses") ?? -1;

// =============================================================================
// Readers
// =============================================================================

/** Read losses from a battle side: sum all FIXED5 values in the losses block. */
const readBattleLosses = (r: TokenReader, data: Uint8Array): number => {
  let total = 0;
  let d = 1;
  while (!r.done && d > 0) {
    const ft = r.readToken();
    if (ft === BinaryToken.CLOSE) { d--; continue; }
    else if (ft === BinaryToken.OPEN) { d++; continue; }
    else if (ft === BinaryToken.EQUAL) { continue; }
    else if (isFixed5(ft)) {
      const size = valuePayloadSize(ft, data, r.pos);
      total += readFixed5(data, r.pos, ft);
      r.pos += size;
    } else if (isValueToken(ft)) { r.skipValuePayload(ft); continue; }
    else if (r.peekToken() === BinaryToken.EQUAL) { r.readToken(); r.skipValue(); }
    else { /* bare token */ }
  }
  return total;
};

/** Read a battle block. */
const readBattle = (r: TokenReader, data: Uint8Array): WarBattle => {
  let location = 0, date = 0, attackerWon = true;
  let attackerLosses = 0, defenderLosses = 0;
  let d = 1;
  while (!r.done && d > 0) {
    const ft = r.readToken();
    if (ft === BinaryToken.CLOSE) { d--; continue; }
    else if (ft === BinaryToken.OPEN) { d++; continue; }
    else if (ft === BinaryToken.EQUAL) { continue; }
    else if (isValueToken(ft)) { r.skipValuePayload(ft); continue; }
    if (d === 1 && r.peekToken() === BinaryToken.EQUAL) {
      if (ft === LOCATION) { r.readToken(); const vt = r.readToken(); if (vt === BinaryToken.I32) location = r.readI32(); else if (vt === BinaryToken.U32) location = r.readU32(); else r.skipValuePayload(vt); }
      else if (ft === DATE) { r.readToken(); const vt = r.readToken(); if (vt === BinaryToken.I32) date = r.readI32(); else if (vt === BinaryToken.U32) date = r.readU32(); else r.skipValuePayload(vt); }
      else if (ft === RESULT) { r.readToken(); const vt = r.readToken(); if (vt === BinaryToken.BOOL) attackerWon = r.readBool(); else r.skipValuePayload(vt); }
      else if (ft === ATTACKER) {
        r.readToken();
        if (r.expectOpen()) {
          // Find losses inside attacker block
          let ad = 1;
          while (!r.done && ad > 0) {
            const aft = r.readToken();
            if (aft === BinaryToken.CLOSE) { ad--; continue; }
            else if (aft === BinaryToken.OPEN) { ad++; continue; }
            else if (aft === BinaryToken.EQUAL) { continue; }
            else if (isValueToken(aft)) { r.skipValuePayload(aft); continue; }
            if (ad === 1 && aft === LOSSES && r.peekToken() === BinaryToken.EQUAL) {
              r.readToken();
              if (r.expectOpen()) { attackerLosses = readBattleLosses(r, data); }
              else { r.skipValue(); }
            } else if (r.peekToken() === BinaryToken.EQUAL) { r.readToken(); r.skipValue(); }
            else { /* bare */ }
          }
        }
      } else if (ft === DEFENDER) {
        r.readToken();
        if (r.expectOpen()) {
          let dd2 = 1;
          while (!r.done && dd2 > 0) {
            const dft = r.readToken();
            if (dft === BinaryToken.CLOSE) { dd2--; continue; }
            else if (dft === BinaryToken.OPEN) { dd2++; continue; }
            else if (dft === BinaryToken.EQUAL) { continue; }
            else if (isValueToken(dft)) { r.skipValuePayload(dft); continue; }
            if (dd2 === 1 && dft === LOSSES && r.peekToken() === BinaryToken.EQUAL) {
              r.readToken();
              if (r.expectOpen()) { defenderLosses = readBattleLosses(r, data); }
              else { r.skipValue(); }
            } else if (r.peekToken() === BinaryToken.EQUAL) { r.readToken(); r.skipValue(); }
            else { /* bare */ }
          }
        }
      } else { r.readToken(); r.skipValue(); }
    } else { /* other */ }
  }
  return { location, date, attackerWon, attackerLosses, defenderLosses };
};

/** Read participants from the "all" block.
 *  Structure: all = { { country=X history={ request={ side="Attacker" reason="Instigator" } } } { ... } } */
const readParticipants = (r: TokenReader): WarParticipant[] => {
  const participants: WarParticipant[] = [];
  // We're inside the "all" block. Each { ... } is a participant.
  let d = 1;
  while (!r.done && d > 0) {
    const ft = r.readToken();
    if (ft === BinaryToken.CLOSE) { d--; continue; }
    else if (ft === BinaryToken.OPEN) {
      d++;
      if (d === 2) {
        // Entering a participant entry — scan its entire subtree
        let country = -1;
        let side: "attacker" | "defender" = "attacker";
        let reason = "";
        let pd = 1;
        while (!r.done && pd > 0) {
          const pft = r.readToken();
          if (pft === BinaryToken.CLOSE) { pd--; continue; }
          else if (pft === BinaryToken.OPEN) { pd++; continue; }
          else if (pft === BinaryToken.EQUAL) { continue; }
          else if (isValueToken(pft)) { r.skipValuePayload(pft); continue; }
          // Check for fields at any depth inside this participant
          if (r.peekToken() === BinaryToken.EQUAL) {
            if (pft === COUNTRY && pd === 1) {
              r.readToken();
              const vt = r.readToken();
              if (vt === BinaryToken.I32) { country = r.readI32(); }
              else if (vt === BinaryToken.U32) { country = r.readU32(); }
              else { r.skipValuePayload(vt); }
            } else if (pft === SIDE) {
              r.readToken();
              const sv = r.readStringValue();
              if (sv !== null) { side = sv.toLowerCase().startsWith("d") ? "defender" : "attacker"; }
              else { r.skipValue(); }
            } else if (pft === REASON && reason === "") {
              r.readToken();
              const sv = r.readStringValue();
              if (sv !== null) { reason = sv; }
              else { r.skipValue(); }
            } else {
              r.readToken();
              // Don't skipValue for blocks — descend into them to find side/reason
              if (r.peekToken() !== BinaryToken.OPEN) { r.skipValue(); }
              else { /* let the OPEN be consumed by the main loop */ }
            }
          } else { /* bare token */ }
        }
        if (country >= 0) {
          participants.push({ country, side, reason });
        }
        d--; // consumed the close
      }
      continue;
    }
    else if (ft === BinaryToken.EQUAL) { continue; }
    else if (isValueToken(ft)) { r.skipValuePayload(ft); continue; }
    if (r.peekToken() === BinaryToken.EQUAL) { r.readToken(); r.skipValue(); }
    else { /* bare */ }
  }
  return participants;
};

/** Read all active wars from war_manager > database. */
export const readWars = (
  data: Uint8Array,
  dynStrings: string[],
): War[] => {
  const r = new TokenReader(data, dynStrings);
  const wars: War[] = [];

  // Find war_manager
  r.pos = 0;
  let depth = 0;
  while (!r.done) {
    const ft = r.readToken();
    if (ft === BinaryToken.CLOSE) { depth--; continue; }
    else if (ft === BinaryToken.OPEN) { depth++; continue; }
    else if (ft === BinaryToken.EQUAL) { continue; }
    else if (isValueToken(ft)) { r.skipValuePayload(ft); continue; }
    if (depth === 0 && ft === WAR_MGR && r.peekToken() === BinaryToken.EQUAL) {
      r.readToken(); r.readToken(); // = {
      let d = 1;
      while (!r.done && d > 0) {
        const ft2 = r.readToken();
        if (ft2 === BinaryToken.CLOSE) { d--; continue; }
        else if (ft2 === BinaryToken.OPEN) { d++; continue; }
        else if (ft2 === BinaryToken.EQUAL) { continue; }
        else if (isValueToken(ft2)) { r.skipValuePayload(ft2); continue; }
        if (d === 1 && ft2 === DATABASE && r.peekToken() === BinaryToken.EQUAL) {
          r.readToken(); r.readToken(); // = {
          // Read entries: id { ... } or id none
          while (!r.done) {
            const peek = r.peekToken();
            if (peek === BinaryToken.CLOSE) { r.readToken(); break; }
            if (peek === BinaryToken.I32 || peek === BinaryToken.U32) {
              r.readToken();
              peek === BinaryToken.I32 ? r.readI32() : r.readU32();
              // Consume = between id and value
              if (r.peekToken() === BinaryToken.EQUAL) { r.readToken(); }
              // Check if { ... } (active war) or "none" (ended war)
              if (r.peekToken() === BinaryToken.OPEN) {
                r.readToken(); // {
                let attackerId = -1, defenderId = -1, casusBelli = "";
                let startDate = 0, endDate = 0, isEnded = false;
                let attackerScore = 0, defenderScore = 0;
                let participants: WarParticipant[] = [];
                const battles: WarBattle[] = [];
                let wd = 1;
                while (!r.done && wd > 0) {
                  const wft = r.readToken();
                  if (wft === BinaryToken.CLOSE) { wd--; continue; }
                  else if (wft === BinaryToken.OPEN) { wd++; continue; }
                  else if (wft === BinaryToken.EQUAL) { continue; }
                  else if (isValueToken(wft)) { r.skipValuePayload(wft); continue; }
                  if (wd === 1 && r.peekToken() === BinaryToken.EQUAL) {
                    if (wft === ALL) { r.readToken(); if (r.expectOpen()) { participants = readParticipants(r); } else { r.skipValue(); } }
                    else if (wft === ORIGINAL_ATTACKER) { r.readToken(); const vt = r.readToken(); if (vt === BinaryToken.I32) attackerId = r.readI32(); else if (vt === BinaryToken.U32) attackerId = r.readU32(); else r.skipValuePayload(vt); }
                    else if (wft === ORIGINAL_ATTACKER_TARGET) { r.readToken(); const vt = r.readToken(); if (vt === BinaryToken.I32) defenderId = r.readI32(); else if (vt === BinaryToken.U32) defenderId = r.readU32(); else r.skipValuePayload(vt); }
                    else if (wft === ATTACKER_SCORE) { r.readToken(); const vt = r.readToken(); if (isFixed5(vt)) { const sz = valuePayloadSize(vt, data, r.pos); attackerScore = readFixed5(data, r.pos, vt); r.pos += sz; } else if (vt === BinaryToken.I32) attackerScore = r.readI32(); else if (vt === BinaryToken.U32) attackerScore = r.readU32(); else r.skipValuePayload(vt); }
                    else if (wft === DEFENDER_SCORE) { r.readToken(); const vt = r.readToken(); if (isFixed5(vt)) { const sz = valuePayloadSize(vt, data, r.pos); defenderScore = readFixed5(data, r.pos, vt); r.pos += sz; } else if (vt === BinaryToken.I32) defenderScore = r.readI32(); else if (vt === BinaryToken.U32) defenderScore = r.readU32(); else r.skipValuePayload(vt); }
                    else if (wft === START_DATE) { r.readToken(); const vt = r.readToken(); if (vt === BinaryToken.I32) startDate = r.readI32(); else if (vt === BinaryToken.U32) startDate = r.readU32(); else r.skipValuePayload(vt); }
                    else if (wft === END_DATE) { r.readToken(); const vt = r.readToken(); if (vt === BinaryToken.I32) endDate = r.readI32(); else if (vt === BinaryToken.U32) endDate = r.readU32(); else r.skipValuePayload(vt); }
                    else if (wft === PREVIOUS) { isEnded = true; r.readToken(); r.skipValue(); }
                    else if (wft === BATTLE) { r.readToken(); if (r.expectOpen()) { battles.push(readBattle(r, data)); } else { r.skipValue(); } }
                    else if (wft === TAKE_PROVINCE) {
                      r.readToken();
                      if (r.expectOpen()) {
                        let tpd = 1;
                        while (!r.done && tpd > 0) {
                          const tft = r.readToken();
                          if (tft === BinaryToken.CLOSE) { tpd--; continue; }
                          else if (tft === BinaryToken.OPEN) { tpd++; continue; }
                          else if (tft === BinaryToken.EQUAL) { continue; }
                          else if (isValueToken(tft)) { r.skipValuePayload(tft); continue; }
                          if (tpd === 1 && tft === CASUS_BELLI && r.peekToken() === BinaryToken.EQUAL) {
                            r.readToken();
                            const sv = r.readStringValue();
                            if (sv !== null) { casusBelli = sv; }
                            else { r.skipValue(); }
                          } else if (r.peekToken() === BinaryToken.EQUAL) { r.readToken(); r.skipValue(); }
                          else { /* bare */ }
                        }
                      } else { r.skipValue(); }
                    }
                    else { r.readToken(); r.skipValue(); }
                  } else { /* bare */ }
                }
                if (attackerId >= 0) {
                  wars.push({ attackerId, defenderId, casusBelli, startDate, endDate, isEnded, attackerScore, defenderScore, participants, battles });
                }
              } else {
                // "none" or other bare token — consume it
                r.readToken();
              }
            } else {
              r.readToken();
              if (r.peekToken() === BinaryToken.EQUAL) { r.readToken(); r.skipValue(); }
            }
          }
          break;
        } else if (r.peekToken() === BinaryToken.EQUAL) { r.readToken(); r.skipValue(); }
      }
      break;
    }
  }
  return wars;
};
