/**
 * Targeted binary parser for EU5 save files.
 *
 * Extracts only the data needed for map generation directly from the
 * binary gamestate, skipping ~90% of the file (characters, population,
 * buildings, etc.). Uses ~50MB RAM instead of ~500MB for the text approach.
 */

import { unzipSync } from "fflate";
import { TokenReader } from "./token-reader";
import { BinaryToken } from "./tokens";
import { parseStringLookup } from "./string-lookup";
import { tokenId } from "./token-names";
import type { ParsedSave, RGB } from "../types";

// Cache token IDs for fields we care about
const T = {
  metadata:     tokenId("metadata"),
  compatibility: tokenId("compatibility"),
  locations:    tokenId("locations"),
  countries:    tokenId("countries"),
  tags:         tokenId("tags"),
  database:     tokenId("database"),
  flag:         tokenId("flag"),
  color:        tokenId("color"),
  capital:      tokenId("capital"),
  owner:        tokenId("owner"),
  ioManager:    tokenId("international_organization_manager"),
  type:         tokenId("type"),
  leader:       tokenId("leader"),
  allMembers:   tokenId("all_members"),
  loc:          tokenId("loc"),
  diplomacyMgr: tokenId("diplomacy_manager"),
  libertyDesire: tokenId("liberty_desire"),
  playedCountry: tokenId("played_country"),
  name:         tokenId("name"),
  country:      tokenId("country"),
  subjectTax:   tokenId("last_months_subject_tax"),
  mapColor:     tokenId("map_color"),
  // Engine tokens below 0x0270c — not in the game token mapping file
  COLOR:        0x0056,   // "color" field
  RGB:          0x0243,   // RGB color marker: 0x0243 { U32 U32 U32 }
  TYPE_ENGINE:  0x00e1,   // "type" field in IO entries
  NAME_ENGINE:  0x001b,   // "name" field in played_country
};

/**
 * Parse a binary .eu5 save directly into a ParsedSave.
 * Expects the raw file bytes (including the SAV header + ZIP).
 */
export function parseBinarySave(fileData: Uint8Array): ParsedSave {
  // Find ZIP
  let pkOffset = -1;
  for (let i = 0; i < fileData.length - 1; i++) {
    if (fileData[i] === 0x50 && fileData[i + 1] === 0x4b) {
      pkOffset = i;
      break;
    }
  }
  if (pkOffset === -1) throw new Error("No ZIP data found in save file");

  const files = unzipSync(fileData.subarray(pkOffset));
  const gamestate = files["gamestate"];
  const stringLookup = files["string_lookup"];
  if (!gamestate) throw new Error("No gamestate in save ZIP");
  if (!stringLookup) throw new Error("No string_lookup in save ZIP");

  const dynStrings = parseStringLookup(stringLookup);
  return parseGamestate(gamestate, dynStrings);
}

// =============================================================================
// Gamestate parser
// =============================================================================

function parseGamestate(data: Uint8Array, dynStrings: string[]): ParsedSave {
  const r = new TokenReader(data, dynStrings);

  // Collected data
  const locationNames: Record<number, string> = {};
  const countryTags: Record<number, string> = {};
  const locationOwners: Record<number, string> = {};
  const countryColors: Record<string, RGB> = {};
  const countryCapitals: Record<number, number> = {};
  const overlordCandidates = new Set<string>();
  const overlordSubjects: Record<string, Set<string>> = {};
  const ioMatched = new Set<string>();
  const subjectIds = new Set<number>();
  const tagToPlayers: Record<string, string[]> = {};

  // Locate sections by scanning for their byte patterns.
  // Use largest-block match to avoid false positives from nested data.

  // Metadata (for location names)
  const metaOff = findSection(data, T.metadata, r);
  if (metaOff >= 0) {
    r.pos = metaOff + 6;
    readMetadataLocations(r, locationNames);
  }

  // Countries (tags, colors, capitals, subject_tax)
  const countriesOff = findSection(data, T.countries, r);
  if (countriesOff >= 0) {
    r.pos = countriesOff + 6;
    readCountries(r, countryTags, countryColors, countryCapitals, overlordCandidates);
  }

  // Locations (ownership) — find the one with nested locations > owner pattern
  const locOff = findOwnershipLocations(data, T.locations, T.owner, r);
  if (locOff >= 0) {
    r.pos = locOff + 6;
    readLocationOwnership(r, countryTags, locationOwners);
  }

  // IO manager (vassals)
  const ioOff = findSection(data, T.ioManager, r);
  if (ioOff >= 0) {
    r.pos = ioOff + 6;
    readIOManager(r, countryTags, overlordSubjects, ioMatched);
  }

  // Diplomacy (subjects with liberty_desire)
  const dipOff = findSection(data, T.diplomacyMgr, r);
  if (dipOff >= 0) {
    r.pos = dipOff + 6;
    readDiplomacy(r, subjectIds);
  }

  // Played country entries (multiple, use all matches)
  for (const off of findAllMatches(data, T.playedCountry)) {
    r.pos = off + 6;
    readPlayedCountry(r, countryTags, tagToPlayers);
  }

  // Resolve subjects via capital ownership
  for (const subId of subjectIds) {
    const subTag = countryTags[subId];
    if (!subTag || ioMatched.has(subTag)) continue;
    const capLoc = countryCapitals[subId];
    if (capLoc === undefined) continue;
    const capOwner = locationOwners[capLoc];
    if (capOwner && capOwner !== subTag) {
      if (!overlordSubjects[capOwner]) overlordSubjects[capOwner] = new Set();
      overlordSubjects[capOwner].add(subTag);
    }
  }

  // Build countryLocations
  const countryLocations: Record<string, string[]> = {};
  for (const [locIdStr, tag] of Object.entries(locationOwners)) {
    const name = locationNames[parseInt(locIdStr)] ?? `loc_${locIdStr}`;
    if (!countryLocations[tag]) countryLocations[tag] = [];
    countryLocations[tag].push(name);
  }

  return { countryLocations, tagToPlayers, countryColors, overlordSubjects };
}

