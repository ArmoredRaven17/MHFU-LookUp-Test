# MHFU Armor Recipes — ROM Extraction Findings

Authoritative forge recipes for all 5 armor slots extracted from BOOT.BIN's static table and
applied to `data/mhfu.db`. Companion to the format reference in
[`rom-map.md §3.7`](rom-map.md).

**Status (2026-06-29):** 300 corrections applied across all 5 slots; 2,004 / 2,077 pieces
verified ROM-correct; 0 wrong; 73 pieces in the ROM have no matching DB entry.

---

## Source

**BOOT.BIN forge table** — a static array in the unencrypted game ELF at file offsets
1,285,868 – 1,341,898 (56,056 bytes; 2,156 records × 26 bytes). The same data is also
cached in save-state forge RAM, but the static ELF copy is always available and has no
stale-cache risk.

**Scripts:** `ISO FILE/_boot_slot_extract.py` (all slots), `ISO FILE/_boot_head_extract.py`
(head-only with extended diff output).

---

## Results by slot

| Slot  | ROM records | Correct before | Fixed | Verified after | Wrong | Unmatched |
|-------|-------------|---------------|-------|----------------|-------|-----------|
| head  | 421         | 329           | 74    | 403 / 421      | 0     | 18        |
| chest | 419         | 346           | 73    | 405 / 419      | 0     | 14        |
| arms  | 410         | 338           | 72    | 399 / 410      | 0     | 11        |
| waist | 408         | 345           | 63    | 396 / 408      | 0     | 12        |
| legs  | 419         | 383           | 18    | 401 / 419      | 0     | 18        |
| **total** | **2,077** |            | **300**|**2,004**    | **0** | **73**    |

> Legs note: the earlier save-state pass applied 64 corrections; BOOT.BIN caught 18 more
> that the save-state missed.

---

## Unmatched pieces (73 total)

These pieces exist in the ROM's forge table but have no corresponding row in `armor_pieces`.
Recipes for all of them are in the `_boot_*_recipes.json` files.

### Head (18)

**Cosmetic accessories — piercings (7):**
Red Piercing, Blue Piercing, Yellow Piercing, Black Piercing, White Piercing,
Protection Piercing, Comrade Piercing.
These are equippable cosmetic accessories with no defense stats.

**Cosmetic head-pieces / event masks (5):**
Felyne Mask, Chaoshroom, Bullfango Mask, Skull Face, Garuga Mask.

**JP-only blanked dummies (6):** ROM name field = `dummy` (US ROM blanked the name string).

### Chest (14)

**Event T-shirts (4):** Hunter T-Shirt, Hunter T-Shirt X, Hunting Soul T-Shirt, HuntingSoulT-ShirtX.
These appear to be event or special-distribution chest pieces.

**JP-only blanked dummies (10).**

### Arms (11)

**Name-spacing mismatches only — recipes already correct in DB (5):**
`Conga Guards `, `Diablo Guards `, `Hermitaur Guards `, `PuppetMaster Gloves`,
`BlackBeltVambracesX`.
The ROM name table has a trailing space or run-together word; DB name is the corrected
canonical form. Verified: DB recipes match ROM exactly.

**JP-only blanked dummies (6).**

### Waist (12)

**Basic low-rank belts absent from DB (3):** Light Belt, Iron Belt, Hide Belt.
These are the entry-level waist pieces from the first armor tiers; their absence from the DB
is a gap. Recipes are known (see JSON); stats (defense, resistances) need a second extraction
pass against the stat table before the DB rows can be added completely.

**Mid-rank waist absent from DB (1):** Chrome Metal Coat.

**Name-spacing mismatches — recipes already correct (2):**
`Golden Moon Tasset ` → `Golden Moon Tasset`; `Borealis Tasset Goku` name variant resolved to
existing DB row via name_female lookup (pid 1874).

**JP-only blanked dummies (6).**

### Legs (18)

**Metal Boots series absent from DB (4):**
Silver Metal Boots, Dark Metal Boots, Pink Metal Boots, Chrome Metal Boots.
Same situation as waist belts — recipes known, stats pending.

**Name-spacing mismatch — recipe already correct (1):**
`RedGuildGuard Tights` → `Red GuildGuardTights` (verified via name_female; DB correct).

