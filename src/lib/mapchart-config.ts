import type { MapChartConfig, MapChartGroup, RGB } from "./types";
import { generateDistinctColors, rgbToHex } from "./colors";
import { mapToProvinces } from "./province-mapping";

export function generateMapChartConfig(
  countryLocations: Record<string, string[]>,
  countryColors: Record<string, RGB>,
  locToProvince: Record<string, string>,
  options: { title?: string; tagLabels?: Record<string, string> } = {},
): MapChartConfig {
  const countryProvinces = mapToProvinces(countryLocations, locToProvince);
  const tags = Object.keys(countryProvinces).sort((a, b) => {
    const labelA = options.tagLabels?.[a] ?? a;
    const labelB = options.tagLabels?.[b] ?? b;
    return labelA.localeCompare(labelB);
  });

  const colors = { ...countryColors };
  const missingTags = tags.filter((t) => !colors[t]);
  if (missingTags.length > 0) {
    const generated = generateDistinctColors(missingTags.length);
    missingTags.forEach((tag, i) => { colors[tag] = generated[i]; });
  }

  const usedHex: Record<string, string> = {};
  const groups: Record<string, MapChartGroup> = {};

  for (const tag of tags) {
    let rgb: RGB = colors[tag] ?? [128, 128, 128];
    let hexColor = rgbToHex(...rgb);

    while (usedHex[hexColor] && usedHex[hexColor] !== tag) {
      rgb = [Math.min(255, rgb[0] + 3), Math.min(255, rgb[1] + 2), rgb[2]];
      hexColor = rgbToHex(...rgb);
    }
    usedHex[hexColor] = tag;

    const label = options.tagLabels?.[tag] ?? tag;
    groups[hexColor] = { label, paths: countryProvinces[tag] };
  }

  return {
    groups,
    title: options.title ?? "",
    hidden: [],
    background: "#ffffff",
    borders: "#000",
    legendFont: "Helvetica",
    legendFontColor: "#000",
    legendBorderColor: "#00000000",
    legendBgColor: "#00000000",
    legendWidth: 150,
    legendBoxShape: "square",
    legendTitleMode: "attached",
    areBordersShown: true,
    defaultColor: "#d1dbdd",
    labelsColor: "#6a0707",
    labelsFont: "Arial",
    strokeWidth: "medium",
    areLabelsShown: false,
    uncoloredScriptColor: "#ffff33",
    zoomLevel: "1.00",
    zoomX: "0.00",
    zoomY: "0.00",
    v6: true,
    mapTitleScale: 1,
    page: "eu-v-provinces",
    mapVersion: null,
    legendPosition: "bottom_left",
    legendSize: "medium",
    legendTranslateX: "0.00",
    legendStatus: "show",
    scalingPatterns: true,
    legendRowsSameColor: true,
    legendColumnCount: 1,
  };
}
