import type { ExportOptions, MapChartConfig } from "./types";
import { lightenColor } from "./colors";
import { parseMeltedSave } from "./save-parser";
import { buildLocationToProvince } from "./province-mapping";
import { generateMapChartConfig } from "./mapchart-config";

export function exportMapChartConfig(
  saveText: string,
  provinceMapping: Record<string, string[]>,
  options: ExportOptions = {},
): MapChartConfig {
  const parsed = parseMeltedSave(saveText);
  let { countryLocations } = parsed;
  const { tagToPlayers, countryColors, overlordSubjects } = parsed;

  const locToProvince = buildLocationToProvince(provinceMapping);

  const tagLabels: Record<string, string> = {};
  for (const tag of Object.keys(countryLocations)) {
    tagLabels[tag] = tagToPlayers[tag]
      ? `${tag} - ${tagToPlayers[tag].join(", ")}`
      : tag;
  }

  const allCountryLocations = { ...countryLocations };

  if (options.playersOnly && Object.keys(tagToPlayers).length > 0) {
    const playerTagSet = new Set(Object.keys(tagToPlayers));
    countryLocations = Object.fromEntries(
      Object.entries(countryLocations).filter(([tag]) => playerTagSet.has(tag)),
    );
  }

  if (options.playersOnly && Object.keys(tagToPlayers).length > 0) {
    for (const overlordTag of Object.keys(tagToPlayers)) {
      const vassalTags = overlordSubjects[overlordTag];
      if (!vassalTags || vassalTags.size === 0) continue;

      const vassalLocs: string[] = [];
      for (const vtag of vassalTags) {
        if (allCountryLocations[vtag]) vassalLocs.push(...allCountryLocations[vtag]);
      }
      if (vassalLocs.length > 0) {
        const vassalKey = `${overlordTag}_vassals`;
        countryLocations[vassalKey] = vassalLocs;
        tagLabels[vassalKey] = `${overlordTag} - vassals and fiefdoms`;
        if (countryColors[overlordTag]) {
          countryColors[vassalKey] = lightenColor(countryColors[overlordTag], 2 / 3);
        }
      }
    }
  }

  return generateMapChartConfig(countryLocations, countryColors, locToProvince, {
    ...options,
    tagLabels,
  });
}
