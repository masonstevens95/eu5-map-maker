import { TokenReader } from "../token-reader";
import { BinaryToken, isValueToken } from "../tokens";
import { T } from "../game-tokens";

/** Read a played_country block for player name + country ID. */
export function readPlayedCountry(
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
    if (isValueToken(tok)) { r.skipValuePayload(tok); continue; }
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
