/**
 * Functions for locating sections in the binary gamestate by scanning
 * for byte patterns (token_id + EQUAL + OPEN).
 */

import { TokenReader } from "./token-reader";
import { BinaryToken } from "./tokens";

/**
 * Build the 6-byte pattern for `token_id = {`.
 */
export function sectionPattern(id: number): [number, number, number, number, number, number] {
  return [id & 0xff, (id >> 8) & 0xff, 0x01, 0x00, 0x03, 0x00];
}

/**
 * Find the byte offset of a section by scanning for `token_id = {` and
 * picking the match with the largest block size. Returns -1 if not found.
 */
export function findSection(
  data: Uint8Array,
  id: number | undefined,
  reader: TokenReader,
): number {
  if (id === undefined) return -1;
  const [b0, b1, b2, b3, b4, b5] = sectionPattern(id);
  let bestOff = -1, bestSize = 0;

  for (let i = 0; i <= data.length - 6; i++) {
    if (data[i] === b0 && data[i + 1] === b1 &&
        data[i + 2] === b2 && data[i + 3] === b3 &&
        data[i + 4] === b4 && data[i + 5] === b5) {
      reader.pos = i + 6;
      const start = reader.pos;
      reader.skipBlock();
      const size = reader.pos - start;
      if (size > bestSize) { bestSize = size; bestOff = i; }
    }
  }
  return bestOff;
}

/**
 * Find all byte offsets where `token_id = {` appears.
 */
export function findAllMatches(
  data: Uint8Array,
  id: number | undefined,
): number[] {
  if (id === undefined) return [];
  const [b0, b1, b2, b3, b4, b5] = sectionPattern(id);
  const offsets: number[] = [];

  for (let i = 0; i <= data.length - 6; i++) {
    if (data[i] === b0 && data[i + 1] === b1 &&
        data[i + 2] === b2 && data[i + 3] === b3 &&
        data[i + 4] === b4 && data[i + 5] === b5) {
      offsets.push(i);
    }
  }
  return offsets;
}

/**
 * Find the ownership locations section by checking for the structural
 * pattern: `locations = { locations = { I32 = { owner = ... } } }`
 */
export function findOwnershipLocations(
  data: Uint8Array,
  locId: number | undefined,
  ownerId: number | undefined,
  reader: TokenReader,
): number {
  if (locId === undefined || ownerId === undefined) return -1;
  const [b0, b1, b2, b3, b4, b5] = sectionPattern(locId);

  for (let i = 0; i <= data.length - 6; i++) {
    if (data[i] === b0 && data[i + 1] === b1 &&
        data[i + 2] === b2 && data[i + 3] === b3 &&
        data[i + 4] === b4 && data[i + 5] === b5) {
      reader.pos = i + 6;
      if (reader.peekToken() === locId) {
        reader.readToken();
        reader.expectEqual();
        reader.expectOpen();
        const entryTok = reader.peekToken();
        if (entryTok === BinaryToken.I32 || entryTok === BinaryToken.U32) {
          reader.readToken();
          entryTok === BinaryToken.I32 ? reader.readI32() : reader.readU32();
          reader.expectEqual();
          reader.expectOpen();
          if (reader.peekToken() === ownerId) return i;
        }
      }
    }
  }
  return -1;
}
