import { describe, it, expect } from "vitest";
import { tokenId, tokenName } from "../token-names";

describe("tokenId", () => {
  it("resolves known game tokens", () => {
    expect(tokenId("owner")).toBe(0x2812);
    expect(tokenId("locations")).toBe(0x2dc0);
    expect(tokenId("countries")).toBe(0x2ccc);
    expect(tokenId("capital")).toBe(0x27fd);
  });

  it("resolves known engine tokens", () => {
    expect(tokenId("metadata")).toBe(0x09de);
    expect(tokenId("flag")).toBe(0x0384);
    expect(tokenId("database")).toBe(0x05ab);
    expect(tokenId("multiplayer")).toBe(0x0522);
  });

  it("returns undefined for unknown names", () => {
    expect(tokenId("nonexistent_field_xyz")).toBeUndefined();
  });
});

describe("tokenName", () => {
  it("resolves known IDs to names", () => {
    expect(tokenName(0x2812)).toBe("owner");
    expect(tokenName(0x09de)).toBe("metadata");
  });

  it("returns undefined for unknown IDs", () => {
    expect(tokenName(0x0000)).toBeUndefined();
    expect(tokenName(0xffff)).toBeUndefined();
  });
});
