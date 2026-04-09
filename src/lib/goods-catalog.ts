/**
 * Static goods catalog — one entry per good in EU5.
 *
 * Covers all 78 goods from the wiki:
 *   - 40 raw goods (mining, farming, gathering, hunting, logging)
 *   - 14 food raw goods (have food output, but are still RGO-produced)
 *   - 24 produced goods (manufactured in buildings from raw inputs)
 *
 * Keys are the internal save-file names WITHOUT the "goods_" prefix
 * (the same form returned by fmtGood / used as RGO raw_material strings).
 * Use lookupGood() to resolve either form.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type GoodCategory =
  | "mining"    // raw — mined
  | "farming"   // raw — farmed
  | "gathering" // raw — gathered
  | "hunting"   // raw — hunted/trapped
  | "logging"   // raw — logged
  | "food"      // raw — primary output is food (some have dual RGO type)
  | "produced"; // manufactured in buildings from raw inputs

export interface GoodMeta {
  readonly displayName: string;
  readonly category: GoodCategory;
  readonly basePrice: number;
  /** True for raw goods (produced by RGOs). False for manufactured goods. */
  readonly isRaw: boolean;
  /** Food output value (>0 only for food category goods). */
  readonly foodOutput: number;
}

// ---------------------------------------------------------------------------
// Catalog
// ---------------------------------------------------------------------------

