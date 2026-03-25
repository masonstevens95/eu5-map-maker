import type { ParsedSave, RGB } from "./types";

// =============================================================================
// Individual parsing steps (exported for testing)
// =============================================================================

/** Step 1: Extract master location names from metadata (first 100 lines). */
export function parseLocationNames(lines: string[]): Record<number, string> {
  const names: Record<number, string> = {};
  for (let i = 0; i < Math.min(lines.length, 50000); i++) {
    const stripped = lines[i].trim();
    if (stripped.includes("locations={") && i < 100) {
      const allNames: string[] = [];
      const after = stripped.split("{")[1]?.trim() ?? "";
      if (after) allNames.push(...after.split(/\s+/).filter(Boolean));
      for (let j = i + 1; j < lines.length; j++) {
        const s = lines[j].trim();
        if (s.includes("}")) {
          const before = s.split("}")[0].trim();
          if (before) allNames.push(...before.split(/\s+/).filter(Boolean));
          break;
        }
        allNames.push(...s.split(/\s+/).filter(Boolean));
      }
      let idx = 0;
      for (const name of allNames) {
        const clean = name.replace(/"/g, "").replace(/}/g, "").trim();
        if (clean) names[idx++] = clean;
      }
      break;
    }
  }
  return names;
}

/** Step 2: Extract country tags (numeric ID -> 3-letter tag). */
export function parseCountryTags(lines: string[]): Record<number, string> {
  const tags: Record<number, string> = {};
  const countriesIdx = lines.findIndex((l) => l.trim() === "countries={");
  if (countriesIdx === -1) return tags;

  for (let i = countriesIdx; i < lines.length; i++) {
    if (lines[i].trim() === "tags={") {
      for (let j = i + 1; j < lines.length; j++) {
        const s = lines[j].trim();
        if (s === "}") break;
        const m = s.match(/^(\d+)=(\w+)$/);
        if (m) tags[parseInt(m[1])] = m[2];
      }
      break;
    }
  }
  return tags;
}

/** Step 3: Extract location ownership (location_id -> country_tag). */
export function parseLocationOwnership(
  lines: string[],
  countryTags: Record<number, string>,
): Record<number, string> {
  const owners: Record<number, string> = {};
  let locSectionIdx = -1;
  for (let i = 1000; i < lines.length; i++) {
    if (lines[i].trimEnd() === "locations={") {
      locSectionIdx = i;
      break;
    }
  }
  if (locSectionIdx === -1) return owners;

  let foundInner = false;
  let currentLocId: number | null = null;
  for (let i = locSectionIdx + 1; i < lines.length; i++) {
    const stripped = lines[i].trim();
    if (!foundInner && stripped === "locations={") {
      foundInner = true;
      continue;
    }
    if (!foundInner) continue;

    const locMatch = stripped.match(/^(\d+)=\{/);
    if (locMatch) { currentLocId = parseInt(locMatch[1]); continue; }

    const ownerMatch = stripped.match(/^owner=(\d+)/);
    if (ownerMatch && currentLocId !== null) {
      const ownerId = parseInt(ownerMatch[1]);
      if (countryTags[ownerId]) owners[currentLocId] = countryTags[ownerId];
      currentLocId = null;
      continue;
    }

    if (lines[i].startsWith("\t}") && !lines[i].startsWith("\t\t")) break;
  }
  return owners;
}

/** Step 4: Extract country colors (flag -> RGB) from the countries database. */
export function parseCountryColors(lines: string[]): Record<string, RGB> {
  const colors: Record<string, RGB> = {};
  let inDb = false;
  let currentFlag: string | null = null;
  for (let i = 0; i < lines.length; i++) {
    const stripped = lines[i].trim();
    if (stripped === "database={" && !inDb) { inDb = true; continue; }
    if (!inDb) continue;
    const flagMatch = stripped.match(/^flag=(\w+)$/);
    if (flagMatch) currentFlag = flagMatch[1];
    if (stripped === "color=rgb {" && currentFlag && i + 1 < lines.length) {
      const parts = lines[i + 1].trim().split(/\s+/);
      if (parts.length >= 3) {
        const r = parseInt(parts[0]), g = parseInt(parts[1]), b = parseInt(parts[2]);
        if (!isNaN(r) && !isNaN(g) && !isNaN(b)) colors[currentFlag] = [r, g, b];
      }
    }
  }
  return colors;
}

/** Step 5a: Extract country capitals from the countries database. */
export function parseCountryCapitals(lines: string[]): Record<number, number> {
  const capitals: Record<number, number> = {};
  let currentId: number | null = null;
  const countriesIdx = lines.findIndex((l) => l.trim() === "countries={");
  if (countriesIdx === -1) return capitals;

  for (let i = countriesIdx; i < lines.length; i++) {
    const stripped = lines[i].trim();
    const idMatch = stripped.match(/^(\d+)=\{$/);
    if (idMatch && lines[i].startsWith("\t\t")) {
      currentId = parseInt(idMatch[1]);
    }
    const capMatch = stripped.match(/^capital=(\d+)$/);
    if (capMatch && currentId !== null) {
      capitals[currentId] = parseInt(capMatch[1]);
    }
  }
  return capitals;
}

/** Step 5: Extract subject/vassal relationships via IOs and capital ownership. */
export function parseSubjects(
  lines: string[],
  countryTags: Record<number, string>,
  locationOwners: Record<number, string>,
  countryCapitals: Record<number, number>,
): Record<string, Set<string>> {
  const overlordSubjects: Record<string, Set<string>> = {};
  const reverseTagMap: Record<string, number> = {};
  for (const [id, tag] of Object.entries(countryTags)) {
    reverseTagMap[tag] = parseInt(id as string);
  }

  // Source 1: IO type=loc entries (reliable for lordship subjects)
  const ioStartIdx = lines.findIndex((l) => l.trimEnd() === "international_organization_manager={");
  if (ioStartIdx !== -1) {
    let ioEndIdx = lines.length;
    for (let i = ioStartIdx + 1; i < lines.length; i++) {
      if (!lines[i].startsWith("\t") && lines[i].trim() && lines[i].trim().endsWith("={")) {
        ioEndIdx = i;
        break;
      }
    }

    let currentIo: { type: string | null; leader: number | null; members: number[] } | null = null;
    for (let i = ioStartIdx; i < ioEndIdx; i++) {
      const stripped = lines[i].trim();
      if (stripped.match(/^(\d+)=\{$/) && !currentIo) {
        currentIo = { type: null, leader: null, members: [] };
        continue;
      }
      if (currentIo) {
        const typeMatch = stripped.match(/^type=(\w+)$/);
        if (typeMatch) currentIo.type = typeMatch[1];
        const leaderMatch = stripped.match(/^leader=(\d+)$/);
        if (leaderMatch) currentIo.leader = parseInt(leaderMatch[1]);
        if (stripped.startsWith("all_members={") && i + 1 < ioEndIdx) {
          const nl = lines[i + 1].trim();
          if (nl !== "}") {
            currentIo.members = nl.split(/\s+/).filter((x) => /^\d+$/.test(x)).map(Number);
          }
        }
        if (stripped === "}" && lines[i].startsWith("\t\t}")) {
          if (currentIo.type === "loc" && currentIo.leader !== null && countryTags[currentIo.leader]) {
            const leaderTag = countryTags[currentIo.leader];
            if (!overlordSubjects[leaderTag]) overlordSubjects[leaderTag] = new Set();
            for (const mid of currentIo.members) {
              if (mid !== currentIo.leader && countryTags[mid]) {
                overlordSubjects[leaderTag].add(countryTags[mid]);
              }
            }
          }
          currentIo = null;
        }
      }
    }
  }

  const alreadyMatched = new Set<string>();
  for (const subs of Object.values(overlordSubjects)) {
    for (const s of subs) alreadyMatched.add(s);
  }

  // Source 2: Capital ownership — subjects with liberty_desire whose capital
  // is owned by a different country → that country is the overlord.
  const dmStartIdx = lines.findIndex((l) => l.trimEnd() === "diplomacy_manager={");
  if (dmStartIdx !== -1) {
    let dmEndIdx = lines.length;
    for (let i = dmStartIdx + 1; i < lines.length; i++) {
      if (!lines[i].startsWith("\t") && lines[i].trim() && i > dmStartIdx + 1) {
        dmEndIdx = i;
        break;
      }
    }

    let curCountry: number | null = null;
    let hasLiberty = false;

    const flush = () => {
      if (curCountry === null || !hasLiberty) return;
      const subTag = countryTags[curCountry];
      if (!subTag || alreadyMatched.has(subTag)) return;

      const capLoc = countryCapitals[curCountry];
      if (capLoc === undefined) return;

      const capOwnerTag = locationOwners[capLoc];
      if (capOwnerTag && capOwnerTag !== subTag) {
        if (!overlordSubjects[capOwnerTag]) overlordSubjects[capOwnerTag] = new Set();
        overlordSubjects[capOwnerTag].add(subTag);
      }
    };

    for (let i = dmStartIdx; i < dmEndIdx; i++) {
      const line = lines[i];
      const stripped = line.trim();
      if (line.startsWith("\t") && !line.startsWith("\t\t")) {
        const m = stripped.match(/^(\d+)=\{$/);
        if (m) {
          flush();
          curCountry = parseInt(m[1]);
          hasLiberty = false;
        }
      }
      if (stripped.startsWith("liberty_desire=")) hasLiberty = true;
    }
    flush();
  }

  return overlordSubjects;
}

/** Step 6: Extract player countries from played_country blocks. */
export function parsePlayerCountries(
  lines: string[],
  countryTags: Record<number, string>,
): Record<string, string> {
  const players: Record<string, string> = {};
  let inBlock = false;
  let curName: string | null = null;
  let curCountry: number | null = null;
  for (const line of lines) {
    const stripped = line.trim();
    if (stripped === "played_country={") {
      inBlock = true;
      curName = null;
      curCountry = null;
      continue;
    }
    if (inBlock) {
      const nm = stripped.match(/^name="(.+?)"$/);
      if (nm) curName = nm[1];
      const cm = stripped.match(/^country=(\d+)$/);
      if (cm) curCountry = parseInt(cm[1]);
      if (stripped === "}" && !line.startsWith("\t\t")) {
        if (curName && curCountry !== null && countryTags[curCountry]) {
          players[curName] = countryTags[curCountry];
        }
        inBlock = false;
      }
    }
  }
  return players;
}

// =============================================================================
// Orchestrator
// =============================================================================

export function parseMeltedSave(text: string): ParsedSave {
  const lines = text.split("\n");

  const locationNames = parseLocationNames(lines);
  const countryTags = parseCountryTags(lines);
  const locationOwners = parseLocationOwnership(lines, countryTags);
  const countryColors = parseCountryColors(lines);
  const countryCapitals = parseCountryCapitals(lines);
  const overlordSubjects = parseSubjects(lines, countryTags, locationOwners, countryCapitals);
  const playerCountries = parsePlayerCountries(lines, countryTags);

  const countryLocations: Record<string, string[]> = {};
  for (const [locIdStr, tag] of Object.entries(locationOwners)) {
    const locId = parseInt(locIdStr);
    const name = locationNames[locId] ?? `loc_${locId}`;
    if (!countryLocations[tag]) countryLocations[tag] = [];
    countryLocations[tag].push(name);
  }

  const tagToPlayers: Record<string, string[]> = {};
  for (const [name, tag] of Object.entries(playerCountries)) {
    if (!tagToPlayers[tag]) tagToPlayers[tag] = [];
    tagToPlayers[tag].push(name);
  }

  return { countryLocations, tagToPlayers, countryColors, overlordSubjects };
}
