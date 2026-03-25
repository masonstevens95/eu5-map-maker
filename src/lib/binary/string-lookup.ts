/** Parse the string_lookup file from an EU5 save ZIP. */
export function parseStringLookup(data: Uint8Array): string[] {
  const strings: string[] = [];
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const decoder = new TextDecoder("utf-8");
  let pos = 5; // skip 5-byte header

  while (pos + 2 <= data.length) {
    const len = view.getUint16(pos, true);
    pos += 2;
    if (len === 0 || len > 50000 || pos + len > data.length) break;
    strings.push(decoder.decode(data.subarray(pos, pos + len)));
    pos += len;
  }

  return strings;
}