// =============================================================================
// Section finder — scan binary for token patterns
// =============================================================================


/**
 * Find the byte offset of a section by scanning for `token_id = {` and
 * picking the match with the largest block. This avoids false positives
 * from the same byte pattern appearing inside nested data.
 *
 * For sections that appear multiple times (like played_country), returns all.
 */
function findSection(
  data: Uint8Array,
  id: number | undefined,
  reader: TokenReader,
): number {
  if (id === undefined) return -1;
  const lo = id & 0xff, hi = (id >> 8) & 0xff;
  let bestOff = -1, bestSize = 0;

  for (let i = 0; i <= data.length - 6; i++) {
    if (
      data[i] === lo && data[i + 1] === hi &&
      data[i + 2] === 0x01 && data[i + 3] === 0x00 &&
      data[i + 4] === 0x03 && data[i + 5] === 0x00
    ) {
      reader.pos = i + 6;
      const start = reader.pos;
      reader.skipBlock();
      const size = reader.pos - start;
      if (size > bestSize) { bestSize = size; bestOff = i; }
    }
  }
  return bestOff;
}

function findAllMatches(
  data: Uint8Array,
  id: number | undefined,
): number[] {
  if (id === undefined) return [];
  const lo = id & 0xff, hi = (id >> 8) & 0xff;
  const offsets: number[] = [];
  for (let i = 0; i <= data.length - 6; i++) {
    if (
      data[i] === lo && data[i + 1] === hi &&
      data[i + 2] === 0x01 && data[i + 3] === 0x00 &&
      data[i + 4] === 0x03 && data[i + 5] === 0x00
    ) {
      offsets.push(i);
    }
  }
  return offsets;
}

/**
 * Find the ownership locations section specifically by checking for the
 * pattern: locations = { locations = { I32 = { owner = ... } } }
 */
function findOwnershipLocations(
  data: Uint8Array,
  locId: number | undefined,
  ownerId: number | undefined,
  reader: TokenReader,
): number {
  if (locId === undefined || ownerId === undefined) return -1;
  const lo = locId & 0xff, hi = (locId >> 8) & 0xff;

  for (let i = 0; i <= data.length - 6; i++) {
    if (
      data[i] === lo && data[i + 1] === hi &&
      data[i + 2] === 0x01 && data[i + 3] === 0x00 &&
      data[i + 4] === 0x03 && data[i + 5] === 0x00
    ) {
      // Check if first child is also "locations = {"
      reader.pos = i + 6;
      if (reader.peekToken() === locId) {
        reader.readToken(); // locations
        reader.expectEqual();
        reader.expectOpen();
        // Check if first entry is I32/U32 = { owner = ... }
        const entryTok = reader.peekToken();
        if (entryTok === BinaryToken.I32 || entryTok === BinaryToken.U32) {
          reader.readToken();
          entryTok === BinaryToken.I32 ? reader.readI32() : reader.readU32();
          reader.expectEqual();
          reader.expectOpen();
          if (reader.peekToken() === ownerId) {
            return i; // This is the ownership section
          }
        }
      }
    }
  }
  return -1;
}

