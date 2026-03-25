import { describe, it, expect, vi, beforeEach } from "vitest";
import { isBinarySave, downloadConfig } from "../save-utils";
import type { MapChartConfig } from "../types";

describe("isBinarySave", () => {
  it("returns true for SAV header with packed format 03", () => {
    // S=0x53, A=0x41, V=0x56, 0=0x30, 2=0x32, 0=0x30, 3=0x33
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

  it("returns false when byte 5 is not '0'", () => {
    const bytes = new Uint8Array([0x53, 0x41, 0x56, 0x30, 0x32, 0x31, 0x33, 0x30]);
    expect(isBinarySave(bytes)).toBe(false);
  });

  it("returns false when byte 6 is not '3'", () => {
    const bytes = new Uint8Array([0x53, 0x41, 0x56, 0x30, 0x32, 0x30, 0x32, 0x30]);
    expect(isBinarySave(bytes)).toBe(false);
  });
});

describe("downloadConfig", () => {
  let clickSpy: ReturnType<typeof vi.fn>;
  let revokeObjectURLSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    clickSpy = vi.fn();
    revokeObjectURLSpy = vi.fn();
    // jsdom doesn't provide URL.createObjectURL/revokeObjectURL
    URL.createObjectURL = vi.fn().mockReturnValue("blob:mock-url");
    URL.revokeObjectURL = revokeObjectURLSpy;
    vi.spyOn(document, "createElement").mockReturnValue({
      href: "",
      download: "",
      click: clickSpy,
    } as unknown as HTMLAnchorElement);
  });

  const mockConfig: MapChartConfig = {
    groups: { "#ff0000": { label: "ENG", paths: ["London"] } },
    title: "", hidden: [], background: "#ffffff", borders: "#000",
    legendFont: "Helvetica", legendFontColor: "#000",
    legendBorderColor: "#00000000", legendBgColor: "#00000000",
    legendWidth: 150, legendBoxShape: "square", legendTitleMode: "attached",
    areBordersShown: true, defaultColor: "#d1dbdd", labelsColor: "#6a0707",
    labelsFont: "Arial", strokeWidth: "medium", areLabelsShown: false,
    uncoloredScriptColor: "#ffff33", zoomLevel: "1.00", zoomX: "0.00",
    zoomY: "0.00", v6: true, mapTitleScale: 1, page: "eu-v-provinces",
    mapVersion: null, legendPosition: "bottom_left", legendSize: "medium",
    legendTranslateX: "0.00", legendStatus: "show", scalingPatterns: true,
    legendRowsSameColor: true, legendColumnCount: 1,
  };

  it("creates a blob URL and triggers download", () => {
    downloadConfig(mockConfig);
    expect(URL.createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
    expect(clickSpy).toHaveBeenCalled();
  });

  it("sets download filename to mapchart_config.txt", () => {
    const mockAnchor = { href: "", download: "", click: vi.fn() };
    vi.spyOn(document, "createElement").mockReturnValue(mockAnchor as unknown as HTMLAnchorElement);
    downloadConfig(mockConfig);
    expect(mockAnchor.download).toBe("mapchart_config.txt");
  });

  it("revokes the blob URL after clicking", () => {
    downloadConfig(mockConfig);
    expect(revokeObjectURLSpy).toHaveBeenCalledWith("blob:mock-url");
  });

  it("sets the anchor href to the blob URL", () => {
    const mockAnchor = { href: "", download: "", click: vi.fn() };
    vi.spyOn(document, "createElement").mockReturnValue(mockAnchor as unknown as HTMLAnchorElement);
    downloadConfig(mockConfig);
    expect(mockAnchor.href).toBe("blob:mock-url");
  });
});
