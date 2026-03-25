/**
 * Functions for locating sections in the binary gamestate by scanning
 * for byte patterns (token_id + EQUAL + OPEN).
 */

import { TokenReader } from "./token-reader";
import { BinaryToken } from "./tokens";

/** Check whether bytes at offset i match the 6-byte pattern. */
const matchesPattern = (
  data: Uint8Array,
  i: number,
  b0: number,
  b1: number,
  b2: number,
  b3: number,
  b4: number,
  b5: number,
): boolean =>
  data[i] === b0 &&
  data[i + 1] === b1 &&
  data[i + 2] === b2 &&
  data[i + 3] === b3 &&
  data[i + 4] === b4 &&
  data[i + 5] === b5;

/** Check whether a token is an integer type (I32 or U32). */
const isIntegerToken = (tok: number): boolean =>
  tok === BinaryToken.I32 || tok === BinaryToken.U32;

/**
 * Build the 6-byte pattern for `token_id = {`.
 */
export const sectionPattern = (
  id: number,
): [number, number, number, number, number, number] =>
  [id & 0xff, (id >> 8) & 0xff, 0x01, 0x00, 0x03, 0x00];

/**
 * Find the byte offset of a section by scanning for `token_id = {` and
 * picking the match with the largest block size. Returns -1 if not found.
 */
export const findSection = (
  data: Uint8Array,
  id: number | undefined,
  reader: TokenReader,
): number => {
  if (id === undefined) {
    return -1;
  } else {
    const [b0, b1, b2, b3, b4, b5] = sectionPattern(id);
    let bestOff = -1;
    let bestSize = 0;

    for (let i = 0; i <= data.length - 6; i++) {
      if (matchesPattern(data, i, b0, b1, b2, b3, b4, b5)) {
        reader.pos = i + 6;
        const start = reader.pos;
        reader.skipBlock();
        const size = reader.pos - start;
        if (size > bestSize) {
          bestSize = size;
          bestOff = i;
        } else {
          /* smaller or equal block — skip */
        }
      } else {
        /* no pattern match at this offset */
      }
    }
    return bestOff;
  }
};

/**
 * Find all byte offsets where `token_id = {` appears.
 */
export const findAllMatches = (
  data: Uint8Array,
  id: number | undefined,
): number[] => {
  if (id === undefined) {
    return [];
  } else {
    const [b0, b1, b2, b3, b4, b5] = sectionPattern(id);
    const offsets: number[] = [];

    for (let i = 0; i <= data.length - 6; i++) {
      if (matchesPattern(data, i, b0, b1, b2, b3, b4, b5)) {
        offsets.push(i);
      } else {
        /* no pattern match at this offset */
      }
    }
    return offsets;
  }
};

/**
 * Find the ownership locations section by checking for the structural
 * pattern: `locations = { locations = { I32 = { owner = ... } } }`
 */
export const findOwnershipLocations = (
  data: Uint8Array,
  locId: number | undefined,
  ownerId: number | undefined,
  reader: TokenReader,
): number => {
  if (locId === undefined || ownerId === undefined) {
    return -1;
  } else {
    const [b0, b1, b2, b3, b4, b5] = sectionPattern(locId);

    for (let i = 0; i <= data.length - 6; i++) {
      if (matchesPattern(data, i, b0, b1, b2, b3, b4, b5)) {
        reader.pos = i + 6;
        if (reader.peekToken() === locId) {
          reader.readToken();
          reader.expectEqual();
          reader.expectOpen();
          const entryTok = reader.peekToken();
          if (isIntegerToken(entryTok)) {
            reader.readToken();
            if (entryTok === BinaryToken.I32) {
              reader.readI32();
            } else {
              reader.readU32();
            }
            reader.expectEqual();
            reader.expectOpen();
            if (reader.peekToken() === ownerId) {
              return i;
            } else {
              /* owner token does not match — continue scanning */
            }
          } else {
            /* entry token is not an integer type — continue scanning */
          }
        } else {
          /* inner token does not match locId — continue scanning */
        }
      } else {
        /* no pattern match at this offset */
      }
    }
    return -1;
  }
};
