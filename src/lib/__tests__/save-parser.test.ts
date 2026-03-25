import { describe, it, expect } from "vitest";
import {
  parseLocationNames,
  parseCountryTags,
  parseLocationOwnership,
  parseCountryColors,
  parseCountryCapitals,
  parseSubjects,
  parsePlayerCountries,
  parseMeltedSave,
} from "../save-parser";
import { buildMinimalSave } from "./fixtures/minimal-save";

describe("parseLocationNames", () => {
  it("extracts location names from metadata", () => {
    const lines = [
      "metadata={",
      "\tcompatibility={",
      "\t\tlocations={",
      "\t\t\tstockholm paris london",
      "\t\t}",
      "\t}",
      "}",
    ];
    const result = parseLocationNames(lines);
    expect(result).toEqual({ 0: "stockholm", 1: "paris", 2: "london" });
  });

  it("handles locations on same line as brace", () => {
    const lines = [
      "metadata={",
      "\tlocations={ rome vienna",
      "\t\tberlin }",
      "}",
    ];
    const result = parseLocationNames(lines);
    expect(result).toEqual({ 0: "rome", 1: "vienna", 2: "berlin" });
  });

  it("strips quotes from location names", () => {
    const lines = ['locations={ "moscow" "tokyo" }'];
    const result = parseLocationNames(lines);
    expect(result).toEqual({ 0: "moscow", 1: "tokyo" });
  });

  it("returns empty for no locations block", () => {
    expect(parseLocationNames(["metadata={", "}"])).toEqual({});
  });

  it("ignores locations block past line 100", () => {
    const lines = new Array(101).fill("").concat(["locations={ late_location }"]);
    expect(parseLocationNames(lines)).toEqual({});
  });
});

describe("parseCountryTags", () => {
  it("extracts tag mapping", () => {
    const lines = [
      "countries={",
      "\ttags={",
      "\t\t0=SWE",
      "\t\t1=FRA",
      "\t\t42=ENG",
      "\t}",
      "}",
    ];
    expect(parseCountryTags(lines)).toEqual({ 0: "SWE", 1: "FRA", 42: "ENG" });
  });

  it("returns empty when no countries section", () => {
    expect(parseCountryTags(["other_stuff={", "}"])).toEqual({});
  });

  it("handles non-sequential IDs", () => {
    const lines = ["countries={", "\ttags={", "\t\t5=AAA", "\t\t100=BBB", "\t}", "}"];
    expect(parseCountryTags(lines)).toEqual({ 5: "AAA", 100: "BBB" });
  });
});

describe("parseLocationOwnership", () => {
  it("extracts ownership from locations section past line 1000", () => {
    const padding = new Array(1005).fill("");
    const lines = [
      ...padding,
      "locations={",
      "\tlocations={",
      "\t\t0={",
      "\t\t\towner=1",
      "\t\t}",
      "\t\t3={",
      "\t\t\towner=0",
      "\t\t}",
      "\t}",
      "}",
    ];
    const tags = { 0: "SWE", 1: "FRA" };
    const result = parseLocationOwnership(lines, tags);
    expect(result).toEqual({ 0: "FRA", 3: "SWE" });
  });

  it("skips owners not in country tags", () => {
    const padding = new Array(1005).fill("");
    const lines = [...padding, "locations={", "\tlocations={", "\t\t0={", "\t\t\towner=999", "\t\t}", "\t}", "}"];
    expect(parseLocationOwnership(lines, { 0: "SWE" })).toEqual({});
  });

  it("returns empty if no locations section past line 1000", () => {
    const lines = ["locations={", "\tlocations={", "\t\t0={", "\t\t\towner=0", "\t\t}", "\t}", "}"];
    expect(parseLocationOwnership(lines, { 0: "SWE" })).toEqual({});
  });
});

describe("parseCountryColors", () => {
  it("extracts RGB colors keyed by flag", () => {
    const lines = [
      "database={",
      "\t0={",
      "\t\tflag=SWE",
      "\t\tcolor=rgb {",
      "\t\t\t0 0 255",
      "\t\t}",
      "\t}",
      "\t1={",
      "\t\tflag=FRA",
      "\t\tcolor=rgb {",
      "\t\t\t33 33 173",
      "\t\t}",
      "\t}",
      "}",
    ];
    expect(parseCountryColors(lines)).toEqual({
      SWE: [0, 0, 255],
      FRA: [33, 33, 173],
    });
  });

  it("handles flag appearing before color (any distance)", () => {
    const lines = [
      "database={",
      "\tflag=ENG",
      "\tsome_field=value",
      "\tanother=42",
      "\tcolor=rgb {",
      "\t\t255 0 0",
      "\t}",
      "}",
    ];
    expect(parseCountryColors(lines)).toEqual({ ENG: [255, 0, 0] });
  });

  it("returns empty when no database section", () => {
    expect(parseCountryColors(["no_database={}"])).toEqual({});
  });
});

