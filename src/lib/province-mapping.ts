export function buildLocationToProvince(
  provinceMapping: Record<string, string[]>,
): Record<string, string> {
  const locToProvince: Record<string, string> = {};
  for (const [province, locations] of Object.entries(provinceMapping)) {
    for (const loc of locations) {
      locToProvince[loc.toLowerCase()] = province;
    }
  }
  return locToProvince;
}

export function mapToProvinces(
  countryLocations: Record<string, string[]>,
  locToProvince: Record<string, string>,
): Record<string, string[]> {
  const provinceVotes: Record<string, Record<string, number>> = {};

  for (const [tag, locs] of Object.entries(countryLocations)) {
    for (const loc of locs) {
      const province = locToProvince[loc.toLowerCase()];
      if (province) {
        if (!provinceVotes[province]) provinceVotes[province] = {};
        provinceVotes[province][tag] = (provinceVotes[province][tag] ?? 0) + 1;
      }
    }
  }

  const result: Record<string, string[]> = {};
  for (const [province, votes] of Object.entries(provinceVotes)) {
    const winner = Object.entries(votes).sort((a, b) => b[1] - a[1])[0][0];
    if (!result[winner]) result[winner] = [];
    result[winner].push(province);
  }
  return result;
}
