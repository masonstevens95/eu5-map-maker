import { describe, it, expect } from "vitest";
import { TokenReader } from "../token-reader";
import { BinaryToken } from "../tokens";

/** Helper: build a Uint8Array from u16 LE values. */
function u16(...values: number[]): Uint8Array {
  const buf = new Uint8Array(values.length * 2);
  const view = new DataView(buf.buffer);
  values.forEach((v, i) => view.setUint16(i * 2, v, true));
  return buf;
}

/** Helper: build bytes from mixed token/data. */
function buildBytes(parts: Array<{ u16: number } | { i32: number } | { u8: number } | { str: string }>): Uint8Array {
  const chunks: number[] = [];
  for (const p of parts) {
    if ("u16" in p) {
      chunks.push(p.u16 & 0xff, (p.u16 >> 8) & 0xff);
    } else if ("i32" in p) {
      const buf = new ArrayBuffer(4);
      new DataView(buf).setInt32(0, p.i32, true);
      chunks.push(...new Uint8Array(buf));
    } else if ("u8" in p) {
      chunks.push(p.u8);
    } else if ("str" in p) {
      const encoded = new TextEncoder().encode(p.str);
      chunks.push(encoded.length & 0xff, (encoded.length >> 8) & 0xff, ...encoded);
    }
  }
  return new Uint8Array(chunks);
}

