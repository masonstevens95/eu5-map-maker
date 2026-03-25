import { TokenReader } from "../token-reader";
import { BinaryToken, isValueToken } from "../tokens";
import { T } from "../game-tokens";

/** Read IO manager for type=loc subject relationships. */
export function readIOManager(
  r: TokenReader,
  countryTags: Record<number, string>,
  overlordSubjects: Record<string, Set<string>>,
  ioMatched: Set<string>,
): void {
  let depth = 1;
  while (!r.done && depth > 0) {
    const tok = r.readToken();
    if (tok === BinaryToken.CLOSE) { depth--; continue; }
    if (tok === BinaryToken.OPEN) { depth++; continue; }
    if (tok === BinaryToken.EQUAL) continue;

    if (tok === T.database) {
      r.expectEqual();
      r.expectOpen();
      readIOEntries(r, countryTags, overlordSubjects, ioMatched);
    } else if (r.peekToken() === BinaryToken.EQUAL) {
      r.readToken();
      r.skipValue();
    }
  }
}

/** Read all IO entries from the database block. */
export function readIOEntries(
  r: TokenReader,
  countryTags: Record<number, string>,
  overlordSubjects: Record<string, Set<string>>,
  ioMatched: Set<string>,
): void {
  while (!r.done) {
    const tok = r.peekToken();
    if (tok === BinaryToken.CLOSE) { r.readToken(); return; }

    if (tok === BinaryToken.I32 || tok === BinaryToken.U32) {
      r.readToken();
      tok === BinaryToken.I32 ? r.readI32() : r.readU32();
      r.expectEqual();
      if (r.expectOpen()) {
        readIOEntry(r, countryTags, overlordSubjects, ioMatched);
      } else {
        r.skipValue(); // non-block entry (e.g., "ID = none")
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

/** Read a single IO entry. If type=loc, record the subject relationships. */
/**
 * Read a single IO entry. Uses two-pass for reliable parsing.
 * If type is lordship (loc/autocephalous_patriarchate), records subjects.
 */
export function readIOEntry(
  r: TokenReader,
  countryTags: Record<number, string>,
  overlordSubjects: Record<string, Set<string>>,
  ioMatched: Set<string>,
): void {
  // Pass 1: find field offsets
  const startPos = r.pos;
  r.skipBlock();
  const endPos = r.pos;

  let typeOffset = -1;
  let leaderOffset = -1;
  let membersOffset = -1;

  r.pos = startPos;
  let depth = 1;
  while (r.pos < endPos && depth > 0) {
    const fieldPos = r.pos;
    const tok = r.readToken();
    if (tok === BinaryToken.CLOSE) { depth--; continue; }
    if (tok === BinaryToken.OPEN) { depth++; continue; }
    if (tok === BinaryToken.EQUAL) continue;
    if (isValueToken(tok)) { r.skipValuePayload(tok); continue; }

    if (depth === 1 && r.peekToken() === BinaryToken.EQUAL) {
      if (tok === T.type || tok === T.TYPE_ENGINE) typeOffset = fieldPos;
      else if (tok === T.leader) leaderOffset = fieldPos;
      else if (tok === T.allMembers) membersOffset = fieldPos;
      r.readToken(); // =
      r.skipValue();
    }
  }

  // Pass 2: read values
  let ioTypeName: string | null = null;
  let ioLeader: number | null = null;
  const ioMembers: number[] = [];

  if (typeOffset >= 0) {
    r.pos = typeOffset;
    r.readToken(); r.expectEqual();
    ioTypeName = r.readStringValue();
  }

  if (leaderOffset >= 0) {
    r.pos = leaderOffset;
    r.readToken(); r.expectEqual();
    ioLeader = r.readIntValue();
  }

  if (membersOffset >= 0) {
    r.pos = membersOffset;
    r.readToken(); r.expectEqual();
    r.expectOpen();
    while (!r.done && r.peekToken() !== BinaryToken.CLOSE) {
      const val = r.readIntValue();
      if (val !== null) ioMembers.push(val);
    }
    if (!r.done) r.readToken(); // }
  }

  r.pos = endPos;

  // Check for lordship IO
  const isLordship = ioTypeName === "loc" || ioTypeName === "autocephalous_patriarchate";
  if (isLordship && ioLeader !== null && countryTags[ioLeader]) {
    const leaderTag = countryTags[ioLeader];
    for (const mid of ioMembers) {
      if (mid !== ioLeader && countryTags[mid]) {
        if (!overlordSubjects[leaderTag]) overlordSubjects[leaderTag] = new Set();
        overlordSubjects[leaderTag].add(countryTags[mid]);
        ioMatched.add(countryTags[mid]);
      }
    }
  }
}