export const GOODS_CATALOG: Readonly<Record<string, GoodMeta>> = {
  // ── Raw Mining ─────────────────────────────────────────────────────────
  alum:       { displayName: "Alum",       category: "mining", basePrice: 3,    isRaw: true, foodOutput: 0 },
  coal:       { displayName: "Coal",       category: "mining", basePrice: 2,    isRaw: true, foodOutput: 0 },
  copper:     { displayName: "Copper",     category: "mining", basePrice: 3,    isRaw: true, foodOutput: 0 },
  gems:       { displayName: "Gems",       category: "mining", basePrice: 4,    isRaw: true, foodOutput: 0 },
  gold:       { displayName: "Gold",       category: "mining", basePrice: 10,   isRaw: true, foodOutput: 0 },
  iron:       { displayName: "Iron",       category: "mining", basePrice: 3,    isRaw: true, foodOutput: 0 },
  lead:       { displayName: "Lead",       category: "mining", basePrice: 2,    isRaw: true, foodOutput: 0 },
  marble:     { displayName: "Marble",     category: "mining", basePrice: 5,    isRaw: true, foodOutput: 0 },
  mercury:    { displayName: "Mercury",    category: "mining", basePrice: 3,    isRaw: true, foodOutput: 0 },
  saltpeter:  { displayName: "Saltpeter",  category: "mining", basePrice: 2,    isRaw: true, foodOutput: 0 },
  silver:     { displayName: "Silver",     category: "mining", basePrice: 8,    isRaw: true, foodOutput: 0 },
  stone:      { displayName: "Stone",      category: "mining", basePrice: 1,    isRaw: true, foodOutput: 0 },
  tin:        { displayName: "Tin",        category: "mining", basePrice: 2,    isRaw: true, foodOutput: 0 },

  // ── Raw Farming ────────────────────────────────────────────────────────
  chili:        { displayName: "Chili",        category: "farming", basePrice: 5,    isRaw: true, foodOutput: 0 },
  cloves:       { displayName: "Cloves",       category: "farming", basePrice: 5,    isRaw: true, foodOutput: 0 },
  cocoa:        { displayName: "Cocoa",        category: "farming", basePrice: 4,    isRaw: true, foodOutput: 0 },
  coffee:       { displayName: "Coffee",       category: "farming", basePrice: 3,    isRaw: true, foodOutput: 0 },
  cotton:       { displayName: "Cotton",       category: "farming", basePrice: 3,    isRaw: true, foodOutput: 0 },
  dyes:         { displayName: "Dyes",         category: "farming", basePrice: 4,    isRaw: true, foodOutput: 0 },
  elephants:    { displayName: "Elephants",    category: "farming", basePrice: 10,   isRaw: true, foodOutput: 0 },
  fiber_crops:  { displayName: "Fiber Crops",  category: "farming", basePrice: 2,    isRaw: true, foodOutput: 0 },
  horses:       { displayName: "Horses",       category: "farming", basePrice: 3,    isRaw: true, foodOutput: 0 },
  incense:      { displayName: "Incense",      category: "farming", basePrice: 2.5,  isRaw: true, foodOutput: 0 },
  pepper:       { displayName: "Pepper",       category: "farming", basePrice: 5,    isRaw: true, foodOutput: 0 },
  saffron:      { displayName: "Saffron",      category: "farming", basePrice: 5,    isRaw: true, foodOutput: 0 },
  silk:         { displayName: "Silk",         category: "farming", basePrice: 4,    isRaw: true, foodOutput: 0 },
  sugar:        { displayName: "Sugar",        category: "farming", basePrice: 3,    isRaw: true, foodOutput: 0 },
  tea:          { displayName: "Tea",          category: "farming", basePrice: 3,    isRaw: true, foodOutput: 0 },
  tobacco:      { displayName: "Tobacco",      category: "farming", basePrice: 3,    isRaw: true, foodOutput: 0 },
  wine:         { displayName: "Wine",         category: "farming", basePrice: 2,    isRaw: true, foodOutput: 0 },

  // ── Raw Gathering ──────────────────────────────────────────────────────
  amber:       { displayName: "Amber",       category: "gathering", basePrice: 4,   isRaw: true, foodOutput: 0 },
  clay:        { displayName: "Clay",        category: "gathering", basePrice: 0.5, isRaw: true, foodOutput: 0 },
  medicaments: { displayName: "Medicaments", category: "gathering", basePrice: 1,   isRaw: true, foodOutput: 0 },
  pearls:      { displayName: "Pearls",      category: "gathering", basePrice: 4,   isRaw: true, foodOutput: 0 },
  salt:        { displayName: "Salt",        category: "gathering", basePrice: 4,   isRaw: true, foodOutput: 0 },
  sand:        { displayName: "Sand",        category: "gathering", basePrice: 0.5, isRaw: true, foodOutput: 0 },

  // ── Raw Hunting / Logging ──────────────────────────────────────────────
  ivory:   { displayName: "Ivory",   category: "hunting", basePrice: 4,   isRaw: true, foodOutput: 0 },
  lumber:  { displayName: "Lumber",  category: "logging", basePrice: 1.5, isRaw: true, foodOutput: 0 },

  // ── Food Raw Materials ─────────────────────────────────────────────────
  // These are still RGO-produced but their primary mechanical role is food supply.
  millet:        { displayName: "Millet",        category: "food", basePrice: 1,    isRaw: true, foodOutput: 5.0 },
  beeswax:       { displayName: "Beeswax",       category: "food", basePrice: 2,    isRaw: true, foodOutput: 2.5 },
  fish:          { displayName: "Fish",          category: "food", basePrice: 1,    isRaw: true, foodOutput: 5.0 },
  fruit:         { displayName: "Fruit",         category: "food", basePrice: 1,    isRaw: true, foodOutput: 4.0 },
  fur:           { displayName: "Fur",           category: "food", basePrice: 2,    isRaw: true, foodOutput: 2.0 },
  legumes:       { displayName: "Legumes",       category: "food", basePrice: 1,    isRaw: true, foodOutput: 5.0 },
  livestock:     { displayName: "Livestock",     category: "food", basePrice: 1.5,  isRaw: true, foodOutput: 8.0 },
  maize:         { displayName: "Maize",         category: "food", basePrice: 1,    isRaw: true, foodOutput: 8.0 },
  olives:        { displayName: "Olives",        category: "food", basePrice: 1,    isRaw: true, foodOutput: 4.0 },
  potatoes:      { displayName: "Potatoes",      category: "food", basePrice: 1,    isRaw: true, foodOutput: 8.0 },
  rice:          { displayName: "Rice",          category: "food", basePrice: 1,    isRaw: true, foodOutput: 10.0 },
  sturdy_grains: { displayName: "Sturdy Grains", category: "food", basePrice: 1,    isRaw: true, foodOutput: 5.0 },
  wheat:         { displayName: "Wheat",         category: "food", basePrice: 1,    isRaw: true, foodOutput: 8.0 },
  wild_game:     { displayName: "Wild Game",     category: "food", basePrice: 1,    isRaw: true, foodOutput: 3.5 },
  wool:          { displayName: "Wool",          category: "food", basePrice: 1.25, isRaw: true, foodOutput: 5.0 },

  // ── Produced Goods (manufactured in buildings) ─────────────────────────
  beer:          { displayName: "Beer",          category: "produced", basePrice: 2,   isRaw: false, foodOutput: 0 },
  books:         { displayName: "Books",         category: "produced", basePrice: 5,   isRaw: false, foodOutput: 0 },
  cannon:        { displayName: "Cannon",        category: "produced", basePrice: 4,   isRaw: false, foodOutput: 0 },
  cannons:       { displayName: "Cannon",        category: "produced", basePrice: 4,   isRaw: false, foodOutput: 0 },
  cloth:         { displayName: "Cloth",         category: "produced", basePrice: 3,   isRaw: false, foodOutput: 0 },
  fine_cloth:    { displayName: "Fine Cloth",    category: "produced", basePrice: 6,   isRaw: false, foodOutput: 0 },
  firearms:      { displayName: "Firearms",      category: "produced", basePrice: 3,   isRaw: false, foodOutput: 0 },
  furniture:     { displayName: "Furniture",     category: "produced", basePrice: 3,   isRaw: false, foodOutput: 0 },
  glass:         { displayName: "Glass",         category: "produced", basePrice: 2,   isRaw: false, foodOutput: 0 },
  jewelry:       { displayName: "Jewelry",       category: "produced", basePrice: 5,   isRaw: false, foodOutput: 0 },
  lacquerware:   { displayName: "Lacquerware",   category: "produced", basePrice: 5,   isRaw: false, foodOutput: 0 },
  leather:       { displayName: "Leather",       category: "produced", basePrice: 3,   isRaw: false, foodOutput: 0 },
  liquor:        { displayName: "Liquor",        category: "produced", basePrice: 2.5, isRaw: false, foodOutput: 0 },
  masonry:       { displayName: "Masonry",       category: "produced", basePrice: 1,   isRaw: false, foodOutput: 0 },
  naval_supplies:{ displayName: "Naval Supplies",category: "produced", basePrice: 3,   isRaw: false, foodOutput: 0 },
  paper:         { displayName: "Paper",         category: "produced", basePrice: 2,   isRaw: false, foodOutput: 0 },
  porcelain:     { displayName: "Porcelain",     category: "produced", basePrice: 3,   isRaw: false, foodOutput: 0 },
  pottery:       { displayName: "Pottery",       category: "produced", basePrice: 1,   isRaw: false, foodOutput: 0 },
  slaves:        { displayName: "Slaves",        category: "produced", basePrice: 3,   isRaw: false, foodOutput: 0 },
  steel:         { displayName: "Steel",         category: "produced", basePrice: 5,   isRaw: false, foodOutput: 0 },
  tar:           { displayName: "Tar",           category: "produced", basePrice: 2,   isRaw: false, foodOutput: 0 },
  tools:         { displayName: "Tools",         category: "produced", basePrice: 3,   isRaw: false, foodOutput: 0 },
  weaponry:      { displayName: "Weaponry",      category: "produced", basePrice: 3,   isRaw: false, foodOutput: 0 },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Look up a good by its save-file name in either form:
 *   "goods_beer"  → looks up "beer"
 *   "beer"        → looks up "beer"
 *   "fine_cloth"  → looks up "fine_cloth"
 */
export const lookupGood = (rawName: string): GoodMeta | undefined =>
  GOODS_CATALOG[rawName.replace(/^goods_/, "")];

/** Display name for a good key, falling back to fmtGood-style formatting. */
export const goodDisplayName = (rawName: string): string => {
  const meta = lookupGood(rawName);
  if (meta !== undefined) {
    return meta.displayName;
  } else {
    return rawName
      .replace(/^goods_/, "")
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }
};

/** All catalog entries as an array, sorted by display name. */
export const allGoods = (): readonly (readonly [string, GoodMeta])[] =>
  Object.entries(GOODS_CATALOG).sort(([, a], [, b]) =>
    a.displayName.localeCompare(b.displayName),
  );

/** Filter catalog to a specific category. */
export const goodsByCategory = (
  category: GoodCategory,
): readonly (readonly [string, GoodMeta])[] =>
  Object.entries(GOODS_CATALOG).filter(([, m]) => m.category === category);

/** True if a good key (either form) maps to a produced (non-RGO) good. */
export const isProducedGood = (rawName: string): boolean =>
  lookupGood(rawName)?.isRaw === false;

/** True if a good key (either form) maps to an RGO-produced good. */
export const isRawGood = (rawName: string): boolean =>
  lookupGood(rawName)?.isRaw !== false; // unknown goods default to raw