describe("TokenReader", () => {
  describe("basic reading", () => {
    it("reads a u16 token", () => {
      const r = new TokenReader(u16(0x1234));
      expect(r.readToken()).toBe(0x1234);
      expect(r.done).toBe(true);
    });

    it("peeks without advancing", () => {
      const r = new TokenReader(u16(0xABCD));
      expect(r.peekToken()).toBe(0xABCD);
      expect(r.peekToken()).toBe(0xABCD);
      expect(r.pos).toBe(0);
    });

    it("reports done correctly", () => {
      const r = new TokenReader(u16(1));
      expect(r.done).toBe(false);
      r.readToken();
      expect(r.done).toBe(true);
    });
  });

  describe("typed value readers", () => {
    it("reads I32", () => {
      const data = buildBytes([{ u16: BinaryToken.I32 }, { i32: -42 }]);
      const r = new TokenReader(data);
      r.readToken();
      expect(r.readI32()).toBe(-42);
    });

    it("reads bool true/false", () => {
      const data = new Uint8Array([
        BinaryToken.BOOL & 0xff, (BinaryToken.BOOL >> 8) & 0xff, 1,
        BinaryToken.BOOL & 0xff, (BinaryToken.BOOL >> 8) & 0xff, 0,
      ]);
      const r = new TokenReader(data);
      r.readToken();
      expect(r.readBool()).toBe(true);
      r.readToken();
      expect(r.readBool()).toBe(false);
    });

    it("reads QUOTED string", () => {
      const data = buildBytes([{ u16: BinaryToken.QUOTED }, { str: "hello" }]);
      const r = new TokenReader(data);
      r.readToken();
      expect(r.readString()).toBe("hello");
    });

    it("reads U32", () => {
      const data = buildBytes([{ u16: BinaryToken.U32 }, { i32: 12345 }]);
      const r = new TokenReader(data);
      r.readToken();
      expect(r.readU32()).toBe(12345);
    });

    it("reads F32", () => {
      const buf = new ArrayBuffer(4);
      new DataView(buf).setFloat32(0, 3.14, true);
      const data = buildBytes([{ u16: BinaryToken.F32 }]);
      const combined = new Uint8Array(data.length + 4);
      combined.set(data);
      combined.set(new Uint8Array(buf), data.length);
      const r = new TokenReader(combined);
      r.readToken();
      expect(r.readF32()).toBeCloseTo(3.14, 2);
    });

    it("reads U64", () => {
      // U64: lo=100, hi=0
      const data = new Uint8Array(10);
      const view = new DataView(data.buffer);
      view.setUint16(0, BinaryToken.U64, true);
      view.setUint32(2, 100, true);
      view.setUint32(6, 0, true);
      const r = new TokenReader(data);
      r.readToken();
      expect(r.readU64()).toBe(100);
    });

    it("reads I64", () => {
      const data = new Uint8Array(10);
      const view = new DataView(data.buffer);
      view.setUint16(0, BinaryToken.I64, true);
      view.setUint32(2, 50, true);
      view.setInt32(6, 0, true);
      const r = new TokenReader(data);
      r.readToken();
      expect(r.readI64()).toBe(50);
    });

    it("reads F64 (fixed-point / 10000)", () => {
      const data = new Uint8Array(10);
      const view = new DataView(data.buffer);
      view.setUint16(0, BinaryToken.F64, true);
      view.setUint32(2, 25000, true); // 25000 / 10000 = 2.5
      view.setInt32(6, 0, true);
      const r = new TokenReader(data);
      r.readToken();
      expect(r.readF64()).toBe(2.5);
    });

    it("reads UNQUOTED string", () => {
      const data = buildBytes([{ u16: BinaryToken.UNQUOTED }, { str: "test" }]);
      const r = new TokenReader(data);
      r.readToken();
      expect(r.readString()).toBe("test");
    });

    it("reads LookupU16", () => {
      const dynStrings = ["zero", "one", "two", "three"];
      const data = new Uint8Array(4);
      const view = new DataView(data.buffer);
      view.setUint16(0, BinaryToken.LOOKUP_U16, true);
      view.setUint16(2, 3, true); // index 3
      const r = new TokenReader(data, dynStrings);
      r.readToken();
      expect(r.readLookupU16()).toBe("three");
    });

    it("reads LookupU24", () => {
      const dynStrings = Array(300).fill("").map((_, i) => `s${i}`);
      const data = new Uint8Array(5);
      const view = new DataView(data.buffer);
      view.setUint16(0, BinaryToken.LOOKUP_U24, true);
      data[2] = 200; data[3] = 0; data[4] = 0; // index 200
      const r = new TokenReader(data, dynStrings);
      r.readToken();
      expect(r.readLookupU24()).toBe("s200");
    });

    it("reads lookup strings", () => {
      const dynStrings = ["zero", "one", "two"];
      const data = new Uint8Array([
        BinaryToken.LOOKUP_U8 & 0xff, (BinaryToken.LOOKUP_U8 >> 8) & 0xff, 1,
      ]);
      const r = new TokenReader(data, dynStrings);
      r.readToken();
      expect(r.readLookupU8()).toBe("one");
    });
  });

  describe("convenience readers", () => {
    it("readIntValue returns number for I32", () => {
      const data = buildBytes([{ u16: BinaryToken.I32 }, { i32: 99 }]);
      const r = new TokenReader(data);
      expect(r.readIntValue()).toBe(99);
    });

    it("readIntValue returns null for non-int types", () => {
      const data = buildBytes([{ u16: BinaryToken.BOOL }, { u8: 1 }]);
      const r = new TokenReader(data);
      expect(r.readIntValue()).toBeNull();
    });

    it("readStringValue returns string for QUOTED", () => {
      const data = buildBytes([{ u16: BinaryToken.QUOTED }, { str: "test" }]);
      const r = new TokenReader(data);
      expect(r.readStringValue()).toBe("test");
    });

    it("readStringValue handles LOOKUP_U8", () => {
      const data = new Uint8Array([
        BinaryToken.LOOKUP_U8 & 0xff, (BinaryToken.LOOKUP_U8 >> 8) & 0xff, 0,
      ]);
      const r = new TokenReader(data, ["hello"]);
      expect(r.readStringValue()).toBe("hello");
    });

    it("readStringValue handles LOOKUP_U16", () => {
      const data = new Uint8Array(4);
      new DataView(data.buffer).setUint16(0, BinaryToken.LOOKUP_U16, true);
      new DataView(data.buffer).setUint16(2, 1, true);
      const r = new TokenReader(data, ["a", "b"]);
      expect(r.readStringValue()).toBe("b");
    });

    it("readStringValue handles LOOKUP_U24", () => {
      const data = new Uint8Array(5);
      new DataView(data.buffer).setUint16(0, BinaryToken.LOOKUP_U24, true);
      data[2] = 2; data[3] = 0; data[4] = 0;
      const r = new TokenReader(data, ["a", "b", "c"]);
      expect(r.readStringValue()).toBe("c");
    });

    it("readStringValue returns null for non-string types", () => {
      const data = buildBytes([{ u16: BinaryToken.I32 }, { i32: 0 }]);
      const r = new TokenReader(data);
      expect(r.readStringValue()).toBeNull();
    });

    it("readFloatValue reads F32", () => {
      const data = new Uint8Array(6);
      new DataView(data.buffer).setUint16(0, BinaryToken.F32, true);
      new DataView(data.buffer).setFloat32(2, 1.5, true);
      const r = new TokenReader(data);
      expect(r.readFloatValue()).toBeCloseTo(1.5);
    });

    it("readFloatValue returns null for non-float types", () => {
      const data = buildBytes([{ u16: BinaryToken.BOOL }, { u8: 1 }]);
      const r = new TokenReader(data);
      expect(r.readFloatValue()).toBeNull();
    });

    it("readIntValue handles U32", () => {
      const data = buildBytes([{ u16: BinaryToken.U32 }, { i32: 42 }]);
      const r = new TokenReader(data);
      expect(r.readIntValue()).toBe(42);
    });
  });

  describe("skip utilities", () => {
    it("skipValue skips an I32", () => {
      const data = buildBytes([
        { u16: BinaryToken.I32 }, { i32: 42 },
        { u16: 0xFFFF },
      ]);
      const r = new TokenReader(data);
      r.skipValue();
      expect(r.readToken()).toBe(0xFFFF);
    });

    it("skipValue skips a string", () => {
      const data = buildBytes([
        { u16: BinaryToken.QUOTED }, { str: "hello" },
        { u16: 0xFFFF },
      ]);
      const r = new TokenReader(data);
      r.skipValue();
      expect(r.readToken()).toBe(0xFFFF);
    });

    it("skipBlock skips nested braces", () => {
      // { { } }  then 0xFFFF
      const data = u16(
        BinaryToken.OPEN, BinaryToken.OPEN, BinaryToken.CLOSE, BinaryToken.CLOSE,
        0xFFFF,
      );
      const r = new TokenReader(data);
      r.readToken(); // consume outer {
      r.skipBlock();
      expect(r.readToken()).toBe(0xFFFF);
    });

    it("skipBlock skips values inside", () => {
      // { I32(42) = I32(99) }  then 0xFFFF
      const data = buildBytes([
        { u16: BinaryToken.OPEN },
        { u16: BinaryToken.I32 }, { i32: 42 },
        { u16: BinaryToken.EQUAL },
        { u16: BinaryToken.I32 }, { i32: 99 },
        { u16: BinaryToken.CLOSE },
        { u16: 0xFFFF },
      ]);
      const r = new TokenReader(data);
      r.readToken(); // {
      r.skipBlock();
      expect(r.readToken()).toBe(0xFFFF);
    });
  });

  describe("expect helpers", () => {
    it("expectEqual consumes = and returns true", () => {
      const r = new TokenReader(u16(BinaryToken.EQUAL, 0xFFFF));
      expect(r.expectEqual()).toBe(true);
      expect(r.readToken()).toBe(0xFFFF);
    });

    it("expectEqual returns false when not =", () => {
      const r = new TokenReader(u16(BinaryToken.OPEN));
      expect(r.expectEqual()).toBe(false);
      expect(r.pos).toBe(0); // didn't advance
    });

    it("expectOpen consumes { and returns true", () => {
      const r = new TokenReader(u16(BinaryToken.OPEN, 0xFFFF));
      expect(r.expectOpen()).toBe(true);
      expect(r.readToken()).toBe(0xFFFF);
    });

    it("expectOpen returns false when not {", () => {
      const r = new TokenReader(u16(BinaryToken.EQUAL));
      expect(r.expectOpen()).toBe(false);
      expect(r.pos).toBe(0);
    });
  });
});
