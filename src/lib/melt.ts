/**
 * EU5 Binary Save Melter
 *
 * Converts a binary .eu5 save file to plaintext, or passes through text saves.
 * Pure functional design: no null, no exceptions, immutable variables,
 * every if has an else.
 */

import { unzipSync } from "fflate";
import tokenMap from "./eu5-tokens.json";

// =============================================================================
// Result type — replaces exceptions
// =============================================================================

export type Result<T, E = string> =
  | { ok: true; value: T }
  | { ok: false; error: E };

export const ok = <T>(value: T): Result<T, never> => ({ ok: true, value });
export const err = <E = string>(error: E): Result<never, E> => ({ ok: false, error });

// =============================================================================
// Types
// =============================================================================

export interface MeltResult {
  readonly text: string;
  readonly isBinary: boolean;
}

export interface SaveHeader {
  readonly raw: string;
  readonly isBinary: boolean;
  readonly headerEnd: number;
}

// =============================================================================
// Token name resolver (built once at module load)
// =============================================================================

const tokenNames: ReadonlyMap<number, string> = new Map(
  Object.entries(tokenMap).map(([id, name]) => [parseInt(id), name as string]),
);

export const resolveTokenName = (tok: number): string =>
  tokenNames.get(tok) ?? `__unknown_0x${tok.toString(16).padStart(4, "0")}`;

// =============================================================================
// Pure helper functions
// =============================================================================

/** Check whether raw bytes start with the SAV magic header. */
export const hasSavHeader = (data: Uint8Array): boolean =>
  data.length >= 3 && data[0] === 0x53 && data[1] === 0x41 && data[2] === 0x56;

/** Parse the SAV header line from raw bytes. */
export const parseSavHeader = (data: Uint8Array): SaveHeader => {
  const headerEnd = findNewline(data);
  const raw = new TextDecoder("ascii").decode(data.subarray(0, headerEnd));
  const isBinary = raw.length > 6 && raw[5] === "0" && raw[6] === "3";
  return { raw, isBinary, headerEnd };
};

/** Find the first newline byte position, or data.length if none. */
export const findNewline = (data: Uint8Array): number => {
  const idx = data.indexOf(0x0a);
  return idx >= 0 ? idx : data.length;
};

/** Find the PK (ZIP) signature offset after a given start position. */
export const findZipOffset = (data: Uint8Array, start: number): Result<number> => {
  for (let i = start; i < data.length - 1; i++) {
    if (data[i] === 0x50 && data[i + 1] === 0x4b) {
      return ok(i);
    }
  }
  return err("No ZIP data found in binary save");
};

/** Extract gamestate and string_lookup from a ZIP. */
export const extractSaveZip = (
  zipData: Uint8Array,
): Result<{ gamestate: Uint8Array; stringLookup: Uint8Array }> => {
  const files = unzipSync(zipData);
  const gamestate = files["gamestate"];
  const stringLookup = files["string_lookup"];
  return gamestate && stringLookup
    ? ok({ gamestate, stringLookup })
    : err(
        !gamestate
          ? "No gamestate found in save ZIP"
          : "No string_lookup found in save ZIP",
      );
};

/** Parse the string_lookup binary into an array of dynamic strings. */
export const parseStringLookup = (data: Uint8Array): readonly string[] => {
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const decoder = new TextDecoder("utf-8");
  const strings: string[] = [];
  let pos = 5; // skip 5-byte header

  while (pos + 2 <= data.length) {
    const len = view.getUint16(pos, true);
    pos += 2;
    if (len === 0 || len > 50000 || pos + len > data.length) {
      break;
    } else {
      strings.push(decoder.decode(data.subarray(pos, pos + len)));
      pos += len;
    }
  }
  return strings;
};

/** Resolve a dynamic string by index, with fallback. */
export const resolveDynString = (
  dynStrings: readonly string[],
  idx: number,
): string =>
  idx >= 0 && idx < dynStrings.length
    ? dynStrings[idx]
    : `__dyn_${idx}`;

/** Format a float to 5 decimal places, stripping trailing zeros. */
export const formatFloat = (v: number): string =>
  Number.isInteger(v)
    ? v.toString()
    : v.toFixed(5).replace(/\.?0+$/, "");

