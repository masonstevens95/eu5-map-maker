/**
 * Country database reader — orchestrates reading identity, economy,
 * and military stats from country entries.
 *
 * All functions are pure arrow expressions with immutable variables.
 * No null, no exceptions, every if has an else.
 */

import { TokenReader } from "../token-reader";
import { BinaryToken, isValueToken, valuePayloadSize } from "../tokens";
import { tokenId } from "../token-names";
import { isFixed5, readFixed5, readFixed5AtOffset } from "./fixed5";
import { IDENTITY_FIELDS, readIdentityAtOffsets } from "./country-identity";
import type { CountryIdentity } from "./country-identity";

// =============================================================================
// Types
// =============================================================================

export interface EconomyStats {
  readonly gold: number;
  readonly manpower: number;
  readonly sailors: number;
  readonly stability: number;
  readonly prestige: number;
  readonly monthlyIncome: number;
  readonly monthlyTradeValue: number;
  readonly monthlyTaxIncome: number;
  readonly population: number;
}

export interface MilitaryStats {
  readonly maxManpower: number;
  readonly maxSailors: number;
  readonly armyMaintenance: number;
  readonly navyMaintenance: number;
  readonly expectedArmySize: number;
  readonly expectedNavySize: number;
}

export interface CountryEconomy extends CountryIdentity, EconomyStats, MilitaryStats {
  readonly countryName: string;
}

// =============================================================================
// Token IDs
// =============================================================================

const CURRENCY_DATA = tokenId("currency_data") ?? -1;
const GOLD = tokenId("gold") ?? -1;
const MANPOWER = tokenId("manpower") ?? -1;
const SAILORS = tokenId("sailors") ?? -1;
const STABILITY = tokenId("stability") ?? -1;
const PRESTIGE = tokenId("prestige") ?? -1;
const EST_MONTHLY_INCOME = tokenId("estimated_monthly_income") ?? -1;
const MONTHLY_TRADE_VALUE = tokenId("monthly_trade_value") ?? -1;
const LAST_MONTHS_TAX = tokenId("last_months_tax_income") ?? -1;
const MAX_MANPOWER = tokenId("max_manpower") ?? -1;
const MAX_SAILORS = tokenId("max_sailors") ?? -1;
const LAST_MONTHS_POP = tokenId("last_months_population") ?? -1;
const ARMY_MAINT = tokenId("last_months_army_maintenance") ?? -1;
const NAVY_MAINT = tokenId("last_months_navy_maintenance") ?? -1;
const EXPECTED_ARMY = tokenId("expected_army_size") ?? -1;
const EXPECTED_NAVY = tokenId("expected_navy_size") ?? -1;

// =============================================================================
// Defaults
// =============================================================================

export const emptyEconomyStats = (): EconomyStats => ({
  gold: 0, manpower: 0, sailors: 0, stability: 0, prestige: 0,
  monthlyIncome: 0, monthlyTradeValue: 0, monthlyTaxIncome: 0, population: 0,
});

export const emptyMilitaryStats = (): MilitaryStats => ({
  maxManpower: 0, maxSailors: 0, armyMaintenance: 0, navyMaintenance: 0,
  expectedArmySize: 0, expectedNavySize: 0,
});

export const emptyEconomy = (): CountryEconomy => ({
  countryName: "", level: -1, govType: "", courtLanguage: "", score: 0,
  ...emptyEconomyStats(),
  ...emptyMilitaryStats(),
});

// Re-export for backward compatibility
export { readFixed5 } from "./fixed5";

// =============================================================================
// Currency data reader
// =============================================================================

/**
 * Read currency_data block contents.
 * Structure: field = FIXED5_value (no braces around individual values).
 */
const readCurrencyData = (
  r: TokenReader,
  data: Uint8Array,
): Pick<EconomyStats, "gold" | "manpower" | "sailors" | "stability" | "prestige"> => {
  let gold = 0;
  let manpower = 0;
  let sailors = 0;
  let stability = 0;
  let prestige = 0;

  let depth = 1;
  while (!r.done && depth > 0) {
    const tok = r.readToken();
    if (tok === BinaryToken.CLOSE) { depth--; continue; }
    else if (tok === BinaryToken.OPEN) { depth++; continue; }
    else if (tok === BinaryToken.EQUAL) { continue; }
    else if (isValueToken(tok)) {
      r.skipValuePayload(tok);
      continue;
    } else {
      /* field name token */
    }

    if (depth === 1 && r.peekToken() === BinaryToken.EQUAL) {
      const fieldTok = tok;
      r.readToken(); // =
      const valTok = r.peekToken();
      if (isFixed5(valTok)) {
        r.readToken();
        const size = valuePayloadSize(valTok, data, r.pos);
        const val = readFixed5(data, r.pos, valTok);
        r.pos += size;

        if (fieldTok === GOLD) { gold = val; }
        else if (fieldTok === MANPOWER) { manpower = val; }
        else if (fieldTok === SAILORS) { sailors = val; }
        else if (fieldTok === STABILITY) { stability = val; }
        else if (fieldTok === PRESTIGE) { prestige = val; }
        else { /* other currency field — skip */ }
      } else {
        r.skipValue();
      }
    } else {
      /* not a field assignment at depth 1 */
    }
  }

  return { gold, manpower, sailors, stability, prestige };
};

// =============================================================================
// Main reader
// =============================================================================

/**
 * Read all country data from the database section.
 * Single two-pass scan per country: find offsets, then read values.
 */
