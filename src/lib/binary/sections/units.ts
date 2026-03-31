/**
 * Unit and subunit manager readers — actual army/navy regiment counts and strength.
 *
 * Scans unit_manager to determine which units are armies vs navies (is_army flag),
 * then scans subunit_manager to sum regiment/ship counts and strength per country.
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

export interface CountryForces {
  readonly regiments: number;
  readonly ships: number;
  readonly armyStrength: number;
  readonly navyStrength: number;
}

// =============================================================================
// Token IDs
// =============================================================================

const UNIT_MGR = tokenId("unit_manager") ?? -1;
const SUBUNIT_MGR = tokenId("subunit_manager") ?? -1;
const DATABASE = tokenId("database") ?? -1;
const IS_ARMY = tokenId("is_army") ?? -1;
const OWNER = tokenId("owner") ?? -1;
const STRENGTH = tokenId("strength") ?? -1;
const UNIT = tokenId("unit") ?? -1;

// =============================================================================
// Unit manager reader — builds unit ID → isArmy map
// =============================================================================

/** Read unit_manager to determine which unit IDs are armies vs navies.
 *  Units with is_army flag present are armies; absent = navies. */
const readUnitTypes = (
  r: TokenReader,
): Record<number, boolean> => {
  const unitIsArmy: Record<number, boolean> = {};

  // Expect we're positioned right after unit_manager = {
  let d = 1;
  while (!r.done && d > 0) {
    const ft = r.readToken();
    if (ft === BinaryToken.CLOSE) { d--; continue; }
    else if (ft === BinaryToken.OPEN) { d++; continue; }
    else if (ft === BinaryToken.EQUAL) { continue; }
    else if (isValueToken(ft)) { r.skipValuePayload(ft); continue; }

    if (d === 1 && ft === DATABASE && r.peekToken() === BinaryToken.EQUAL) {
      r.readToken(); r.expectOpen();

      while (!r.done) {
        const peek = r.peekToken();
        if (peek === BinaryToken.CLOSE) { r.readToken(); break; }
        if (peek === BinaryToken.I32 || peek === BinaryToken.U32) {
          r.readToken();
          const unitId = peek === BinaryToken.I32 ? r.readI32() : r.readU32();
          r.expectEqual();
          if (!r.expectOpen()) { r.skipValue(); continue; }

          let hasIsArmy = false;
          let ed = 1;
          while (!r.done && ed > 0) {
            const eft = r.readToken();
            if (eft === BinaryToken.CLOSE) { ed--; continue; }
            else if (eft === BinaryToken.OPEN) { ed++; continue; }
            else if (eft === BinaryToken.EQUAL) { continue; }
            else if (isValueToken(eft)) { r.skipValuePayload(eft); continue; }
            if (ed === 1 && eft === IS_ARMY && r.peekToken() === BinaryToken.EQUAL) {
              hasIsArmy = true;
              r.readToken(); r.skipValue();
            } else if (ed === 1 && r.peekToken() === BinaryToken.EQUAL) {
              r.readToken(); r.skipValue();
            } else {
              /* other */
            }
          }
          unitIsArmy[unitId] = hasIsArmy;
        } else {
          r.readToken();
          if (r.peekToken() === BinaryToken.EQUAL) { r.readToken(); r.skipValue(); }
          else { /* other */ }
        }
      }
      break;
    } else if (r.peekToken() === BinaryToken.EQUAL) {
      r.readToken(); r.skipValue();
    } else {
      /* other */
    }
  }

  return unitIsArmy;
};

// =============================================================================
// Subunit manager reader — sums strength/count per owner
// =============================================================================

