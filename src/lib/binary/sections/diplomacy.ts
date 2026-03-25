import { TokenReader } from "../token-reader";
import { BinaryToken } from "../tokens";
import { T } from "../game-tokens";

/** Read diplomacy manager for liberty_desire (subject identification). */
export function readDiplomacy(
  r: TokenReader,
  subjectIds: Set<number>,
): void {
  while (!r.done) {
    const tok = r.peekToken();
    if (tok === BinaryToken.CLOSE) { r.readToken(); return; }

    if (tok === BinaryToken.I32 || tok === BinaryToken.U32) {
      r.readToken();
      const countryId = tok === BinaryToken.I32 ? r.readI32() : r.readU32();
      r.expectEqual();
      r.expectOpen();
      if (readDiplomacyEntry(r)) {
        subjectIds.add(countryId);
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

/** Read a single diplomacy entry, return true if it has liberty_desire. */
export function readDiplomacyEntry(r: TokenReader): boolean {
  let hasLiberty = false;
  let depth = 1;
  while (!r.done && depth > 0) {
    const tok = r.readToken();
    if (tok === BinaryToken.CLOSE) { depth--; continue; }
    if (tok === BinaryToken.OPEN) { depth++; continue; }
    if (tok === BinaryToken.EQUAL) continue;

    if (tok === T.libertyDesire && depth === 1) {
      hasLiberty = true;
      r.expectEqual();
      r.skipValue();
    } else if (depth === 1 && r.peekToken() === BinaryToken.EQUAL) {
      r.readToken();
      r.skipValue();
    }
  }
  return hasLiberty;
}