export const readCountryEconomies = (
  r: TokenReader,
  data: Uint8Array,
  countryTags: Readonly<Record<number, string>>,
): Record<string, CountryEconomy> => {
  const result: Record<string, CountryEconomy> = {};

  while (!r.done) {
    const tok = r.peekToken();
    if (tok === BinaryToken.CLOSE) { r.readToken(); return result; }

    if (tok === BinaryToken.I32 || tok === BinaryToken.U32) {
      r.readToken();
      const id = tok === BinaryToken.I32 ? r.readI32() : r.readU32();
      r.expectEqual();
      if (!r.expectOpen()) { r.skipValue(); continue; }

      const tag = countryTags[id] ?? "";
      if (tag === "") { r.skipBlock(); continue; }

      // Pass 1: find field offsets
      const entryStart = r.pos;
      r.skipBlock();
      const entryEnd = r.pos;

      r.pos = entryStart;
      let depth = 1;
      let currencyOffset = -1;
      let nameOffset = -1;
      let scoreOffset = -1;
      let gpRankOffset = -1;
      let levelOffset = -1;
      let govOffset = -1;
      let courtLangOffset = -1;
      let incomeOffset = -1;
      let tradeOffset = -1;
      let taxOffset = -1;
      let maxMpOffset = -1;
      let maxSailOffset = -1;
      let popOffset = -1;
      let armyMaintOffset = -1;
      let navyMaintOffset = -1;
      let expArmyOffset = -1;
      let expNavyOffset = -1;

      while (r.pos < entryEnd && depth > 0) {
        const fp = r.pos;
        const ft = r.readToken();
        if (ft === BinaryToken.CLOSE) { depth--; continue; }
        else if (ft === BinaryToken.OPEN) { depth++; continue; }
        else if (ft === BinaryToken.EQUAL) { continue; }
        else if (isValueToken(ft)) { r.skipValuePayload(ft); continue; }
        else { /* field name */ }

        if (depth === 1 && r.peekToken() === BinaryToken.EQUAL) {
          // Identity fields
          if (ft === IDENTITY_FIELDS.COUNTRY_NAME) { nameOffset = fp; }
          else if (ft === IDENTITY_FIELDS.LEVEL) { levelOffset = fp; }
          else if (ft === IDENTITY_FIELDS.GOVERNMENT) { govOffset = fp; }
          else if (ft === IDENTITY_FIELDS.COURT_LANG) { courtLangOffset = fp; }
          else if (ft === IDENTITY_FIELDS.SCORE) { scoreOffset = fp; }
          else if (ft === IDENTITY_FIELDS.GREAT_POWER_RANK) { gpRankOffset = fp; }
          // Economy fields
          else if (ft === CURRENCY_DATA) { currencyOffset = fp; }
          else if (ft === EST_MONTHLY_INCOME) { incomeOffset = fp; }
          else if (ft === MONTHLY_TRADE_VALUE) { tradeOffset = fp; }
          else if (ft === LAST_MONTHS_TAX) { taxOffset = fp; }
          else if (ft === LAST_MONTHS_POP) { popOffset = fp; }
          // Military fields
          else if (ft === MAX_MANPOWER) { maxMpOffset = fp; }
          else if (ft === MAX_SAILORS) { maxSailOffset = fp; }
          else if (ft === ARMY_MAINT) { armyMaintOffset = fp; }
          else if (ft === NAVY_MAINT) { navyMaintOffset = fp; }
          else if (ft === EXPECTED_ARMY) { expArmyOffset = fp; }
          else if (ft === EXPECTED_NAVY) { expNavyOffset = fp; }
          else { /* other field */ }
          r.readToken();
          r.skipValue();
        }
      }

      // Pass 2: read values using domain-specific readers
      const identity = readIdentityAtOffsets(r, tag, {
        nameOffset, levelOffset, govOffset, courtLangOffset, scoreOffset, gpRankOffset,
      });

      // Currency data (gold, manpower, sailors, stability, prestige)
      let econ = emptyEconomyStats();
      if (currencyOffset >= 0) {
        r.pos = currencyOffset;
        r.readToken(); r.expectEqual(); r.expectOpen();
        const currencies = readCurrencyData(r, data);
        econ = { ...econ, ...currencies };
      }

      // FIXED5 economy fields
      econ = {
        ...econ,
        monthlyIncome: readFixed5AtOffset(r, data, incomeOffset),
        monthlyTradeValue: readFixed5AtOffset(r, data, tradeOffset),
        monthlyTaxIncome: readFixed5AtOffset(r, data, taxOffset),
        population: readFixed5AtOffset(r, data, popOffset),
      };

      // Military stats
      const military: MilitaryStats = {
        maxManpower: readFixed5AtOffset(r, data, maxMpOffset),
        maxSailors: readFixed5AtOffset(r, data, maxSailOffset),
        armyMaintenance: readFixed5AtOffset(r, data, armyMaintOffset),
        navyMaintenance: readFixed5AtOffset(r, data, navyMaintOffset),
        expectedArmySize: readFixed5AtOffset(r, data, expArmyOffset),
        expectedNavySize: readFixed5AtOffset(r, data, expNavyOffset),
      };

      result[tag] = { ...identity, ...econ, ...military };
      r.pos = entryEnd;
    } else {
      r.readToken();
      if (r.peekToken() === BinaryToken.EQUAL) { r.readToken(); r.skipValue(); }
    }
  }

  return result;
};
