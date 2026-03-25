import type { RGB } from "./types";

export function rgbToHex(r: number, g: number, b: number): string {
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

export function hsvToRgb(h: number, s: number, v: number): RGB {
  const i = Math.floor(h * 6);
  const f = h * 6 - i;
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const t = v * (1 - (1 - f) * s);
  let r: number, g: number, b: number;
  switch (i % 6) {
    case 0: r = v; g = t; b = p; break;
    case 1: r = q; g = v; b = p; break;
    case 2: r = p; g = v; b = t; break;
    case 3: r = p; g = q; b = v; break;
    case 4: r = t; g = p; b = v; break;
    default: r = v; g = p; b = q; break;
  }
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

export function generateDistinctColors(n: number): RGB[] {
  const golden = 0.618033988749895;
  const colors: RGB[] = [];
  let hue = 0;
  for (let i = 0; i < n; i++) {
    colors.push(hsvToRgb(hue, 0.65, 0.85));
    hue = (hue + golden) % 1.0;
  }
  return colors;
}

export function lightenColor(rgb: RGB, fraction: number): RGB {
  return [
    Math.round(rgb[0] + (255 - rgb[0]) * fraction),
    Math.round(rgb[1] + (255 - rgb[1]) * fraction),
    Math.round(rgb[2] + (255 - rgb[2]) * fraction),
  ];
}
