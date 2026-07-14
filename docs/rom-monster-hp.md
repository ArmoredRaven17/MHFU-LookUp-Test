# MHFU Monster HP — ROM extraction (2026-07-12)

**Deterministic. No random roll, and NO player-count scaling** (MHFU is not like the newer titles — a quest's monster stats are fixed regardless of party size; Village = solo, Gathering Hall = multiplayer-balanced, but neither adjusts per player). Guides show HP as a "range" only because it spans a monster's *different quests* (low-star → G-rank).

**Unified HP rule:** `maxHP = quest_authored_HP  if  ctx+0x114 != 0,  else  round( base_HP[type] × HP_mult )`.
Every quest can override the monster's HP with a fixed value in the quest parameter block at `*(0x08A62D9C)+0x114` (0 = use the formula). Standard quests use the formula; elders, Fatalis, and boosted event/G quests author a custom value there.

For formula quests, each quest selects one **multiplier row** `[HP_mult, atk_mult, def_mult, ?]` keyed by `(sidx, idx2, tier)`:
- `HP  = round( base_HP[type] × HP_mult )`   (base_HP per-monster)
- `atk = round( 100 × atk_mult )`   ·   `def = round( 100 × def_mult )`   (base atk/def = 100, global)

Validated: 499/563 community (HP,atk,def) rows match a formula row. The mismatches are NOT errors — they are **quest-authored quests** (confirmed live: Rusted Kushala ctx+0x114=8400, White Fatalis ctx+0x114=26000, both = community). Community HP data is therefore trustworthy; the formula just can't reproduce authored quests.

**RETRACTED:** an earlier draft proposed 8 formula-inferred HP "corrections". These are invalid — the White Fatalis live read (community 26000 = authored, not the formula's 26666) showed atk/def can coincidentally pin a formula row for an authored quest. Do not apply formula-inferred corrections; only a live `ctx+0x114`/maxHP read per quest is ROM-authoritative.

## Anchors / addresses (f0071 overlay `game_task.ovl`, session runtime base 0x09A5F300)

- Entity: current HP `+0x2E4` (i16), **max HP `+0x41E`** (i16), type id `+0x1E8`, quest tier `+0x4BC` (s8).
- HP-init: `0x09AC76A0` → `jal 0x09AC9120` (level arg=0) → writes result to `+0x2E4` and `+0x41E`.
- **base_HP table**: file `0x1597B0`, 464-byte (0x1D0) records, indexed by type. HP = i16 @ `file 0x1598B0 + type*0x1D0`.
- Multiplier table: sidx=u8 @ rec+0x14F → ptr `*(0x09BC7F80 + sidx*4)` → `*(ptr + idx2*4)` → row of 4 floats @ `+tier*16` = `[HP_mult, atk_mult, def_mult, ?]`. (idx2/tier are the per-quest difficulty selector — NOT player count.)
- **type→name link**: rec+0x10C → ptr-list → monster's hitzone block(s) (block+1 = first-part 9 bytes). Matched vs ROM-verified hitzones.

## type id → monster → base_HP (60/60 — Yama Tsukami = type 58, base 26666, live-validated 18666=26666×0.7)

| type | monster | base_HP |
|---|---|---|
| 1 | Rathian | 4000 |
| 2 | White Fatalis | 26666 |
| 6 | Yian Kut-Ku | 1600 |
| 7 | Ashen Lao-Shan Lung | 26666 |
| 8 | Cephadrome | 1600 |
| 11 | Rathalos | 3200 |
| 14 | Diablos | 4000 |
| 15 | Khezu | 3200 |
| 17 | Gravios | 4000 |
| 20 | Gypceros | 2400 |
| 21 | Plesioth | 4000 |
| 22 | Basarios | 2400 |
| 26 | Monoblos | 4000 |
| 27 | Velocidrome | 800 |
| 28 | Gendrome | 1200 |
| 31 | Iodrome | 1600 |
| 33 | Kirin | 3200 |
| 36 | Crimson Fatalis | 20000 |
| 37 | Pink Rathian | 4400 |
| 38 | Blue Yian Kut-Ku | 2800 |
| 39 | Purple Gypceros | 2800 |
| 40 | Yian Garuga (One Eyed) | 3800 |
| 41 | Silver Rathalos | 4000 |
| 42 | Gold Rathian | 4400 |
| 43 | Black Diablos | 4400 |
| 44 | White Monoblos | 6000 |
| 45 | Red Khezu | 3600 |
| 46 | Green Plesioth | 4400 |
| 47 | Black Gravios | 4400 |
| 48 | Daimyo Hermitaur | 2400 |
| 49 | Azure Rathalos | 3600 |
| 50 | Lao-Shan Lung | 26666 |
| 51 | Blangonga | 2800 |
| 52 | Congalala | 2800 |
| 53 | Golden Rajang | 3600 |
| 54 | Kushala Daora | 4800 |
| 55 | Shen Gaoren | 20000 |
| 59 | Chameleos | 5600 |
| 60 | Rusted Kushala Daora | 4800 |
| 64 | Lunastra | 4800 |
| 65 | Teostra | 4800 |
| 67 | Shogun Ceanataur | 3200 |
| 68 | Bulldrome | 1200 |
| 71 | Fatalis | 20000 |
| 75 | Tigrex | 4000 |
| 76 | Akantor | 12000 |
| 77 | Giadrome | 800 |
| 78 | Yian Garuga | 4000 |
| 79 | King Shakalaka | 800 |
| 80 | Vespoid Queen | 1800 |
| 81 | Nargacuga | 3600 |
| 82 | Hypnocatrice | 2600 |
| 83 | Lavasioth | 4000 |
| 84 | Copper Blangonga | 3400 |
| 85 | Emerald Congalala | 3000 |
| 86 | Plum Daimyo Hermitaur | 3150 |
| 87 | Terra Shogun Ceanataur | 3700 |
| 88 | Ukanlos | 12000 |
| 89 | Rajang | 3600 |

## Live validation

- Rathalos (Low 2★): type 11, base 3200 × 0.7 = 2240 = community ✓
- Basarios (Low 4★): type 22, base 2400 × 1.1 = 2640 = community ✓
- 51/59 monsters reconstruct on a clean 0.05 multiplier grid; 6 elders (Chameleos/Kushala/Lunastra/Rusted Kushala/Teostra + Rusted) use a higher multiplier band off the same base — consistent.

## Community values flagged as likely errors (lone off-grid value in an otherwise-clean set)

- **Blangonga** 2030 (base 2800 → 0.725; neighbors clean at 0.05 steps)
- **Blue Yian Kut-Ku** 2184 (base 2800 → 0.78)
- **White Fatalis** 26000 (base 26666 → 0.975)

These are candidates to correct from ROM once the multiplier tables are fully extracted. NOT yet asserted — verify.

## atk / def — CRACKED (same table)
The multiplier row's col1/col2 are atk/def multipliers; `atk = 100×col1`, `def = 100×col2` (base atk=def=100, effectively global — the per-quest variation is entirely the row). Full sidx=1 table (idx2 0–2, tiers 0–27) extracted; def_mult reaches 0.6–0.7 at G-tiers matching community def 60–70. 499/563 joint match.

## Elder dragons — RESOLVED (HP is quest-authored)
- **Flying elders** (Kushala, Lunastra, Teostra, Chameleos, Rusted Kushala): their **atk/def fit `100×mult`** (ROM-confirmed), but their **HP is authored directly in the quest parameter block, NOT computed** from `base_HP[type]×mult`. Proven two ways: (1) their required HP multipliers (community_HP ÷ base_HP) do not exist in any table row — Teostra/Chameleos: none; Kushala/Rusted/Lunastra: a single coincidence; (2) live save-state read (Rusted Kushala, Guild Low 6★): entity type=60, **maxHP=8400**, and 8400 is present in the loaded quest ctx at **`*(0x08A62D9C)+0x114`** (idx2 is the adjacent `+0x116`). base_HP[60]=4800 is unused. **Live maxHP 8400 = community value → elder HP data is validated correct**, just per-quest-authored. To regenerate offline: read the `+0x114` HP field from each elder quest's file (f5xxx).
- Save-state RAM mapping for this PPSSPP build: `.ppst` = 176-byte header + zstd; decompressed blob RAM base = **blob+0x48** (`byte(addr) = blob[0x48 + addr − 0x08000000]`). Anchor via f0071 rage table (Golden Rajang 1.28/1.125 @ runtime 0x09BCDCE0).
- **Golden Rajang** (t53): HP base 3600 is correct and fits; but its **atk/def are a boosted special-variant** (values 275/362/462/500 atk, 48/56 def) that are NOT `100×mult` — base atk/def ≠ 100 for this monster. Its own special case.
- Kushala atk 365: one value outside the enumerated mult set (mult table may extend / community rounding).

## Open
- **~30 lone community stat rows** don't match any ROM row (e.g. Blangonga HP 2030, Blue Kut-Ku HP 2184, White Fatalis HP 26000) — likely community errors to correct from ROM.
- Yama Tsukami type id (special monster).
- Per-quest `(idx2, tier)` selector source (quest data / entity fields) — needed to regenerate values without community; currently the row is found by joint (HP,atk,def) match.