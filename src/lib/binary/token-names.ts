/**
 * Static token name resolver.
 *
 * Maps binary token IDs (u16) to their game field names.
 * Built from the combined engine + EU5 game token mapping.
 */

import tokenMap from "../eu5-tokens.json";

const nameToId = new Map<string, number>();
const idToName = new Map<number, string>();

for (const [idStr, name] of Object.entries(tokenMap)) {
  const id = parseInt(idStr);
  idToName.set(id, name as string);
  // Only store the first ID for each name (some names have multiple IDs)
  if (!nameToId.has(name as string)) {
    nameToId.set(name as string, id);
  }
}

/** Look up the token ID for a known field name. Returns undefined if not found. */
export function tokenId(name: string): number | undefined {
  return nameToId.get(name);
}

/** Look up the field name for a token ID. Returns undefined if not found. */
export function tokenName(id: number): string | undefined {
  return idToName.get(id);
}
