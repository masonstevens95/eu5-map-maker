/**
 * Save file utilities.
 *
 * Pure detection helpers and a browser download side-effect.
 * All detection functions are pure with immutable variables.
 * No null, no exceptions, every if has an else.
 */

import type { MapChartConfig } from "./types";

// =============================================================================
// Pure helpers
// =============================================================================

/** The ASCII magic bytes for "SAV". */
const SAV_MAGIC: readonly number[] = [0x53, 0x41, 0x56];

/** Minimum byte length required to inspect a SAV header. */
const SAV_MIN_LENGTH = 8;

/** Check whether bytes start with the SAV magic signature. */
export const hasSavMagic = (bytes: Uint8Array): boolean =>
  bytes.length >= SAV_MIN_LENGTH &&
  bytes[0] === SAV_MAGIC[0] &&
  bytes[1] === SAV_MAGIC[1] &&
  bytes[2] === SAV_MAGIC[2];

/** Check whether bytes 5-6 encode the packed binary format "03". */
export const isPacked03 = (bytes: Uint8Array): boolean =>
  String.fromCharCode(bytes[5]) === "0" &&
  String.fromCharCode(bytes[6]) === "3";

/**
 * Check if a file is a binary (packed) EU5 save.
 * Binary saves have header "SAV" with format bytes "03" at positions 5-6.
 */
export const isBinarySave = (bytes: Uint8Array): boolean =>
  hasSavMagic(bytes) ? isPacked03(bytes) : false;

/** Serialize a MapChart config to a JSON string. */
export const serializeConfig = (config: MapChartConfig): string =>
  JSON.stringify(config);

// =============================================================================
// Side-effectful browser download
// =============================================================================

/**
 * Trigger a browser download of the MapChart config as a .txt file.
 * This is the only impure function — it interacts with the DOM.
 */
export const downloadConfig = (config: MapChartConfig): void => {
  const json = serializeConfig(config);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "mapchart_config.txt";
  a.click();
  URL.revokeObjectURL(url);
};