**JP-only blanked dummies (13).**

---

## Pieces added 2026-06-29

Stats from BOOT.BIN stat tables (corrected 2026-06-29; initial values were off-by-one —
`stat_idx = namei` was used instead of `stat_idx = namei - 1`). Skills from BOOT.BIN
bytes[1-10] of each stat record (u8 skill_id, i8 pts pairs, 0-terminated). Each piece got a
new standalone armor set entry (`class_split=0`, `class_type='Both'`).

| piece_id | Name | Slot | def | F/W/T/I/D | deco | Rank | Rarity | ROM skills (confirmed) | Unknown ROM IDs |
|----------|------|------|-----|-----------|------|------|--------|------------------------|-----------------|
| 1901 | Light Belt | waist | 2 | -2/2/2/2/-2 | 1 | Low | 1 | Gathering+3, MixSucRate+3, Backpackng+1, Cooking-2 | ID19=+2 |
| 1902 | Iron Belt | waist | 4 | 4/-4/-6/-2/0 | 1 | Low | 1 | Health+3, Whim+2, Backpackng+2, Map+1, Paralysis-1 | — |
| 1903 | Hide Belt | waist | 18 | 2/2/2/2/0 | 0 | Low | 1 | Attack+2, Rec Speed+2, Hunger-2 | ID20=+3 |
| 1904 | Silver Metal Boots | legs | 18 | 0/2/-2/0/0 | 2 | Low | 2 | Attack+2, Rec Speed+2, PsychicVis+2, Hunger-1 | ID20=+2 |
| 1905 | Dark Metal Boots | legs | 20 | 0/-2/2/0/0 | 2 | Low | 2 | Health+3, Wide Area+3, Fencing+1, Stamina-2 | — |
| 1906 | Chrome Metal Coat | waist | 24 | 2/-2/0/0/0 | 0 | High | 3 | Paralysis+3, Sword Draw+3, Spc Attack+1, Rec Speed-1, Poison-1 | — |
| 1907 | Pink Metal Boots | legs | 24 | 2/-2/0/0/0 | 2 | High | 3 | (none inserted) | ID1=+1 |
| 1908 | Chrome Metal Boots | legs | 24 | 2/-2/0/0/0 | 0 | High | 3 | Antiseptic+5, Sneak-2 | — |

**Materials** (from BOOT.BIN forge table):
- Light Belt: Anteka Pelt×2
- Iron Belt: Iron Ore×2, Kelbi Hide×1, Pin Tuna×2
- Hide Belt: FireWyvern Fluid×2, Bulldrome Hide×1
- Silver Metal Boots: Normal Ticket×1, Hercudrome×1
- Dark Metal Boots: Normal Ticket×1, Hercudrome×1
- Chrome Metal Coat: Hard Ticket×1, Dragonite Ore×1
- Pink Metal Boots: Hard Ticket×1, Dragonite Ore×1
- Chrome Metal Boots: Hard Ticket×1, Dragonite Ore×1

**Unknown ROM skill IDs:** ID 1 (single occurrence, possibly Torso Inc), ID 19 (Chain-tier
armor, appears alongside Gathering/Backpackng), ID 20 (widely used across many armor sets,
no reliable name identified yet). Verify in-game to resolve.

**Note:** `max_defense = defense` (upgrade path is in bytes[30-37] of the stat record but
not yet decoded to a max value). `cost = 0` placeholder.

---

## Dedup rule (standard vs ticket recipe)

Some pieces have two forge table records: the standard recipe (more materials) and a ticket
shortcut (1–2 materials, contains "Ticket"/"ticket"/"Tcket"/"tcket" in the item name). Always
prefer the standard recipe:

```python
TICKET_KW = {'Ticket', 'ticket', 'Tcket', 'tcket'}
best = max(recs, key=lambda r: (len(r['mats']), not is_ticket(r), r['f1'] == f1_preamble))
```

---

## Village-forge preamble records

Records with `f1 = slot_index + 256` (e.g. `f1=257` for head, `f1=258` for chest) are
village-forge preamble entries. They carry the same `namei` as the guild-forge record and
duplicate the materials, so dedup naturally discards them when the guild record has equal or
more materials. No special handling needed beyond the standard dedup rule.