describe("parseCountryCapitals", () => {
  it("extracts country ID -> capital location ID", () => {
    const lines = [
      "countries={",
      "\tdatabase={",
      "\t\t0={",
      "\t\t\tcapital=100",
      "\t\t}",
      "\t\t1={",
      "\t\t\tcapital=200",
      "\t\t}",
      "\t}",
      "}",
    ];
    expect(parseCountryCapitals(lines)).toEqual({ 0: 100, 1: 200 });
  });

  it("returns empty when no countries section", () => {
    expect(parseCountryCapitals(["other={}"])).toEqual({});
  });
});

describe("parseSubjects", () => {
  const baseTags = { 0: "ENG", 1: "FRA", 2: "SWE", 3: "SCO", 4: "WLS" };

  it("extracts IO type=loc subjects", () => {
    const lines = [
      "international_organization_manager={",
      "\tdatabase={",
      "\t\t0={",
      "\t\t\ttype=loc",
      "\t\t\tleader=0",
      "\t\t\tall_members={",
      "\t\t\t\t0 3 4",
      "\t\t\t}",
      "\t\t}",
      "\t}",
      "}",
      "next_section={",
    ];
    const result = parseSubjects(lines, baseTags, {}, {});
    expect(result["ENG"]).toEqual(new Set(["SCO", "WLS"]));
  });

  it("ignores non-loc IO types", () => {
    const lines = [
      "international_organization_manager={",
      "\tdatabase={",
      "\t\t0={",
      "\t\t\ttype=hre",
      "\t\t\tleader=0",
      "\t\t\tall_members={",
      "\t\t\t\t0 1 2",
      "\t\t\t}",
      "\t\t}",
      "\t}",
      "}",
      "next_section={",
    ];
    expect(parseSubjects(lines, baseTags, {}, {})).toEqual({});
  });

  it("matches subjects to overlords via capital ownership", () => {
    const lines = [
      "diplomacy_manager={",
      "\t3={",
      "\t\tliberty_desire=10",
      "\t}",
      "}",
      "next={",
    ];
    // SCO (3) has capital at location 50, which is owned by ENG
    const locationOwners = { 50: "ENG" };
    const capitals = { 3: 50 };
    const result = parseSubjects(lines, baseTags, locationOwners, capitals);
    expect(result["ENG"]).toEqual(new Set(["SCO"]));
  });

  it("skips capital-ownership subjects already matched by IO", () => {
    const lines = [
      "international_organization_manager={",
      "\tdatabase={",
      "\t\t0={",
      "\t\t\ttype=loc",
      "\t\t\tleader=0",
      "\t\t\tall_members={",
      "\t\t\t\t0 3",
      "\t\t\t}",
      "\t\t}",
      "\t}",
      "}",
      "diplomacy_manager={",
      "\t3={",
      "\t\tliberty_desire=10",
      "\t}",
      "}",
      "next={",
    ];
    // SCO's capital owned by FRA — but SCO is already matched to ENG via IO
    const result = parseSubjects(lines, baseTags, { 50: "FRA" }, { 3: 50 });
    expect(result["ENG"]).toEqual(new Set(["SCO"]));
    expect(result["FRA"]).toBeUndefined();
  });

  it("skips subjects whose capital is self-owned", () => {
    const lines = [
      "diplomacy_manager={",
      "\t3={",
      "\t\tliberty_desire=10",
      "\t}",
      "}",
      "next={",
    ];
    // SCO's capital is owned by SCO itself
    const result = parseSubjects(lines, baseTags, { 50: "SCO" }, { 3: 50 });
    expect(result).toEqual({});
  });

  it("returns empty when no IO or diplomacy sections", () => {
    expect(parseSubjects(["nothing here"], baseTags, {}, {})).toEqual({});
  });
});

