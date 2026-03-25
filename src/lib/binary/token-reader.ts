/**
 * Stateful reader for Clausewitz binary token streams.
 *
 * Provides typed read methods for each token type and utilities
 * for skipping values/blocks you don't need.
 */

import { BinaryToken, isValueToken, valuePayloadSize } from "./tokens";

export class TokenReader {
  private view: DataView;
  private data: Uint8Array;

  /** Raw access to underlying data for byte-level scanning. */
  get rawData(): Uint8Array { return this.data; }
  get rawView(): DataView { return this.view; }
  private decoder = new TextDecoder("utf-8");
  pos: number;

  private dynStrings: string[];

  constructor(data: Uint8Array, dynStrings: string[] = []) {
    this.dynStrings = dynStrings;
    this.data = data;
    this.view = new DataView(data.buffer, data.byteOffset, data.byteLength);
    this.pos = 0;
  }

  get done(): boolean {
    return this.pos + 2 > this.data.length;
  }

  // ---------------------------------------------------------------------------
  // Low-level token reading
  // ---------------------------------------------------------------------------

  peekToken(): number {
    return this.view.getUint16(this.pos, true);
  }

  readToken(): number {
    const tok = this.view.getUint16(this.pos, true);
    this.pos += 2;
    return tok;
  }

  // ---------------------------------------------------------------------------
  // Typed value readers (call after consuming the type token)
  // ---------------------------------------------------------------------------

  readI32(): number {
    const v = this.view.getInt32(this.pos, true);
    this.pos += 4;
    return v;
  }

  readU32(): number {
    const v = this.view.getUint32(this.pos, true);
    this.pos += 4;
    return v;
  }

  readF32(): number {
    const v = this.view.getFloat32(this.pos, true);
    this.pos += 4;
    return v;
  }

  readBool(): boolean {
    const v = this.data[this.pos] !== 0;
    this.pos += 1;
    return v;
  }

  readString(): string {
    const len = this.view.getUint16(this.pos, true);
    this.pos += 2;
    const s = this.decoder.decode(this.data.subarray(this.pos, this.pos + len));
    this.pos += len;
    return s;
  }

  readU64(): number {
    const lo = this.view.getUint32(this.pos, true);
    const hi = this.view.getUint32(this.pos + 4, true);
    this.pos += 8;
    return hi * 0x100000000 + lo;
  }

  readI64(): number {
    const lo = this.view.getUint32(this.pos, true);
    const hi = this.view.getInt32(this.pos + 4, true);
    this.pos += 8;
    return hi * 0x100000000 + lo;
  }

  readF64(): number {
    const lo = this.view.getUint32(this.pos, true);
    const hi = this.view.getInt32(this.pos + 4, true);
    this.pos += 8;
    return (hi * 0x100000000 + lo) / 10000;
  }

  readLookupU8(): string {
    const idx = this.data[this.pos++];
    return this.dynStrings[idx] ?? `__dyn_${idx}`;
  }

  readLookupU16(): string {
    const idx = this.view.getUint16(this.pos, true);
    this.pos += 2;
    return this.dynStrings[idx] ?? `__dyn_${idx}`;
  }

  readLookupU24(): string {
    const idx =
      this.data[this.pos] |
      (this.data[this.pos + 1] << 8) |
      (this.data[this.pos + 2] << 16);
    this.pos += 3;
    return this.dynStrings[idx] ?? `__dyn_${idx}`;
  }

  // ---------------------------------------------------------------------------
  // Convenience: read a value of any type (useful for consuming after =)
  // ---------------------------------------------------------------------------

  /** Read an integer value (I32, U32, I64, U64). Returns null for other types. */
  readIntValue(): number | null {
    const tok = this.readToken();
    switch (tok) {
      case BinaryToken.I32: return this.readI32();
      case BinaryToken.U32: return this.readU32();
      case BinaryToken.I64: return this.readI64();
      case BinaryToken.U64: return this.readU64();
      default: return null;
    }
  }

  /** Read a string value (QUOTED, UNQUOTED, LOOKUP). Returns null for other types. */
  readStringValue(): string | null {
    const tok = this.readToken();
    switch (tok) {
      case BinaryToken.QUOTED:
      case BinaryToken.UNQUOTED:
        return this.readString();
      case BinaryToken.LOOKUP_U8: return this.readLookupU8();
      case BinaryToken.LOOKUP_U16: return this.readLookupU16();
      case BinaryToken.LOOKUP_U24: return this.readLookupU24();
      default: return null;
    }
  }

  /** Read a float value (F32 or F64). Returns null for other types. */
  readFloatValue(): number | null {
    const tok = this.readToken();
    switch (tok) {
      case BinaryToken.F32: return this.readF32();
      case BinaryToken.F64: return this.readF64();
      case BinaryToken.I32: return this.readI32(); // sometimes ints in float contexts
      default: return null;
    }
  }

  // ---------------------------------------------------------------------------
  // Skip utilities
  // ---------------------------------------------------------------------------

  /** Skip the payload of a single value token (you already consumed the type token). */
  skipValuePayload(tok: number): void {
    this.pos += valuePayloadSize(tok, this.data, this.pos);
  }

  /** Read and discard one value (consumes the type token + payload). */
  skipValue(): void {
    if (this.done) return;
    const tok = this.readToken();
    if (tok === BinaryToken.OPEN) {
      this.skipBlock();
    } else if (isValueToken(tok)) {
      this.skipValuePayload(tok);
    }
    // else: it's a bare token reference (no payload)
  }

  /** Skip from just after an OPEN `{` to the matching CLOSE `}`. */
  skipBlock(): void {
    let depth = 1;
    while (!this.done && depth > 0) {
      const tok = this.readToken();
      if (tok === BinaryToken.OPEN) {
        depth++;
      } else if (tok === BinaryToken.CLOSE) {
        depth--;
      } else if (tok === BinaryToken.EQUAL) {
        // no payload
      } else if (isValueToken(tok)) {
        this.skipValuePayload(tok);
      }
      // else: bare token reference, no payload
    }
  }

  /** Consume an EQUAL token. Returns true if found, false otherwise. */
  expectEqual(): boolean {
    if (this.done) return false;
    if (this.peekToken() === BinaryToken.EQUAL) {
      this.pos += 2;
      return true;
    }
    return false;
  }

  /** Consume an OPEN `{` token. Returns true if found, false otherwise. */
  expectOpen(): boolean {
    if (this.done) return false;
    if (this.peekToken() === BinaryToken.OPEN) {
      this.pos += 2;
      return true;
    }
    return false;
  }
}
