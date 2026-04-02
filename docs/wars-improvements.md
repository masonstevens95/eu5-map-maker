# Wars Tab — Improvement Ideas

## Currently Parsed
- Active vs ended wars, casus belli, war scores
- Participants with side and join reason
- Battle history with location, date, winner, casualties

## Priority

### 1. War Names (token 11034)
Nearly free to parse. Wars would show their real in-game name instead of "TAG vs TAG".

### 2. War Exhaustion (token 11537)
One field per side. Shows how close each side is to forced peace — critical for understanding war state.

### 3. Ticking War Score (token 11063)
Explains why scores move without battles. Passive score from occupation, blockades, or time passing.

### 4. Truce Info on Ended Wars (tokens 11035, 11090-11093)
Truce days remaining, whether it was a white peace. Shows when past wars can resume.

## Backlog

- **War goal type** (12410) — explains what the attacker wants beyond the CB name
- **Peace terms** (12294, 14462) — what was agreed in ended wars
- **War reparations** (14039-41) — monetary transfers in peace deals
- **Blockade state** (12066) — naval blockade affecting war score ticking
- **Occupation tracking** (12437) — province-level occupation data
- **Separate peace** (12325) — bilateral peace with non-primary belligerents
- **War balance / momentum** (12330, 14116, 14541) — lowest war score, max from battles
- **Casualty detail** — soft casualties (11406), levy casualties (11419), MAA casualties (11420)

## Token Reference

| Token ID | Name | Notes |
|----------|------|-------|
| 11034 | war_name | Display name of the war |
| 11035 | truce_days | Days remaining in truce |
| 11063 | ticking_war_score | Passive score gain |
| 11078 | white_peace | Whether war ended in white peace |
| 11090-93 | truce_0/1/has_truce | Truce tracking |
| 11537 | war_exhaustion | Per-side exhaustion |
| 11587 | max_war_exhaustion | Cap on exhaustion |
| 11821 | monthly_war_exhaustion | Rate of exhaustion gain |
| 12066 | blockade | Naval blockade state |
| 12241 | enforce_peace | Whether winner can enforce terms |
| 12294 | peace_offer | Peace terms offered |
| 12325 | separate_peace | Bilateral peace |
| 12368-69 | war_goal_held/blocked | Goal achievability |
| 12410 | war_goal_type | Specific war goal |
| 12437 | transfer_occupation | Province occupation |
| 14039-41 | war_reparations | Post-war payments |
| 14462 | peace_treaty | Final treaty terms |
