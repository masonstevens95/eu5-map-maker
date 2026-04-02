# Countries Parser — Unparsed Fields & Improvement Ideas

## Currently Parsed Per Country

**Identity:** name, government type, court language, score/rank, level
**Economy:** gold, manpower, sailors, stability, prestige, monthly income/trade/tax, population
**Military (capacity):** max manpower/sailors, monthly generation, maintenance, expected army/navy size, frontage
**Military (forces):** infantry/cavalry/artillery count+strength, levy count+strength, ships by type

## Binary Format Tokens vs Game Tokens

When melting a save with external tools, many values appear as `unknown_0xXXX`. Most of these are **binary format markers**, not unknown game data:

| Hex | What it actually is | Status |
|-----|-------------------|--------|
| `0x0d3e` | `LOOKUP_U16` — 16-bit string lookup token type | Handled correctly by TokenReader |
| `0x0d40` | `LOOKUP_U8` — 8-bit string lookup token type | Handled correctly |
| `0x0d41` | `LOOKUP_U24` — 24-bit string lookup token type | Handled correctly |
| `0x0d48-0x0d55` | `FIXED5` — fixed-point number encoding (1-7 byte variants) | Handled correctly |
| `0x2575`, `0x2576`, etc. | String lookup **indices** into the dynamic string table (e.g., "ENG", "FRA") | Handled correctly — resolved via `string_lookup` |

These show as "unknown" in external melters that don't understand EU5's binary format, but our parser handles them all correctly.

### Hardcoded Engine Tokens (not in eu5-tokens.json, but working)
| Hex | Used as | File | Line |
|-----|---------|------|------|
| `0x00e1` | TYPE_ENGINE (gov type) | country-identity.ts | 31 |
| `0xe1` | TYPE (unit type) | units.ts | 78 |
| `0x2ffa` | SUBJECT_TYPE | dependencies.ts | 16 |
| `0x8d` | TOTAL_PRODUCTION | trade.ts | 56 |
| `0x32` | CENTER_LOCATION | trade.ts | 60 |
| `0x33` | SIDE | wars.ts | 52 |

These are engine-level tokens (low IDs) that aren't in the game token map but are correctly handled via hardcoded constants.

## Unknown / Skipped Data in Current Parser

### Token Map Gap
There is a **massive gap** in `eu5-tokens.json` from ID 3372 (`desc_sort_order`, 0xd2c) to 9996 (`use_template`, 0x270c) — **6,624 missing token IDs**. Any game token in this range shows as `unknown_0xXXX` in melted output. These may include newer game tokens added in patches that our token map doesn't cover.

### Silently Skipped Data
| File | Line | What's Skipped |
|------|------|----------------|
| economy.ts | 117 | Any `currency_data` FIXED5 field not gold/manpower/sailors/stability/prestige — **this is where legitimacy, inflation, and other economy fields are discarded** |
| country-stats.ts | 130 | Any country field not in the 14 known mappings |
| countries.ts | 159 | Any country field besides flag/color/capital/subject_tax |
| units.ts | 192 | Navy strength values — ships counted but strength always 0 |
| units.ts | 196 | Units with unresolvable owner country IDs |
| units.ts | 303 | Frontage data for unresolvable country IDs |
| diplomacy.ts | 27 | Diplomacy entries without liberty_desire field |
| locations.ts | 62 | Locations with unresolvable owner IDs |
| countries.ts | 74 | Empty tag values in country tag reader |
| countries.ts | 187 | Color values that aren't valid RGB blocks |

### Key Insight
The `currency_data` block in `economy.ts` is the biggest opportunity. It loops over many FIXED5 fields but only extracts 5 (gold, manpower, sailors, stability, prestige). Fields like legitimacy, inflation, monthly_legitimacy are being read and thrown away in the `else` branch at line 117.

## Priority Additions

### 1. Legitimacy (token 12198)
Single numeric field in currency_data. Shows ruler legitimacy — critical for understanding political stability. `monthly_legitimacy` (12203) also available.

### 2. Primary Culture (token 13764)
Country's primary culture. Minimal parse cost, valuable for cultural diversity maps and filtering.

### 3. Religion (token 10236)
Country/location religion. Same category as culture — cheap to parse, useful for religious maps.

### 4. Diplomatic Reputation (token 12426)
Single numeric field. Shows diplomatic standing — useful alongside alliance/subject data.

### 5. Inflation (token 11986)
Current inflation rate. Affects real economic power. `monthly_inflation` (11988) also available.

## Backlog

### Politics / Stability
| Token | Name | Notes |
|-------|------|-------|
| 12198 | legitimacy | Ruler legitimacy rating |
| 12203 | monthly_legitimacy | Rate of change |
| 15583 | unrest | Global country unrest |
| 12623 | local_unrest | Per-location unrest |
| 11819 | stability_investment | Progress toward next stability |
| 11820 | stability_decay | Rate of stability loss |

### Demographics
| Token | Name | Notes |
|-------|------|-------|
| 13764 | primary_culture | Country's primary culture |
| 10228 | culture | Location-level culture |
| 10236 | religion | Country/location religion |
| 12123 | technology | Tech group or level |

### Economics
| Token | Name | Notes |
|-------|------|-------|
| 11986 | inflation | Current inflation rate |
| 11988 | monthly_inflation | Monthly inflation change |
| 11969 | loans | Outstanding loans |
| 11968 | interest | Loan interest rate |
| 11866 | development | Location development value |
| 12581 | merchant | Trade merchant assignments |
| 13320 | merchants | Merchant count/summary |
| 13782 | merchant_capacity | Max merchants |

### Diplomacy
| Token | Name | Notes |
|-------|------|-------|
| 12426 | diplomatic_reputation | Reputation score |
| 12435 | royal_marriage | Active royal marriages |
| 12276 | alliance | Alliance relationships |
| 12261 | guarantees | Guarantees given |
| 12262 | guaranteed_by | Guarantees received |

### Governance
| Token | Name | Notes |
|-------|------|-------|
| 11763 | ruler | Current ruler details (nested) |
| 11765 | heir | Heir data (nested) |
| 14670 | regent | Regent assignment |
| 14604 | advisor | Active advisors |
| 12174 | government_reform_slots | Reform capacity |
| 12175 | reforms | Active government reforms |
| 11920 | estate | Estate/faction data |
| 11941 | satisfaction | Estate satisfaction levels |
| 12446 | great_power | Great power status/manager |

## Structural Notes
- All currently parsed fields are stable — no known parsing bugs
- Prestige and stability are already parsed from `currency_data`
- Legitimacy and inflation live in the same `currency_data` block — easiest to add
- Culture and religion require scanning country identity blocks
- Diplomacy fields require scanning the diplomacy section, not the country block
- Development is per-location, not per-country — would need aggregation across all owned locations
