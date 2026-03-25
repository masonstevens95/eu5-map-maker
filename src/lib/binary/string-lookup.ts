/** Check whether a string entry length is valid for the current position. */
const isValidStringEntry = (len: number, pos: number, dataLength: number): boolean =>
  len > 0 && len <= 50000 && pos + len <= dataLength;

/** Parse the string_lookup file from an EU5 save ZIP. */
export const parseStringLookup = (data: Uint8Array): string[] => {
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const decoder = new TextDecoder("utf-8");

  const collect = (pos: number, acc: readonly string[]): string[] => {
    if (pos + 2 <= data.length) {
      const len = view.getUint16(pos, true);
      const nextPos = pos + 2;
      if (isValidStringEntry(len, nextPos, data.length)) {
        return collect(nextPos + len, [...acc, decoder.decode(data.subarray(nextPos, nextPos + len))]);
      } else {
        return [...acc];
      }
    } else {
      return [...acc];
    }
  };

  return collect(5 /* skip 5-byte header */, []);
};
