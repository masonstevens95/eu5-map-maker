import { describe, it, expect } from "vitest";
import { BinaryToken, isValueToken, valuePayloadSize } from "../tokens";

describe("isValueToken", () => {
  it("returns true for all value types", () => {
    const valueTypes = [
      BinaryToken.I32, BinaryToken.F32, BinaryToken.BOOL,
      BinaryToken.QUOTED, BinaryToken.U32, BinaryToken.UNQUOTED,
      BinaryToken.F64, BinaryToken.U64, BinaryToken.I64,
      BinaryToken.LOOKUP_U8, BinaryToken.LOOKUP_U16, BinaryToken.LOOKUP_U24,
    ];
    for (const tok of valueTypes) {
      expect(isValueToken(tok)).toBe(true);
    }
  });

  it("returns false for structural tokens", () => {
    expect(isValueToken(BinaryToken.EQUAL)).toBe(false);
    expect(isValueToken(BinaryToken.OPEN)).toBe(false);
    expect(isValueToken(BinaryToken.CLOSE)).toBe(false);
  });

  it("returns false for unknown token IDs (field names)", () => {
    expect(isValueToken(0x2812)).toBe(false);
    expect(isValueToken(0x0384)).toBe(false);
  });
});

describe("valuePayloadSize", () => {
  const empty = new Uint8Array(0);

  it("returns 4 for I32, F32, U32", () => {
    expect(valuePayloadSize(BinaryToken.I32, empty, 0)).toBe(4);
    expect(valuePayloadSize(BinaryToken.F32, empty, 0)).toBe(4);
    expect(valuePayloadSize(BinaryToken.U32, empty, 0)).toBe(4);
  });

  it("returns 1 for BOOL", () => {
    expect(valuePayloadSize(BinaryToken.BOOL, empty, 0)).toBe(1);
  });

  it("returns 8 for F64, U64, I64", () => {
    expect(valuePayloadSize(BinaryToken.F64, empty, 0)).toBe(8);
    expect(valuePayloadSize(BinaryToken.U64, empty, 0)).toBe(8);
    expect(valuePayloadSize(BinaryToken.I64, empty, 0)).toBe(8);
  });

  it("returns 1/2/3 for LOOKUP types", () => {
    expect(valuePayloadSize(BinaryToken.LOOKUP_U8, empty, 0)).toBe(1);
    expect(valuePayloadSize(BinaryToken.LOOKUP_U16, empty, 0)).toBe(2);
    expect(valuePayloadSize(BinaryToken.LOOKUP_U24, empty, 0)).toBe(3);
  });

  it("returns 2 + string length for QUOTED/UNQUOTED", () => {
    // String with length prefix 5 (LE): 05 00
    const data = new Uint8Array([0x05, 0x00, 0x68, 0x65, 0x6c, 0x6c, 0x6f]);
    expect(valuePayloadSize(BinaryToken.QUOTED, data, 0)).toBe(7); // 2 + 5
    expect(valuePayloadSize(BinaryToken.UNQUOTED, data, 0)).toBe(7);
  });

  it("returns 0 for unknown token types", () => {
    expect(valuePayloadSize(0x9999, empty, 0)).toBe(0);
  });
});