describe("parsePlayerCountries", () => {
  const tags = { 0: "SWE", 1: "FRA" };

  it("extracts player name -> tag mapping", () => {
    const lines = [
      "played_country={",
      '\tname="Alice"',
      "\tcountry=0",
      "}",
      "played_country={",
      '\tname="Bob"',
      "\tcountry=1",
      "}",
    ];
    expect(parsePlayerCountries(lines, tags)).toEqual({ Alice: "SWE", Bob: "FRA" });
  });

  it("last entry wins for same player", () => {
    const lines = [
      "played_country={",
      '\tname="Alice"',
      "\tcountry=0",
      "}",
      "played_country={",
      '\tname="Alice"',
      "\tcountry=1",
      "}",
    ];
    expect(parsePlayerCountries(lines, tags)).toEqual({ Alice: "FRA" });
  });

  it("skips entries with unknown country IDs", () => {
    const lines = ["played_country={", '\tname="Alice"', "\tcountry=999", "}"];
    expect(parsePlayerCountries(lines, tags)).toEqual({});
  });

  it("returns empty for no played_country blocks", () => {
    expect(parsePlayerCountries(["nothing"], tags)).toEqual({});
  });
});

describe("parseMeltedSave (integration)", () => {
  it("parses a complete minimal save", () => {
    const save = buildMinimalSave({
      locationNames: ["stockholm", "paris", "london"],
      tags: { 0: "SWE", 1: "FRA", 2: "ENG" },
      ownership: { 0: 0, 1: 1, 2: 2 },
      colors: { SWE: [0, 0, 255], FRA: [33, 33, 173], ENG: [255, 0, 0] },
      players: [{ name: "Alice", country: 0 }, { name: "Bob", country: 1 }],
    });
    const result = parseMeltedSave(save);

    expect(result.countryLocations).toEqual({
      SWE: ["stockholm"],
      FRA: ["paris"],
      ENG: ["london"],
    });
    expect(result.tagToPlayers).toEqual({
      SWE: ["Alice"],
      FRA: ["Bob"],
    });
    expect(result.countryColors).toEqual({
      SWE: [0, 0, 255],
      FRA: [33, 33, 173],
      ENG: [255, 0, 0],
    });
  });

  it("includes IO vassal relationships", () => {
    const save = buildMinimalSave({
      locationNames: ["stockholm", "edinburgh"],
      tags: { 0: "ENG", 1: "SCO" },
      ownership: { 0: 0, 1: 1 },
      ioVassals: [{ leader: 0, members: [0, 1] }],
    });
    const result = parseMeltedSave(save);
    expect(result.overlordSubjects["ENG"]).toEqual(new Set(["SCO"]));
  });

  it("detects vassals via capital ownership", () => {
    const save = buildMinimalSave({
      locationNames: ["london", "cardiff"],
      tags: { 0: "ENG", 1: "WLS" },
      ownership: { 0: 0, 1: 0 }, // ENG owns both locations including WLS's capital
      colors: { ENG: [255, 0, 0], WLS: [0, 255, 0] },
      capitals: { 0: 0, 1: 1 }, // WLS capital = location 1, owned by ENG
      diplomacySubjects: [{ countryId: 1, libertyDesire: -14, relations: [] }],
    });
    const result = parseMeltedSave(save);
    expect(result.overlordSubjects["ENG"]).toEqual(new Set(["WLS"]));
  });

  it("handles empty save gracefully", () => {
    const result = parseMeltedSave("");
    expect(result.countryLocations).toEqual({});
    expect(result.tagToPlayers).toEqual({});
    expect(result.countryColors).toEqual({});
    expect(result.overlordSubjects).toEqual({});
  });

  it("maps location IDs to names", () => {
    const save = buildMinimalSave({
      locationNames: ["rome", "naples"],
      tags: { 0: "PAP" },
      ownership: { 0: 0, 1: 0 },
    });
    const result = parseMeltedSave(save);
    expect(result.countryLocations["PAP"]).toEqual(["rome", "naples"]);
  });

  it("uses loc_N fallback for unmapped location IDs", () => {
    const save = buildMinimalSave({
      locationNames: ["rome"],
      tags: { 0: "PAP" },
      ownership: { 0: 0, 5: 0 }, // ID 5 has no name
    });
    const result = parseMeltedSave(save);
    expect(result.countryLocations["PAP"]).toContain("rome");
    expect(result.countryLocations["PAP"]).toContain("loc_5");
  });
});