/** Read subunit_manager to aggregate regiment/ship counts and strength per country tag. */
const readSubunits = (
  r: TokenReader,
  data: Uint8Array,
  countryTags: Readonly<Record<number, string>>,
  unitIsArmy: Readonly<Record<number, boolean>>,
): Record<string, CountryForces> => {
  const result: Record<string, { regiments: number; ships: number; armyStr: number; navyStr: number }> = {};

  let d = 1;
  while (!r.done && d > 0) {
    const ft = r.readToken();
    if (ft === BinaryToken.CLOSE) { d--; continue; }
    else if (ft === BinaryToken.OPEN) { d++; continue; }
    else if (ft === BinaryToken.EQUAL) { continue; }
    else if (isValueToken(ft)) { r.skipValuePayload(ft); continue; }

    if (d === 1 && ft === DATABASE && r.peekToken() === BinaryToken.EQUAL) {
      r.readToken(); r.expectOpen();

      while (!r.done) {
        const peek = r.peekToken();
        if (peek === BinaryToken.CLOSE) { r.readToken(); break; }
        if (peek === BinaryToken.I32 || peek === BinaryToken.U32) {
          r.readToken();
          peek === BinaryToken.I32 ? r.readI32() : r.readU32(); // subunit id — unused
          r.expectEqual();
          if (!r.expectOpen()) { r.skipValue(); continue; }

          let owner = -1;
          let strength = 1.0;
          let unitRef = -1;
          let ed = 1;
          while (!r.done && ed > 0) {
            const eft = r.readToken();
            if (eft === BinaryToken.CLOSE) { ed--; continue; }
            else if (eft === BinaryToken.OPEN) { ed++; continue; }
            else if (eft === BinaryToken.EQUAL) { continue; }
            else if (isValueToken(eft)) { r.skipValuePayload(eft); continue; }

            if (ed === 1 && r.peekToken() === BinaryToken.EQUAL) {
              if (eft === OWNER) {
                r.readToken();
                const ct = r.readToken();
                if (ct === BinaryToken.I32) { owner = r.readI32(); }
                else if (ct === BinaryToken.U32) { owner = r.readU32(); }
                else { r.skipValuePayload(ct); }
              } else if (eft === STRENGTH) {
                r.readToken();
                const vt = r.readToken();
                if (isFixed5(vt)) {
                  const size = valuePayloadSize(vt, data, r.pos);
                  strength = readFixed5(data, r.pos, vt);
                  r.pos += size;
                } else if (vt === BinaryToken.F32) {
                  strength = r.readF32();
                } else {
                  r.skipValuePayload(vt);
                }
              } else if (eft === UNIT) {
                r.readToken();
                const ct = r.readToken();
                if (ct === BinaryToken.I32) { unitRef = r.readI32(); }
                else if (ct === BinaryToken.U32) { unitRef = r.readU32(); }
                else { r.skipValuePayload(ct); }
              } else {
                r.readToken(); r.skipValue();
              }
            } else {
              /* other */
            }
          }

          if (owner >= 0) {
            const tag = countryTags[owner] ?? "";
            if (tag !== "") {
              const isArmy = unitIsArmy[unitRef] ?? true;
              const entry = result[tag] ?? { regiments: 0, ships: 0, armyStr: 0, navyStr: 0 };
              if (isArmy) {
                result[tag] = { ...entry, regiments: entry.regiments + 1, armyStr: entry.armyStr + strength };
              } else {
                result[tag] = { ...entry, ships: entry.ships + 1, navyStr: entry.navyStr + strength };
              }
            } else {
              /* unknown owner tag */
            }
          } else {
            /* no owner */
          }
        } else {
          r.readToken();
          if (r.peekToken() === BinaryToken.EQUAL) { r.readToken(); r.skipValue(); }
          else { /* other */ }
        }
      }
      break;
    } else if (r.peekToken() === BinaryToken.EQUAL) {
      r.readToken(); r.skipValue();
    } else {
      /* other */
    }
  }

  // Convert to CountryForces
  const forces: Record<string, CountryForces> = {};
  for (const [tag, d] of Object.entries(result)) {
    forces[tag] = { regiments: d.regiments, ships: d.ships, armyStrength: d.armyStr, navyStrength: d.navyStr };
  }
  return forces;
};

// =============================================================================
// Public API
// =============================================================================

/** Scan both unit_manager and subunit_manager sections to build per-country forces.
 *  Requires byte-pattern scanning since these are top-level sections. */
export const readCountryForces = (
  data: Uint8Array,
  dynStrings: string[],
  countryTags: Readonly<Record<number, string>>,
): Record<string, CountryForces> => {
  const r = new TokenReader(data, dynStrings);

  // Pass 1: unit_manager — map unit IDs to army/navy
  let unitIsArmy: Record<number, boolean> = {};
  r.pos = 0;
  let depth = 0;
  while (!r.done) {
    const ft = r.readToken();
    if (ft === BinaryToken.CLOSE) { depth--; continue; }
    else if (ft === BinaryToken.OPEN) { depth++; continue; }
    else if (ft === BinaryToken.EQUAL) { continue; }
    else if (isValueToken(ft)) { r.skipValuePayload(ft); continue; }
    if (depth === 0 && ft === UNIT_MGR && r.peekToken() === BinaryToken.EQUAL) {
      r.readToken();
      if (r.expectOpen()) {
        unitIsArmy = readUnitTypes(r);
      }
      break;
    } else {
      /* other */
    }
  }

  // Pass 2: subunit_manager — sum regiments/ships per owner
  r.pos = 0;
  depth = 0;
  while (!r.done) {
    const ft = r.readToken();
    if (ft === BinaryToken.CLOSE) { depth--; continue; }
    else if (ft === BinaryToken.OPEN) { depth++; continue; }
    else if (ft === BinaryToken.EQUAL) { continue; }
    else if (isValueToken(ft)) { r.skipValuePayload(ft); continue; }
    if (depth === 0 && ft === SUBUNIT_MGR && r.peekToken() === BinaryToken.EQUAL) {
      r.readToken();
      if (r.expectOpen()) {
        return readSubunits(r, data, countryTags, unitIsArmy);
      } else {
        return {};
      }
    } else {
      /* other */
    }
  }

  return {};
};