/** Rewrite a binary SAV header to text mode (replace format bytes). */
export const toTextHeader = (header: string): string =>
  header.slice(0, 4) + "00" + header.slice(6);

// =============================================================================
// Token constants
// =============================================================================

const EQUAL = 0x0001, OPEN = 0x0003, CLOSE = 0x0004;
const I32 = 0x000c, F32 = 0x000d, BOOL = 0x000e;
const QUOTED = 0x000f, U32 = 0x0014, UNQUOTED = 0x0017;
const F64 = 0x0167, U64 = 0x029c, I64 = 0x0317;
const LOOKUP_U8 = 0x0d40, LOOKUP_U16 = 0x0d3e, LOOKUP_U24 = 0x0d41;

// =============================================================================
// Main entry point
// =============================================================================

/**
 * Process a save file: melt binary to text, or pass through text.
 * Returns a Result — never throws.
 */
export const meltSave = (data: Uint8Array): Result<MeltResult> => {
  if (!hasSavHeader(data)) {
    return ok({ text: new TextDecoder().decode(data), isBinary: false });
  } else {
    const header = parseSavHeader(data);
    if (!header.isBinary) {
      return ok({ text: new TextDecoder().decode(data), isBinary: false });
    } else {
      return meltBinarySave(data, header);
    }
  }
};

const meltBinarySave = (
  data: Uint8Array,
  header: SaveHeader,
): Result<MeltResult> => {
  const zipResult = findZipOffset(data, header.headerEnd + 1);
  if (!zipResult.ok) {
    return zipResult;
  } else {
    const extractResult = extractSaveZip(data.subarray(zipResult.value));
    if (!extractResult.ok) {
      return extractResult;
    } else {
      const { gamestate, stringLookup } = extractResult.value;
      const dynStrings = parseStringLookup(stringLookup);
      const text = meltGamestateToText(gamestate, dynStrings, header.raw);
      return ok({ text, isBinary: true });
    }
  }
};

// =============================================================================
// Gamestate melter (buffer-based, imperative by necessity)
// =============================================================================

