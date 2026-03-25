import { TokenReader } from "../token-reader";
import { BinaryToken } from "../tokens";
import { T } from "../game-tokens";

/** Read location names from metadata > compatibility > locations. */
export function readMetadataLocations(
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
      r.readToken();
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
      let idx = 0;
      while (!r.done && r.peekToken() !== BinaryToken.CLOSE) {
        const name = r.readStringValue();
        if (name) locationNames[idx++] = name;
      }
      if (!r.done) r.readToken(); // }
    } else if (r.peekToken() === BinaryToken.EQUAL) {
      r.readToken();
      r.skipValue();
    }
  }
}
