import { TokenReader } from "../token-reader";
import { BinaryToken, isValueToken } from "../tokens";
import { T } from "../game-tokens";
import type { RGB } from "../../types";

/** Read countries > tags + database. */
export function readCountries(
  r: TokenReader,
  countryTags: Record<number, string>,
  countryColors: Record<string, RGB>,
  countryCapitals: Record<number, number>,
  overlordCandidates: Set<string>,
): void {
  let depth = 1;
  while (!r.done && depth > 0) {
    const tok = r.readToken();
    if (tok === BinaryToken.CLOSE) { depth--; continue; }
    if (tok === BinaryToken.OPEN) { depth++; continue; }
    if (tok === BinaryToken.EQUAL) continue;

    if (tok === T.tags) {
      r.expectEqual();
      r.expectOpen();
      readCountryTags(r, countryTags);
    } else if (tok === T.database) {
      r.expectEqual();
      r.expectOpen();
      readCountryDatabase(r, countryColors, countryCapitals, overlordCandidates);
    } else if (r.peekToken() === BinaryToken.EQUAL) {
      r.readToken();
      r.skipValue();
    }
  }
}

/** Read ID=TAG entries from the tags block. */
export function readCountryTags(
  r: TokenReader,
  countryTags: Record<number, string>,
): void {
  while (!r.done) {
    const tok = r.peekToken();
    if (tok === BinaryToken.CLOSE) { r.readToken(); return; }

    if (tok === BinaryToken.I32 || tok === BinaryToken.U32) {
      r.readToken();
      const id = tok === BinaryToken.I32 ? r.readI32() : r.readU32();
      r.expectEqual();
      const tag = r.readStringValue();
      if (tag) countryTags[id] = tag;
    } else {
      r.readToken();
      if (r.peekToken() === BinaryToken.EQUAL) {
        r.readToken();
        r.skipValue();
      }
    }
  }
}

/** Read country entries from database. */
export function readCountryDatabase(
  r: TokenReader,
  countryColors: Record<string, RGB>,
  countryCapitals: Record<number, number>,
  overlordCandidates: Set<string>,
): void {
  while (!r.done) {
    const tok = r.peekToken();
    if (tok === BinaryToken.CLOSE) { r.readToken(); return; }

    if (tok === BinaryToken.I32 || tok === BinaryToken.U32) {
      r.readToken();
      const countryId = tok === BinaryToken.I32 ? r.readI32() : r.readU32();
      r.expectEqual();
      if (r.expectOpen()) {
        readCountryEntry(r, countryId, countryColors, countryCapitals, overlordCandidates);
      } else {
        // Not a block entry (e.g., "234881085 = none") — skip the value
        r.skipValue();
      }
    } else {
      r.readToken();
      if (r.peekToken() === BinaryToken.EQUAL) {
        r.readToken();
        r.skipValue();
      }
    }
  }
}

/** Read a single country entry for flag, color, capital, subject_tax. */
export function readCountryEntry(
  r: TokenReader,
  countryId: number,
  countryColors: Record<string, RGB>,
  countryCapitals: Record<number, number>,
  overlordCandidates: Set<string>,
): void {
  let currentFlag: string | null = null;
  let depth = 1;

  while (!r.done && depth > 0) {
    const tok = r.readToken();
    if (tok === BinaryToken.CLOSE) { depth--; continue; }
    if (tok === BinaryToken.OPEN) { depth++; continue; }
    if (tok === BinaryToken.EQUAL) continue;
    if (isValueToken(tok)) { r.skipValuePayload(tok); continue; }

    if (depth !== 1) continue;

    if (tok === T.flag) {
      r.expectEqual();
      currentFlag = r.readStringValue();
    } else if ((tok === T.COLOR || tok === T.mapColor) && currentFlag) {
      r.expectEqual();
      const colorMarker = r.readToken();
      if (colorMarker === T.RGB && r.peekToken() === BinaryToken.OPEN) {
        r.readToken(); // {
        const rv = r.readIntValue();
        const gv = r.readIntValue();
        const bv = r.readIntValue();
        if (rv !== null && gv !== null && bv !== null) {
          countryColors[currentFlag] = [rv, gv, bv];
        }
        while (!r.done && r.peekToken() !== BinaryToken.CLOSE) r.skipValue();
        if (!r.done) r.readToken(); // }
      }
    } else if (tok === T.capital) {
      r.expectEqual();
      const cap = r.readIntValue();
      if (cap !== null) countryCapitals[countryId] = cap;
    } else if (tok === T.subjectTax && currentFlag) {
      r.expectEqual();
      const val = r.readFloatValue();
      if (val !== null && val > 0) overlordCandidates.add(currentFlag);
    } else if (r.peekToken() === BinaryToken.EQUAL) {
      r.readToken();
      r.skipValue();
    }
  }
}
