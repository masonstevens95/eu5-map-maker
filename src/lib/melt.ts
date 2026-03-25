/**
 * EU5 Binary Save Melter
 *
 * Converts a binary .eu5 save file to plaintext, or passes through text saves.
 * Uses a pre-allocated buffer to avoid OOM from millions of small strings.
 */

import { unzipSync } from "fflate";
import tokenMap from "./eu5-tokens.json";

// Build static token resolver
const tokenNames = new Map<number, string>();
for (const [idStr, name] of Object.entries(tokenMap)) {
  tokenNames.set(parseInt(idStr), name as string);
}

export interface MeltResult {
  text: string;
  isBinary: boolean;
}

/**
 * Process a save file: melt binary to text, or pass through text.
 */
export function meltSave(data: Uint8Array): MeltResult {
  if (data[0] !== 0x53 || data[1] !== 0x41 || data[2] !== 0x56) {
    return { text: new TextDecoder().decode(data), isBinary: false };
  }

  let headerEnd = 0;
  while (headerEnd < data.length && data[headerEnd] !== 0x0a) headerEnd++;
  const header = new TextDecoder("ascii").decode(data.subarray(0, headerEnd));
  const isBinary = header.length > 6 && header[5] === "0" && header[6] === "3";

  if (!isBinary) {
    return { text: new TextDecoder().decode(data), isBinary: false };
  }

  let pkOffset = -1;
  for (let i = headerEnd + 1; i < data.length - 1; i++) {
    if (data[i] === 0x50 && data[i + 1] === 0x4b) { pkOffset = i; break; }
  }
  if (pkOffset === -1) throw new Error("No ZIP data found in binary save");

  const files = unzipSync(data.subarray(pkOffset));
  const gamestate = files["gamestate"];
  const stringLookup = files["string_lookup"];
  if (!gamestate) throw new Error("No gamestate found in save ZIP");
  if (!stringLookup) throw new Error("No string_lookup found in save ZIP");

  const dynStrings = parseStringLookup(stringLookup);
  const text = meltToText(gamestate, dynStrings, header);
  return { text, isBinary: true };
}

function parseStringLookup(data: Uint8Array): string[] {
  const strings: string[] = [];
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const decoder = new TextDecoder("utf-8");
  let pos = 5;
  while (pos + 2 <= data.length) {
    const len = view.getUint16(pos, true); pos += 2;
    if (len === 0 || len > 50000 || pos + len > data.length) break;
    strings.push(decoder.decode(data.subarray(pos, pos + len)));
    pos += len;
  }
  return strings;
}

// =============================================================================
// Token constants
// =============================================================================

const EQUAL = 0x0001, OPEN = 0x0003, CLOSE = 0x0004;
const I32 = 0x000c, F32 = 0x000d, BOOL = 0x000e;
const QUOTED = 0x000f, U32 = 0x0014, UNQUOTED = 0x0017;
const F64 = 0x0167, U64 = 0x029c, I64 = 0x0317;
const LOOKUP_U8 = 0x0d40, LOOKUP_U16 = 0x0d3e, LOOKUP_U24 = 0x0d41;

// =============================================================================
// Memory-efficient melter using TextEncoder + Uint8Array buffer
// =============================================================================

