import { describe, it, expect } from "vitest";
import { parseStringLookup } from "../string-lookup";

function buildLookup(strings: string[]): Uint8Array {
  const encoder = new TextEncoder();
  const parts: number[] = [0x01, 0x00, 0x00, 0x00, 0x00]; // 5-byte header
  for (const s of strings) {
    const encoded = encoder.encode(s);
    parts.push(encoded.length & 0xff, (encoded.length >> 8) & 0xff, ...encoded);
  }
  return new Uint8Array(parts);
}

describe("parseStringLookup", () => {
  it("parses sequential strings", () => {
    const data = buildLookup(["hello", "world", "test"]);
    expect(parseStringLookup(data)).toEqual(["hello", "world", "test"]);
  });

  it("returns empty array for header-only data", () => {
    const data = new Uint8Array([0x01, 0x00, 0x00, 0x00, 0x00]);
    expect(parseStringLookup(data)).toEqual([]);
  });

  it("handles UTF-8 strings", () => {
    const data = buildLookup(["café", "naïve"]);
    expect(parseStringLookup(data)).toEqual(["café", "naïve"]);
  });

  it("stops at zero-length string", () => {
    const data = buildLookup(["first"]);
    // Append a zero-length entry
    const extended = new Uint8Array(data.length + 2);
    extended.set(data);
    extended[data.length] = 0;
    extended[data.length + 1] = 0;
    expect(parseStringLookup(extended)).toEqual(["first"]);
  });
});