// =============================================================================
// Section readers
// =============================================================================

/** Read location names from metadata > compatibility > locations. */
function readMetadataLocations(
  r: TokenReader,
  locationNames: Record<number, string>,
): void {
  let depth = 1;
  while (!r.done && depth > 0) {
    const tok = r.readToken();
    if (tok === BinaryToken.CLOSE) { depth--; continue; }
    if (tok === BinaryToken.OPEN) { depth++; continue; }
    if (tok === BinaryToken.EQUAL) continue;

    if (tok === T.compatibility) {
      r.expectEqual();
      r.expectOpen();
      readCompatibilityLocations(r, locationNames);
    } else if (r.peekToken() === BinaryToken.EQUAL) {
      r.readToken(); // =
      r.skipValue();
    }
  }
}

function readCompatibilityLocations(
  r: TokenReader,
  locationNames: Record<number, string>,
): void {
  let depth = 1;
  while (!r.done && depth > 0) {
    const tok = r.readToken();
    if (tok === BinaryToken.CLOSE) { depth--; continue; }
    if (tok === BinaryToken.OPEN) { depth++; continue; }
    if (tok === BinaryToken.EQUAL) continue;

    if (tok === T.locations) {
      r.expectEqual();
      r.expectOpen();
      // Read location name strings until }
      let idx = 0;
      while (!r.done && r.peekToken() !== BinaryToken.CLOSE) {
        const name = r.readStringValue();
        if (name) locationNames[idx++] = name;
      }
      if (!r.done) r.readToken(); // consume }
    } else if (r.peekToken() === BinaryToken.EQUAL) {
      r.readToken();
      r.skipValue();
    }
  }
}

/** Read countries > tags + database. */
function readCountries(
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
      // readCountryTags consumed its own }, don't adjust depth
    } else if (tok === T.database) {
      r.expectEqual();
      r.expectOpen();
      readCountryDatabase(r, countryColors, countryCapitals, overlordCandidates);
      // readCountryDatabase consumed its own }
    } else if (r.peekToken() === BinaryToken.EQUAL) {
      r.readToken();
      r.skipValue();
    }
  }
}

/** Read ID=TAG entries from the tags block. */
function readCountryTags(
  r: TokenReader,
  countryTags: Record<number, string>,
): void {
  // Entries are: I32(id) = UNQUOTED(tag)
  while (!r.done) {
    const tok = r.peekToken();
    if (tok === BinaryToken.CLOSE) { r.readToken(); return; }

    // Numeric key
    if (tok === BinaryToken.I32 || tok === BinaryToken.U32) {
      r.readToken(); // consume type token
      const id = tok === BinaryToken.I32 ? r.readI32() : r.readU32();
      r.expectEqual();
      const tag = r.readStringValue();
      if (tag) countryTags[id] = tag;
    } else {
      // Unexpected token, skip it
      r.readToken();
      if (r.peekToken() === BinaryToken.EQUAL) {
        r.readToken();
        r.skipValue();
      }
    }
  }
}

/** Read country entries from database, extracting flag/color/capital/subject_tax. */
function readCountryDatabase(
  r: TokenReader,
  countryColors: Record<string, RGB>,
  countryCapitals: Record<number, number>,
  overlordCandidates: Set<string>,
): void {
  // Entries: I32(id) = { flag=X ... color=rgb{R G B} ... capital=N ... }
  while (!r.done) {
    const tok = r.peekToken();
    if (tok === BinaryToken.CLOSE) { r.readToken(); return; }

    if (tok === BinaryToken.I32 || tok === BinaryToken.U32) {
      r.readToken();
      const countryId = tok === BinaryToken.I32 ? r.readI32() : r.readU32();
      r.expectEqual();
      r.expectOpen();
      readCountryEntry(r, countryId, countryColors, countryCapitals, overlordCandidates);
    } else {
      // Unexpected — skip
      r.readToken();
      if (r.peekToken() === BinaryToken.EQUAL) {
        r.readToken();
        r.skipValue();
      }
    }
  }
}

function readCountryEntry(
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

    // Only parse fields at depth 1 (direct children of this entry)
    if (depth !== 1) continue;

    if (tok === T.flag) {
      r.expectEqual();
      currentFlag = r.readStringValue();
    } else if ((tok === T.COLOR || tok === T.mapColor) && currentFlag) {
      r.expectEqual();
      // color = RGB { U32 U32 U32 } — RGB marker (0x0243) then { R G B }
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
      r.readToken(); // =
      r.skipValue();
    }
  }
}

