import { describe, it, expect } from "vitest";
import {
  ok, err,
  hasSavHeader,
  parseSavHeader,
  findNewline,
  findZipOffset,
  parseStringLookup,
  resolveDynString,
  resolveTokenName,
  formatFloat,
  toTextHeader,
  meltSave,
} from "../melt";

describe("Result helpers", () => {
  it("ok wraps a value", () => {
    const r = ok(42);
    expect(r.ok).toBe(true);
    expect(r.ok && r.value).toBe(42);
  });

  it("err wraps an error", () => {
    const r = err("bad");
    expect(r.ok).toBe(false);
    expect(!r.ok && r.error).toBe("bad");
  });
});

describe("hasSavHeader", () => {
  it("returns true for SAV header", () => {
    expect(hasSavHeader(new Uint8Array([0x53, 0x41, 0x56, 0x30]))).toBe(true);
  });

  it("returns false for non-SAV data", () => {
    expect(hasSavHeader(new TextEncoder().encode("hello"))).toBe(false);
  });

  it("returns false for data shorter than 3 bytes", () => {
    expect(hasSavHeader(new Uint8Array([0x53, 0x41]))).toBe(false);
  });

  it("returns false for empty data", () => {
    expect(hasSavHeader(new Uint8Array([]))).toBe(false);
  });
});

describe("findNewline", () => {
  it("finds newline position", () => {
    expect(findNewline(new Uint8Array([0x41, 0x42, 0x0a, 0x43]))).toBe(2);
  });

  it("returns data.length when no newline", () => {
    expect(findNewline(new Uint8Array([0x41, 0x42, 0x43]))).toBe(3);
  });

  it("returns 0 for data starting with newline", () => {
    expect(findNewline(new Uint8Array([0x0a, 0x41]))).toBe(0);
  });
});

describe("parseSavHeader", () => {
  it("detects binary save (format byte 03)", () => {
    const data = new TextEncoder().encode("SAV02030000\n");
    const header = parseSavHeader(data);
    expect(header.isBinary).toBe(true);
    expect(header.raw).toBe("SAV02030000");
  });

  it("detects text save (format byte 00)", () => {
    const data = new TextEncoder().encode("SAV02000000\n");
    const header = parseSavHeader(data);
    expect(header.isBinary).toBe(false);
  });

  it("returns headerEnd at newline position", () => {
    const data = new TextEncoder().encode("SAV02030000\nrest");
    const header = parseSavHeader(data);
    expect(header.headerEnd).toBe(11);
  });
});

describe("findZipOffset", () => {
  it("finds PK signature", () => {
    const data = new Uint8Array([0x00, 0x00, 0x50, 0x4b, 0x03, 0x04]);
    const result = findZipOffset(data, 0);
    expect(result.ok).toBe(true);
    expect(result.ok && result.value).toBe(2);
  });

  it("finds PK after start offset", () => {
    const data = new Uint8Array([0x50, 0x4b, 0x00, 0x50, 0x4b]);
    const result = findZipOffset(data, 2);
    expect(result.ok).toBe(true);
    expect(result.ok && result.value).toBe(3);
  });

  it("returns error when no PK found", () => {
    const data = new Uint8Array([0x00, 0x00, 0x00]);
    const result = findZipOffset(data, 0);
    expect(result.ok).toBe(false);
    expect(!result.ok && result.error).toContain("No ZIP");
  });
});

describe("parseStringLookup", () => {
  const buildLookup = (strings: string[]): Uint8Array => {
    const encoder = new TextEncoder();
    const parts: number[] = [0x01, 0x00, 0x00, 0x00, 0x00]; // 5-byte header
    for (const s of strings) {
      const encoded = encoder.encode(s);
      parts.push(encoded.length & 0xff, (encoded.length >> 8) & 0xff, ...encoded);
    }
    return new Uint8Array(parts);
  };

  it("parses sequential strings", () => {
    expect(parseStringLookup(buildLookup(["hello", "world"]))).toEqual(["hello", "world"]);
  });

  it("returns empty for header-only data", () => {
    expect(parseStringLookup(new Uint8Array([1, 0, 0, 0, 0]))).toEqual([]);
  });

  it("handles UTF-8 strings", () => {
    expect(parseStringLookup(buildLookup(["café"]))).toEqual(["café"]);
  });
});

describe("resolveDynString", () => {
  const strings = ["alpha", "beta", "gamma"];

  it("returns string at valid index", () => {
    expect(resolveDynString(strings, 1)).toBe("beta");
  });

  it("returns fallback for out-of-range index", () => {
    expect(resolveDynString(strings, 99)).toBe("__dyn_99");
  });

  it("returns fallback for negative index", () => {
    expect(resolveDynString(strings, -1)).toBe("__dyn_-1");
  });
});

describe("resolveTokenName", () => {
  it("resolves known token IDs", () => {
    // 0x2812 = "owner" from the token map
    expect(resolveTokenName(0x2812)).toBe("owner");
  });

  it("returns __unknown_ for unknown IDs", () => {
    expect(resolveTokenName(0xffff)).toBe("__unknown_0xffff");
  });

  it("pads hex to 4 digits", () => {
    expect(resolveTokenName(0x0001)).toMatch(/0x0001/);
  });
});

describe("formatFloat", () => {
  it("formats integers without decimals", () => {
    expect(formatFloat(42)).toBe("42");
  });

  it("strips trailing zeros", () => {
    expect(formatFloat(3.14)).toBe("3.14");
  });

  it("strips trailing dot", () => {
    expect(formatFloat(5.0)).toBe("5");
  });

  it("keeps up to 5 decimals", () => {
    expect(formatFloat(1.123456789)).toBe("1.12346");
  });

  it("handles zero", () => {
    expect(formatFloat(0)).toBe("0");
  });

  it("handles negative", () => {
    expect(formatFloat(-2.5)).toBe("-2.5");
  });
});

describe("toTextHeader", () => {
  it("replaces version bytes at positions 4-5 with 00", () => {
    expect(toTextHeader("SAV02030000")).toBe("SAV00030000");
  });

  it("preserves rest of header", () => {
    expect(toTextHeader("SAV0203ABCDEF")).toBe("SAV0003ABCDEF");
  });
});

describe("meltSave", () => {
  it("passes through non-SAV data as text", () => {
    const data = new TextEncoder().encode("plain text content");
    const result = meltSave(data);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.isBinary).toBe(false);
      expect(result.value.text).toBe("plain text content");
    }
  });

  it("passes through text-mode SAV files", () => {
    const data = new TextEncoder().encode("SAV02000000\nmetadata={}\n");
    const result = meltSave(data);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.isBinary).toBe(false);
      expect(result.value.text).toContain("SAV0200");
    }
  });

  it("returns error for binary SAV without ZIP", () => {
    const data = new TextEncoder().encode("SAV02030000\nno zip here");
    const result = meltSave(data);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("No ZIP");
    }
  });

  it("returns ok=true with isBinary=false for empty-ish data", () => {
    const result = meltSave(new Uint8Array([0x41]));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.isBinary).toBe(false);
    }
  });
});
