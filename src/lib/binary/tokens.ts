/** Built-in binary token type codes (Clausewitz/Jomini engine). */
export const BinaryToken = {
  EQUAL: 0x0001,
  OPEN: 0x0003,
  CLOSE: 0x0004,
  I32: 0x000c,
  F32: 0x000d,
  BOOL: 0x000e,
  QUOTED: 0x000f,
  U32: 0x0014,
  UNQUOTED: 0x0017,
  F64: 0x0167,
  U64: 0x029c,
  I64: 0x0317,
  LOOKUP_U8: 0x0d40,
  LOOKUP_U16: 0x0d3e,
  LOOKUP_U24: 0x0d41,
} as const;

/** Set of all built-in token codes (not field names). */
export const BUILTIN_TOKENS = new Set(Object.values(BinaryToken));

/** Check whether a token code is a value type (not a structural or name token). */
export function isValueToken(tok: number): boolean {
  switch (tok) {
    case BinaryToken.I32:
    case BinaryToken.F32:
    case BinaryToken.BOOL:
    case BinaryToken.QUOTED:
    case BinaryToken.U32:
    case BinaryToken.UNQUOTED:
    case BinaryToken.F64:
    case BinaryToken.U64:
    case BinaryToken.I64:
    case BinaryToken.LOOKUP_U8:
    case BinaryToken.LOOKUP_U16:
    case BinaryToken.LOOKUP_U24:
      return true;
    default:
      return false;
  }
}

/** Get the byte size of a value token's payload (excluding the 2-byte token itself). */
export function valuePayloadSize(tok: number, data: Uint8Array, pos: number): number {
  switch (tok) {
    case BinaryToken.I32:
    case BinaryToken.F32:
    case BinaryToken.U32:
      return 4;
    case BinaryToken.BOOL:
      return 1;
    case BinaryToken.F64:
    case BinaryToken.U64:
    case BinaryToken.I64:
      return 8;
    case BinaryToken.LOOKUP_U8:
      return 1;
    case BinaryToken.LOOKUP_U16:
      return 2;
    case BinaryToken.LOOKUP_U24:
      return 3;
    case BinaryToken.QUOTED:
    case BinaryToken.UNQUOTED: {
      if (pos + 2 > data.length) return 0;
      const len = data[pos] | (data[pos + 1] << 8);
      return 2 + len;
    }
    default:
      return 0;
  }
}
