import { TokenReader } from "../token-reader";
import { BinaryToken } from "../tokens";
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
      r.expectOpen();
      readIOEntry(r, countryTags, overlordSubjects, ioMatched);
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
export function readIOEntry(
  r: TokenReader,
  countryTags: Record<number, string>,
  overlordSubjects: Record<string, Set<string>>,
  ioMatched: Set<string>,
): void {
  let ioType: number | null = null;
  let ioLeader: number | null = null;
  let ioMembers: number[] = [];
  let depth = 1;

  while (!r.done && depth > 0) {
    const tok = r.readToken();
    if (tok === BinaryToken.CLOSE) { depth--; continue; }
    if (tok === BinaryToken.OPEN) { depth++; continue; }
    if (tok === BinaryToken.EQUAL) continue;
    if (depth !== 1) continue;

    if (tok === T.type || tok === T.TYPE_ENGINE) {
      r.expectEqual();
      ioType = r.readToken();
    } else if (tok === T.leader) {
      r.expectEqual();
      ioLeader = r.readIntValue();
    } else if (tok === T.allMembers) {
      r.expectEqual();
      r.expectOpen();
      while (!r.done && r.peekToken() !== BinaryToken.CLOSE) {
        const val = r.readIntValue();
        if (val !== null) ioMembers.push(val);
      }
      if (!r.done) r.readToken(); // }
    } else if (r.peekToken() === BinaryToken.EQUAL) {
      r.readToken();
      r.skipValue();
    }
  }

  if (ioType === T.loc && ioLeader !== null && countryTags[ioLeader]) {
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