function meltToText(
  data: Uint8Array,
  dynStrings: string[],
  header: string,
): string {
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const encoder = new TextEncoder();

  // Allocate output buffer (estimate ~2.5x binary size)
  let buf = new Uint8Array(Math.ceil(data.length * 2.5));
  let wpos = 0;

  const TAB = 0x09, NL = 0x0a, EQ = 0x3d;
  const YES = encoder.encode("yes");
  const NO = encoder.encode("no");
  const OPEN_BRACE = 0x7b, CLOSE_BRACE = 0x7d;
  const QUOTE = 0x22;

  function ensureCapacity(needed: number) {
    if (wpos + needed > buf.length) {
      const newBuf = new Uint8Array(Math.max(buf.length * 2, wpos + needed));
      newBuf.set(buf);
      buf = newBuf;
    }
  }

  function writeByte(b: number) {
    ensureCapacity(1);
    buf[wpos++] = b;
  }

  function writeBytes(b: Uint8Array) {
    ensureCapacity(b.length);
    buf.set(b, wpos);
    wpos += b.length;
  }

  function writeStr(s: string) {
    const encoded = encoder.encode(s);
    writeBytes(encoded);
  }

  function writeTabs(n: number) {
    ensureCapacity(n);
    for (let i = 0; i < n; i++) buf[wpos++] = TAB;
  }

  // Write header
  writeStr(header.slice(0, 4) + "00" + header.slice(6));
  writeByte(NL);

  let pos = 0;
  let depth = 0;
  let afterEqual = false;

  while (pos + 2 <= data.length) {
    const tok = view.getUint16(pos, true);
    pos += 2;

    switch (tok) {
      case EQUAL:
        writeByte(EQ);
        afterEqual = true;
        break;

      case OPEN:
        if (!afterEqual) writeTabs(depth);
        writeByte(OPEN_BRACE);
        writeByte(NL);
        afterEqual = false;
        depth++;
        break;

      case CLOSE:
        depth = Math.max(0, depth - 1);
        writeTabs(depth);
        writeByte(CLOSE_BRACE);
        writeByte(NL);
        break;

      case I32: {
        const v = view.getInt32(pos, true); pos += 4;
        if (!afterEqual) writeTabs(depth);
        writeStr(v.toString());
        writeByte(NL);
        afterEqual = false;
        break;
      }

      case F32: {
        const v = view.getFloat32(pos, true); pos += 4;
        if (!afterEqual) writeTabs(depth);
        writeStr(fmtFloat(v));
        writeByte(NL);
        afterEqual = false;
        break;
      }

      case BOOL: {
        const yes = data[pos] !== 0; pos += 1;
        if (!afterEqual) writeTabs(depth);
        writeBytes(yes ? YES : NO);
        writeByte(NL);
        afterEqual = false;
        break;
      }

      case QUOTED: {
        const len = view.getUint16(pos, true); pos += 2;
        if (!afterEqual) writeTabs(depth);
        writeByte(QUOTE);
        // Write raw bytes (faster than decode+encode for most strings)
        ensureCapacity(len + 2);
        buf.set(data.subarray(pos, pos + len), wpos);
        wpos += len;
        pos += len;
        writeByte(QUOTE);
        writeByte(NL);
        afterEqual = false;
        break;
      }

      case U32: {
        const v = view.getUint32(pos, true); pos += 4;
        if (!afterEqual) writeTabs(depth);
        writeStr(v.toString());
        writeByte(NL);
        afterEqual = false;
        break;
      }

      case UNQUOTED: {
        const len = view.getUint16(pos, true); pos += 2;
        if (!afterEqual) writeTabs(depth);
        ensureCapacity(len + 1);
        buf.set(data.subarray(pos, pos + len), wpos);
        wpos += len;
        pos += len;
        writeByte(NL);
        afterEqual = false;
        break;
      }

      case F64: {
        const lo = view.getUint32(pos, true);
        const hi = view.getInt32(pos + 4, true);
        pos += 8;
        const v = (hi * 0x100000000 + lo) / 10000;
        if (!afterEqual) writeTabs(depth);
        writeStr(fmtFloat(v));
        writeByte(NL);
        afterEqual = false;
        break;
      }

      case U64: {
        const lo = view.getUint32(pos, true);
        const hi = view.getUint32(pos + 4, true);
        pos += 8;
        if (!afterEqual) writeTabs(depth);
        writeStr((hi * 0x100000000 + lo).toString());
        writeByte(NL);
        afterEqual = false;
        break;
      }

      case I64: {
        const lo = view.getUint32(pos, true);
        const hi = view.getInt32(pos + 4, true);
        pos += 8;
        if (!afterEqual) writeTabs(depth);
        writeStr((hi * 0x100000000 + lo).toString());
        writeByte(NL);
        afterEqual = false;
        break;
      }

      case LOOKUP_U8: {
        const idx = data[pos]; pos += 1;
        const s = dynStrings[idx] ?? `__dyn_${idx}`;
        if (!afterEqual) writeTabs(depth);
        writeStr(s);
        writeByte(NL);
        afterEqual = false;
        break;
      }

      case LOOKUP_U16: {
        const idx = view.getUint16(pos, true); pos += 2;
        const s = dynStrings[idx] ?? `__dyn_${idx}`;
        if (!afterEqual) writeTabs(depth);
        writeStr(s);
        writeByte(NL);
        afterEqual = false;
        break;
      }

      case LOOKUP_U24: {
        const idx = data[pos] | (data[pos + 1] << 8) | (data[pos + 2] << 16);
        pos += 3;
        const s = dynStrings[idx] ?? `__dyn_${idx}`;
        if (!afterEqual) writeTabs(depth);
        writeStr(s);
        writeByte(NL);
        afterEqual = false;
        break;
      }

      default: {
        const name = tokenNames.get(tok) ?? `__unknown_0x${tok.toString(16).padStart(4, "0")}`;
        if (afterEqual) {
          writeStr(name);
          writeByte(NL);
          afterEqual = false;
        } else {
          writeTabs(depth);
          writeStr(name);
        }
        break;
      }
    }
  }

  return new TextDecoder().decode(buf.subarray(0, wpos));
}

function fmtFloat(v: number): string {
  if (Number.isInteger(v)) return v.toString();
  const s = v.toFixed(5);
  return s.replace(/\.?0+$/, "");
}
