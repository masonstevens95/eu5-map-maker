import { describe, it, expect } from "vitest";
import { findSection, findAllMatches, findOwnershipLocations, sectionPattern } from "../section-finder";
import { TokenReader } from "../token-reader";
import { BinaryToken } from "../tokens";
import { bytes, u16, eq, open, close, intVal } from "./helpers";

describe("sectionPattern", () => {
  it("builds 6-byte pattern for token = {", () => {
    expect(sectionPattern(0x2ccc)).toEqual([0xcc, 0x2c, 0x01, 0x00, 0x03, 0x00]);
  });
});

describe("findSection", () => {
  it("finds section with largest block", () => {
    // Two matches: small block at offset 0, large block at offset 20
    const data = bytes(
      u16(0xAA), eq(), open(), close(), // 8 bytes, small block
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], // padding
      u16(0xAA), eq(), open(), intVal(42), close(), // 14 bytes, larger block
    );
    const r = new TokenReader(data);
    const off = findSection(data, 0xAA, r);
    expect(off).toBe(20); // the larger match
  });

  it("returns -1 when not found", () => {
    const data = bytes(u16(0xBB), eq(), open(), close());
    const r = new TokenReader(data);
    expect(findSection(data, 0xCC, r)).toBe(-1);
  });

  it("returns -1 for undefined id", () => {
    const data = bytes(u16(0xAA), eq(), open(), close());
    const r = new TokenReader(data);
    expect(findSection(data, undefined, r)).toBe(-1);
  });
});

describe("findAllMatches", () => {
  it("finds all occurrences", () => {
    const data = bytes(
      u16(0xAA), eq(), open(), close(),
      u16(0xAA), eq(), open(), close(),
      u16(0xBB), eq(), open(), close(),
    );
    expect(findAllMatches(data, 0xAA)).toEqual([0, 8]);
    expect(findAllMatches(data, 0xBB)).toEqual([16]);
  });

  it("returns empty for no matches", () => {
    expect(findAllMatches(bytes(u16(0xAA)), 0xBB)).toEqual([]);
  });

  it("returns empty for undefined id", () => {
    expect(findAllMatches(bytes(u16(0xAA)), undefined)).toEqual([]);
  });
});

describe("findOwnershipLocations", () => {
  it("finds section with nested locations > owner pattern", () => {
    const LOC_ID = 0x2dc0;
    const OWNER_ID = 0x2812;
    // locations = { locations = { I32(1) = { owner = ... } } }
    const data = bytes(
      u16(LOC_ID), eq(), open(),
        u16(LOC_ID), eq(), open(),
          u16(BinaryToken.I32), [1, 0, 0, 0], eq(), open(),
            u16(OWNER_ID), eq(), intVal(3),
          close(),
        close(),
      close(),
    );
    const r = new TokenReader(data);
    expect(findOwnershipLocations(data, LOC_ID, OWNER_ID, r)).toBe(0);
  });

  it("returns -1 when inner structure doesn't match", () => {
    const LOC_ID = 0x2dc0;
    const OWNER_ID = 0x2812;
    // locations = { some_other_field = ... }
    const data = bytes(
      u16(LOC_ID), eq(), open(),
        u16(0x9999), eq(), intVal(0),
      close(),
    );
    const r = new TokenReader(data);
    expect(findOwnershipLocations(data, LOC_ID, OWNER_ID, r)).toBe(-1);
  });

  it("returns -1 for undefined ids", () => {
    const r = new TokenReader(new Uint8Array(0));
    expect(findOwnershipLocations(new Uint8Array(0), undefined, 0x2812, r)).toBe(-1);
    expect(findOwnershipLocations(new Uint8Array(0), 0x2dc0, undefined, r)).toBe(-1);
  });
});