const meltGamestateToText = (
  data: Uint8Array,
  dynStrings: readonly string[],
  header: string,
): string => {
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const encoder = new TextEncoder();
  const writer = createBufferWriter(Math.ceil(data.length * 2.5), encoder);

  writer.writeStr(toTextHeader(header));
  writer.writeByte(0x0a);

  let pos = 0;
  let depth = 0;
  let afterEqual = false;

  while (pos + 2 <= data.length) {
    const tok = view.getUint16(pos, true);
    pos += 2;

    switch (tok) {
      case EQUAL:
        writer.writeByte(0x3d);
        afterEqual = true;
        break;

      case OPEN:
        if (!afterEqual) { writer.writeTabs(depth); } else { /* no indent after = */ }
        writer.writeByte(0x7b);
        writer.writeByte(0x0a);
        afterEqual = false;
        depth++;
        break;

      case CLOSE:
        depth = Math.max(0, depth - 1);
        writer.writeTabs(depth);
        writer.writeByte(0x7d);
        writer.writeByte(0x0a);
        break;

      case I32: {
        const v = view.getInt32(pos, true); pos += 4;
        writer.writeValue(v.toString(), depth, afterEqual);
        afterEqual = false;
        break;
      }

      case F32: {
        const v = view.getFloat32(pos, true); pos += 4;
        writer.writeValue(formatFloat(v), depth, afterEqual);
        afterEqual = false;
        break;
      }

      case BOOL: {
        const yes = data[pos] !== 0; pos += 1;
        writer.writeValue(yes ? "yes" : "no", depth, afterEqual);
        afterEqual = false;
        break;
      }

      case QUOTED: {
        const len = view.getUint16(pos, true); pos += 2;
        if (!afterEqual) { writer.writeTabs(depth); } else { /* after = */ }
        writer.writeByte(0x22);
        writer.writeRaw(data, pos, len);
        pos += len;
        writer.writeByte(0x22);
        writer.writeByte(0x0a);
        afterEqual = false;
        break;
      }

      case U32: {
        const v = view.getUint32(pos, true); pos += 4;
        writer.writeValue(v.toString(), depth, afterEqual);
        afterEqual = false;
        break;
      }

      case UNQUOTED: {
        const len = view.getUint16(pos, true); pos += 2;
        if (!afterEqual) { writer.writeTabs(depth); } else { /* after = */ }
        writer.writeRaw(data, pos, len);
        pos += len;
        writer.writeByte(0x0a);
        afterEqual = false;
        break;
      }

      case F64: {
        const lo = view.getUint32(pos, true);
        const hi = view.getInt32(pos + 4, true);
        pos += 8;
        const v = (hi * 0x100000000 + lo) / 10000;
        writer.writeValue(formatFloat(v), depth, afterEqual);
        afterEqual = false;
        break;
      }

      case U64: {
        const lo = view.getUint32(pos, true);
        const hi = view.getUint32(pos + 4, true);
        pos += 8;
        writer.writeValue((hi * 0x100000000 + lo).toString(), depth, afterEqual);
        afterEqual = false;
        break;
      }

      case I64: {
        const lo = view.getUint32(pos, true);
        const hi = view.getInt32(pos + 4, true);
        pos += 8;
        writer.writeValue((hi * 0x100000000 + lo).toString(), depth, afterEqual);
        afterEqual = false;
        break;
      }

      case LOOKUP_U8: {
        const idx = data[pos]; pos += 1;
        writer.writeValue(resolveDynString(dynStrings, idx), depth, afterEqual);
        afterEqual = false;
        break;
      }

      case LOOKUP_U16: {
        const idx = view.getUint16(pos, true); pos += 2;
        writer.writeValue(resolveDynString(dynStrings, idx), depth, afterEqual);
        afterEqual = false;
        break;
      }

      case LOOKUP_U24: {
        const idx = data[pos] | (data[pos + 1] << 8) | (data[pos + 2] << 16);
        pos += 3;
        writer.writeValue(resolveDynString(dynStrings, idx), depth, afterEqual);
        afterEqual = false;
        break;
      }

      default: {
        const name = resolveTokenName(tok);
        if (afterEqual) {
          writer.writeValue(name, depth, true);
          afterEqual = false;
        } else {
          writer.writeTabs(depth);
          writer.writeStr(name);
        }
        break;
      }
    }
  }

  return writer.toString();
};

// =============================================================================
// Buffer writer (encapsulates mutable buffer state)
// =============================================================================

interface BufferWriter {
  readonly writeByte: (b: number) => void;
  readonly writeStr: (s: string) => void;
  readonly writeTabs: (n: number) => void;
  readonly writeRaw: (src: Uint8Array, offset: number, len: number) => void;
  readonly writeValue: (val: string, depth: number, afterEqual: boolean) => void;
  readonly toString: () => string;
}

const createBufferWriter = (initialSize: number, encoder: TextEncoder): BufferWriter => {
  let buf = new Uint8Array(initialSize);
  let wpos = 0;

  const ensureCapacity = (needed: number): void => {
    if (wpos + needed > buf.length) {
      const newBuf = new Uint8Array(Math.max(buf.length * 2, wpos + needed));
      newBuf.set(buf);
      buf = newBuf;
    } else {
      /* capacity sufficient */
    }
  };

  const writeByte = (b: number): void => {
    ensureCapacity(1);
    buf[wpos++] = b;
  };

  const writeStr = (s: string): void => {
    const encoded = encoder.encode(s);
    ensureCapacity(encoded.length);
    buf.set(encoded, wpos);
    wpos += encoded.length;
  };

  const writeTabs = (n: number): void => {
    ensureCapacity(n);
    for (let i = 0; i < n; i++) {
      buf[wpos++] = 0x09;
    }
  };

  const writeRaw = (src: Uint8Array, offset: number, len: number): void => {
    ensureCapacity(len);
    buf.set(src.subarray(offset, offset + len), wpos);
    wpos += len;
  };

  const writeValue = (val: string, depth: number, afterEqual: boolean): void => {
    if (afterEqual) {
      writeStr(val);
    } else {
      writeTabs(depth);
      writeStr(val);
    }
    writeByte(0x0a);
  };

  const toString = (): string =>
    new TextDecoder().decode(buf.subarray(0, wpos));

  return { writeByte, writeStr, writeTabs, writeRaw, writeValue, toString };
};
