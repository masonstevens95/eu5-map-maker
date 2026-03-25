import { BinaryToken } from "../tokens";

/** Write a u16 LE value. */
export function u16(v: number): number[] {
  return [v & 0xff, (v >> 8) & 0xff];
}

/** Write an i32/u32 LE value. */
export function i32(v: number): number[] {
  const buf = new ArrayBuffer(4);
  new DataView(buf).setInt32(0, v, true);
  return [...new Uint8Array(buf)];
}

/** Write a length-prefixed UTF-8 string (for QUOTED/UNQUOTED). */
export function str(s: string): number[] {
  const encoded = new TextEncoder().encode(s);
  return [...u16(encoded.length), ...encoded];
}

/** Build: token_type + payload shorthand. */
export function quotedStr(s: string): number[] {
  return [...u16(BinaryToken.QUOTED), ...str(s)];
}

export function intVal(v: number): number[] {
  return [...u16(BinaryToken.I32), ...i32(v)];
}

export function uintVal(v: number): number[] {
  return [...u16(BinaryToken.U32), ...i32(v)]; // i32 works for small u32 too
}

export function eq(): number[] { return u16(BinaryToken.EQUAL); }
export function open(): number[] { return u16(BinaryToken.OPEN); }
export function close(): number[] { return u16(BinaryToken.CLOSE); }

/** Build a complete block: { ...content } */
export function block(...content: number[][]): number[] {
  return [...open(), ...content.flat(), ...close()];
}

/** Build a Uint8Array from arrays of bytes. */
export function bytes(...parts: number[][]): Uint8Array {
  return new Uint8Array(parts.flat());
}