/** Read location ownership from the main locations section. */
function readLocationOwnership(
  r: TokenReader,
  countryTags: Record<number, string>,
  locationOwners: Record<number, string>,
): void {
  // Structure: { locations = { ID = { owner=N ... } } ... }
  let depth = 1;
  while (!r.done && depth > 0) {
    const tok = r.readToken();
    if (tok === BinaryToken.CLOSE) { depth--; continue; }
    if (tok === BinaryToken.OPEN) { depth++; continue; }
    if (tok === BinaryToken.EQUAL) continue;

    if (tok === T.locations) {
      r.expectEqual();
      r.expectOpen();
      readLocationEntries(r, countryTags, locationOwners);
      return;
    } else if (r.peekToken() === BinaryToken.EQUAL) {
      r.readToken();
      r.skipValue();
    }
  }
}

function readLocationEntries(
  r: TokenReader,
  countryTags: Record<number, string>,
  locationOwners: Record<number, string>,
): void {
  while (!r.done) {
    const tok = r.peekToken();
    if (tok === BinaryToken.CLOSE) { r.readToken(); return; }

    if (tok === BinaryToken.I32 || tok === BinaryToken.U32) {
      r.readToken();
      const locId = tok === BinaryToken.I32 ? r.readI32() : r.readU32();
      r.expectEqual();
      r.expectOpen();
      // Read the location block, looking for owner=
      readLocationEntry(r, locId, countryTags, locationOwners);
    } else {
      r.readToken();
      if (r.peekToken() === BinaryToken.EQUAL) {
        r.readToken();
        r.skipValue();
      }
    }
  }
}

function readLocationEntry(
  r: TokenReader,
  locId: number,
  countryTags: Record<number, string>,
  locationOwners: Record<number, string>,
): void {
  // Read owner= (always the first field), then skip the rest of the block
  const firstTok = r.peekToken();
  if (firstTok === T.owner) {
    r.readToken(); // owner
    r.expectEqual();
    const ownerId = r.readIntValue();
    if (ownerId !== null && countryTags[ownerId]) {
      locationOwners[locId] = countryTags[ownerId];
    }
  }
  // Skip remaining fields in this location block
  r.skipBlock();
}

/** Read IO manager for type=loc subject relationships. */
function readIOManager(
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

function readIOEntries(
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
      tok === BinaryToken.I32 ? r.readI32() : r.readU32(); // IO id (unused)
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

function readIOEntry(
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
      ioType = r.readToken(); // type value is a token reference
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

  // Check if this is a lordship IO
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

/** Read diplomacy manager for liberty_desire (subject identification). */
function readDiplomacy(
  r: TokenReader,
  subjectIds: Set<number>,
): void {
  // Entries: I32(country_id) = { liberty_desire=N ... }
  while (!r.done) {
    const tok = r.peekToken();
    if (tok === BinaryToken.CLOSE) { r.readToken(); return; }

    if (tok === BinaryToken.I32 || tok === BinaryToken.U32) {
      r.readToken();
      const countryId = tok === BinaryToken.I32 ? r.readI32() : r.readU32();
      r.expectEqual();
      r.expectOpen();
      if (readDiplomacyEntry(r, countryId)) {
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
function readDiplomacyEntry(r: TokenReader, _countryId: number): boolean {
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

/** Read a played_country block for player name + country ID. */
function readPlayedCountry(
  r: TokenReader,
  countryTags: Record<number, string>,
  tagToPlayers: Record<string, string[]>,
): void {
  let playerName: string | null = null;
  let countryId: number | null = null;
  let depth = 1;

  while (!r.done && depth > 0) {
    const tok = r.readToken();
    if (tok === BinaryToken.CLOSE) { depth--; continue; }
    if (tok === BinaryToken.OPEN) { depth++; continue; }
    if (tok === BinaryToken.EQUAL) continue;

    if (depth !== 1) continue;

    if (tok === T.name || tok === T.NAME_ENGINE) {
      r.expectEqual();
      playerName = r.readStringValue();
    } else if (tok === T.country) {
      r.expectEqual();
      countryId = r.readIntValue();
    } else if (r.peekToken() === BinaryToken.EQUAL) {
      r.readToken();
      r.skipValue();
    }
  }

  if (playerName && countryId !== null && countryTags[countryId]) {
    const tag = countryTags[countryId];
    if (!tagToPlayers[tag]) tagToPlayers[tag] = [];
    if (!tagToPlayers[tag].includes(playerName)) {
      tagToPlayers[tag].push(playerName);
    }
  }
}
