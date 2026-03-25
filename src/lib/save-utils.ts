import type { MapChartConfig } from "./types";

/**
 * Check if a file is a binary (packed) EU5 save.
 * Binary saves have header "SAV" with format bytes "03" at positions 5-6.
 */
export function isBinarySave(bytes: Uint8Array): boolean {
  return (
    bytes.length > 7 &&
    bytes[0] === 0x53 &&
    bytes[1] === 0x41 &&
    bytes[2] === 0x56 &&
    String.fromCharCode(bytes[5]) === "0" &&
    String.fromCharCode(bytes[6]) === "3"
  );
}

/**
 * Trigger a browser download of the MapChart config as a .txt file.
 */
export function downloadConfig(config: MapChartConfig): void {
  const blob = new Blob([JSON.stringify(config)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "mapchart_config.txt";
  a.click();
  URL.revokeObjectURL(url);
}
