import { describe, it, expect } from "vitest";
import { isBinarySave } from "../../App";

describe("isBinarySave", () => {
  it("returns true for SAV header with packed format 03", () => {
    // SAV0203... (S=0x53, A=0x41, V=0x56, 0=0x30, 2=0x32, 0=0x30, 3=0x33)
    const bytes = new Uint8Array([0x53, 0x41, 0x56, 0x30, 0x32, 0x30, 0x33, 0x30]);
    expect(isBinarySave(bytes)).toBe(true);
  });

  it("returns false for SAV header with text format 00", () => {
    const bytes = new Uint8Array([0x53, 0x41, 0x56, 0x30, 0x32, 0x30, 0x30, 0x30]);
    expect(isBinarySave(bytes)).toBe(false);
  });

  it("returns false for non-SAV file", () => {
    const bytes = new TextEncoder().encode("metadata={\n}");
    expect(isBinarySave(bytes)).toBe(false);
  });

  it("returns false for empty data", () => {
    expect(isBinarySave(new Uint8Array([]))).toBe(false);
  });

  it("returns false for data shorter than 8 bytes", () => {
    const bytes = new Uint8Array([0x53, 0x41, 0x56, 0x30]);
    expect(isBinarySave(bytes)).toBe(false);
  });
});
