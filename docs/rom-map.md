# MHFU ROM Map

A structural map of the Monster Hunter Freedom Unite (ULUS10391, US) ROM binary — the
container layout, the file index, and the on-disk/in-RAM record formats — in the spirit of a
save-editor's binary field map. Companion to the process narrative in
[`rom-data-extraction.md`](rom-data-extraction.md); this file is the *reference* (what's where),
that one is the *story* (how it was found).

**Confidence legend:** ✅ confirmed & cross-validated · 🟡 partial / format known but not fully
mapped · ⬜ located, not yet decoded · ❌ dead end (don't retry).

---

## Layer 0 — Disc

```
Monster Hunter Freedom Unite.iso
└─ PSP_GAME/
   ├─ SYSDIR/BOOT.BIN      ✅ UNENCRYPTED game ELF (MIPS). Code/logic, damage formulas, save R/W.
   │                          Disasm base: file = vaddr − 0x08804000 + 0x25b4.
   └─ USRDIR/DATA.BIN      ✅ 772 MB encrypted master archive (everything else).
```

`BOOT.BIN` is plaintext — use it for code/formula RE (motion values, save format). `DATA.BIN`
holds all data tables and assets, encrypted + archived.

---

## Layer 1 — DATA.BIN container ("fake ROFS")  ✅

| region | offset | size | contents |
|---|---|---|---|
| Header | `0x0` | `0x8170` | decrypted with **seed 0** |
| → file-start sectors | `0x0` | `0x6808` | `u32[6658]` monotonically-increasing start sectors; last = total sector count → **6657 files** |
| → secondary metadata | `0x6808` | `0x1968` | `(file_index u32, decompressed_size u32)` pairs for the 813 LZ-compressed files (NOT a name table) |
| File data | `index[i]*0x800` | `(index[i+1]−index[i])*0x800` | file `i`, decrypted with **seed = `index[i]`** |

- **Sector size** `0x800` (2048). Files addressed by **numeric index only** (no names).
- **Cipher** (fully recovered): Ghidra-derived S-box + Lehmer keystream; see `databin_unpack.py`
  and [memory `databin-cipher`]. ~5593/6657 files decrypt to **raw** data; ~813 use the custom
  `<LZ`/`LZD3` codec (decompressor located: `ghidra_codec.c`).
- Magics seen in raw files: `TMH0` (models), `MIG.00.1PSP` (textures), `MWo3` (`.ovl` overlays),
  `RIFF` (audio), `Head`, `dbsT`.
- **Extract:** `from databin_unpack import DataBin; DataBin().read_file(n)` → all dumped to
  `ISO FILE\DATA_extracted\fNNNN.bin` (~8 s for the whole archive).

---

## Layer 2 — File index map (file → meaning)

| file(s) | role | conf | how found |
|---|---|---|---|
| **f0019** | English master text (container, 23 sections — see below) | ✅ | item-name string search |
| f0020–f0023 | other EU-language text (same layout) | ✅ | parallel layout |
| f4781–4787 | quest text | ✅ | string search |
| **f0071** | `game_task.ovl` — game-logic **overlay (CODE+data)**, loads @ vaddr `0x09A5F300` | ✅ | MWo3 magic + filename @ +32 |
| **f0076** | **monster reward tables** (carve/capture/quest) + gather/supply tables | ✅ | item-ID cluster scan + raw-hex decode |
| **f5389** | smithy / crafting data (4 sections; sec3 = big table) | 🟡 | RAM oracle (smithy-only) |
| **f5040–f5700** | **per-quest gather-node tables** (XOR-encrypted; one map+rank each, heavily duplicated across quests) — the gathering-% source (§3.2) | ✅ | offline round-robin-LCG decrypt |
| f3196–f3959 | per-context data (~760 files, ~quest count) | ⬜ | loads in neither smithy nor quest dump |
| f0050, f0047, f0051… | large = textures / models / audio | — | size + magic |

> ❌ **f71 is NOT the carve table** — it's the code that *reads* tables at runtime. A
> coincidental `[40,20,15,15,10]` byte-run there misled earlier work. Carve data is in f0076.

### f0019 section map (container `[u32 count][u32 offsets…][data]`)
| sec | contents | count |
|---|---|---|
| 1 | monster / entity names | 1708 |
| **2** | **item names** (ID-ordered, verified vs `item_table.txt`) | 1627 |
| 3 | item descriptions | — |
| **4** | weapon names | 1481 |
| 6 | bow/bowgun names | 353 |
| 8/10/12/14/16 | armor names head/chest/arms/waist/legs | ~420 ea |
| 9/11/13/15/17 | armor descriptions | — |
| 22 | profanity/name-censor list | 939 |

---

## Layer 3 — Record formats (field maps)

### 3.1 Monster reward group — `f0076.bin`  ✅
The carve/capture/quest reward tables. **~940 groups.**
```
record   = (pct u16, id u16)        ← percentage FIRST, then item id
delimiter= 0xFFFF halfword          ← terminates a group
group    : Σ pct == 100 exactly
item     = rom_master[id − 1]       ← IDs are off-by-one (0 = empty slot)
```
- **No indirection** — `id` is a global item id (after −1). 
- **Layout:** monster-ordered blocks, one block per (rank × reward-type); the same monster
  sequence repeats across blocks. Maps onto the app's rank keys `guild_low_12 / elder_guild_low
  / nekoht_guild_high / g_rank / treasure_hunt`.
- Validated: 359 app slots match exactly, 50 null gaps filled, 10 wiki errors corrected.
- Parser/applier: `ISO FILE\rom_rewards.py`.

### 3.1b Break / wound-part reward — `f0076.bin` tail (790984–804888)  ✅
Same family as 3.1 but **6-byte** records carrying a quantity:
```
record   = (pct u16, id u16, qty u16)   ← extra qty halfword vs carve's 4-byte
delimiter= 0xFFFF; group Σ pct == 100; item = rom_master[id − 1]
```
**419 groups.** This is why break parts missed the carve parser — the qty halfword shifted
every 4-byte read. Rank disambiguation: same item-set recurs across ranks (Diablos Horns
92/8 → 80/20 → 60/40), so match by item-set then prefer the group agreeing on %+qty. Validated:
196/262 app break slots ROM-verified, 27 wiki errors fixed (`break_apply.py`).

### 3.2 Gather-node drop table — per-quest `f5040–f5700` files (XOR-encrypted)  ✅
The per-node gathering %. **Not in f0076** (that was a red herring — see 3.2b). Each stage's
tables ship inside per-quest files in the `f5040–f5700` range, under a **second encryption
layer** on top of the DATA.BIN cipher, which is why years of static searches found nothing.
Solved 2026-06-23 — full method in [`gather-extraction.md`](gather-extraction.md).
```
record    = (weight u16, id u16)     ← weight FIRST, a literal percentage
delimiter = 0xFFFF halfword
group     : Σ weight == 100 exactly
item      = rom_master[id − 1]       ← runtime id = ROM id + 1 (same off-by-one as carve)
```
- **Inner cipher (the hurdle):** gather tables are XOR'd with a keystream of **four
  independent Lehmer LCGs consumed round-robin** — `stream = (t0 + 2n) >> 1 & 3` cycling
  0,1,2,3 per u16; each stream advances its own state `state = state·mult % mod`. A single-LCG
  decrypt yields garbage. Constants in `BOOT.BIN`: `mult` @ `0x089B5008` = `[0x1709,0x3df3,0x747b,0xb381]`,
  `mod` @ `0x089B5018` = `[0xff9d,0xffa9,0xffc7,0xfff1]`. Decryptor entry `0x088C2CE0`,
  keystream gen `0x088C2B94`.
- **Crackable offline, no emulator** — plaintext oracle (first u16 is a weight 1..100; rest
  are item ids `< 1400`) recovers each stream's seed by modular inverse. Tools:
  `offline_decrypt.py` (one file), `batch_decrypt.py` (range + dedupe + map/rank id).
- **One map + one rank per file**; many quest files duplicate the same (map, rank) — dedupe by
  content (the filename does *not* encode the stage). Files with coherent items but near-zero
  app overlap are **Treasure / Training quest** tables — a category the app never had.
- **Live cross-check anchors:** roll fn `0x0887265C` (`a0` = the exact table used), RNG
  `0x088900C4`, floating table region `0x08A5C200 + 0x1400`.
- **Applied:** `gathering_areas` low/high/g_rank/treasure now carry real ROM weights;
  Training nodes are single fixed-reward items (no distribution).

### 3.2b f0076 supply / Reward-B tables (~offset 755k)  🟡 — *not* the gather-node %
Heterogeneous `(id u16, qty u8, pct u8)` tables, Σ pct == 100, null-padded. Earlier mistaken for
the gathering source; the per-node gather % is §3.2 (f50xx). These are supply / Reward-B style
tables — left here to record the misattribution and avoid re-chasing it.

### 3.3 Item-master record — RAM-resident only (`state_ram.bin` @ `0x99d32b`)  ✅
Compressed on disk (absent from `DATA_extracted`), so read from a RAM dump. **24-byte records,
indexed by `item_table.txt` order = ROM item id** (1260 items).
| offset | type | field |
|---|---|---|
| +0 | u8 | rarity, **0-based** (displayed Rare = byte+1) |
| +1 | u8 | stack/carry size (consumable 10 / material 99 / jewel 1) |
| +2 | u8 | item flags (key/deliverable/sell bits — partial) |
| +3 | u8 | type / category = **icon sprite shape** (46 shapes: fish, ore, bone, herb, bottle, jewel, coin, book…) |
| +4 | u8 | **icon color tint** — `0` white · `1` red · `2` green · `3` blue · `4` gold · `5` orange? · `6` cyan · `7` purple · `8` rainbow? · `10` grey (`9` unused). Verified vs ore colors (Machalite=blue, Iron=grey, Dragonite=green…) |
| +6 | u8 | bowgun-ammo level / coating sub-index (**not** icon) |
| +10 | u16 | buy/base value (≈10× sell) |
| +14 | u16 | **sell value** |
**Item icon = `(+3 shape, +4 color)`** — a tinted sprite; 276 distinct combos in use. Per-item
map: `docs/rom_item_icons.json`. Ground truth: `docs/rom_item_master.json` (rarity/value/stack).
The icon *graphics* (sprite atlas) are a compressed texture — see §3.6.

### 3.4 Armor recipe / stat records — RAM-decoded  🟡
26-byte **recipe** records and 40-byte **stat** records (use **global** item IDs, which is why
they decoded where weapon/loot didn't). Field maps live in the decoder scripts
`ISO FILE\stat_apply.py`, `stat_scan.py`, `armor_diff.py`. (Applied to the DB already.)
See also §3.7 — the static BOOT.BIN forge table is the authoritative recipe source (more
complete, no stale-cache risk).

### 3.7 Armor forge recipe table — `BOOT.BIN` static table  ✅
Complete forge recipes for all 5 armor slots in a single contiguous array in the game ELF.
**All 5 slots × ~421 pieces fully decoded and applied to the DB (300 total corrections).**

```
Location:  BOOT.BIN file offsets 1,285,868 – 1,341,898
Size:      56,056 bytes = 2,156 records × 26 bytes
Stride:    26 bytes, no padding, no delimiter

Record layout (all fields little-endian u16):
  [+0]  f1 u16        ← slot index (lo byte) + forge-context flag (hi byte)
  [+2]  namei u16     ← index into the per-slot armor name table (state_head2.bin)
  [+4]  iid[0] u16    ← item id (= ROM id + 1; 0/1 = empty slot)
  [+6]  qty[0] u16
  [+8]  iid[1] u16
  [+10] qty[1] u16
  [+12] iid[2] u16
  [+14] qty[2] u16
  [+16] iid[3] u16
  [+18] qty[3] u16
  [+20] iid[4] u16
  [+22] qty[4] u16
  [+24] next_namei u16   ← namei of the following record (metadata, not used for extraction)
```

**f1 field encoding:**

| f1 (hex) | lo byte | hi byte | meaning |
|---|---|---|---|
| `0x0001` | 1 | 0 | head — guild-forge |
| `0x0101` | 1 | 1 | head — village-forge preamble |
| `0x0002` | 2 | 0 | chest |
| `0x0003` | 3 | 0 | arms |
| `0x0004` | 4 | 0 | waist |
| `0x0000` | 0 | 0 | legs |

Preamble records (`hi=1`) carry identical materials and are deduplicated (discard when
the guild-forge record for the same `namei` has equal or more materials).

**Item ID convention:** `iid = 0` or `iid = 1` = empty slot (skip). Real items:
`iid ≥ 2`, and `ROM_item_id = iid − 1` (same off-by-one as every other table in this ROM).

**Armor name tables** (slot-specific; from state_head2.bin, null-terminated ASCII):
| slot  | offset in state_head2.bin |
|-------|--------------------------|
| head  | 10,513,668 |
| chest | 10,549,124 |
| arms  | 10,582,659 |
| waist | 10,616,813 |
| legs  | 10,650,012 |

`namei` = 0-based index into the contiguous null-terminated string array at that offset;
`namei=0` = "Nothing equipped." (skip).

**Dedup rule (standard vs ticket recipe):** some pieces have two records — the standard
recipe (3–5 materials) and a ticket shortcut (1–2 materials, item name contains
"Ticket"/"ticket"/"Tcket"/"tcket"). Always keep the record with the most material slots.

**Coverage:** 2,004 / 2,077 extracted pieces verified ROM-correct in DB; 73 unmatched
(piercings, event T-shirts, cosmetic masks, basic low-rank belts/boots absent from DB,
plus JP-only blanked dummies). Full findings: [`rom-armor-recipes.md`](rom-armor-recipes.md).

**Tools:** `ISO FILE\_boot_slot_extract.py` (generalized, all slots), `_boot_head_extract.py`
(head only), `_boot_head_apply.py` (head applicator). Saved JSON per slot: `_boot_{slot}_recipes.json`.

### 3.5 Obtain-SFX table — overlay-loaded RAM `0x09ce4d78`  ✅(as a *non*-loot table)
`(item-key u16, sub u8, sound-id u16≈6400–6650, volume u8)` — the "X obtained" sound per item.
Documented so it isn't re-mistaken for loot.

### 3.6 Textures — MIG/GIM format & the item-icon hunt  🟡
**`MIG` = Capcom's `"MIG.00.1PSP\0"` wrapper around standard PSP GIM** (chunked image). Format
fully decoded — decoder `ISO FILE\gim_decode.py` (proven correct: readable text + true colors).
```
GIM block: u16 id, u16 0, u32 size, u32 nextRel, u32 dataRel(=16)
  ids: 0x02 picture · 0x03 image · 0x04 image-data · 0x05 palette · 0xFF end
GimImageInfo (block data): u16 hdrSize, u16 0, u16 format, u16 pixelOrder, u16 w, u16 h …
  formats: 0 RGB565 · 1 RGBA5551 · 2 RGBA4444 · 3 RGBA8888 · 4 index4 · 5 index8
  index8 image → pixels at infoStart+hdrSize; CLUT is a sibling palette block (256×RGBA8888)
```
**Texture file landscape** (`DATA_extracted` first-4-byte census, 6657 files):
| magic | n | meaning |
|---|---|---|
| `\x03\x00\x00\x00` | 3874 | asset/resource **containers** (count + offset table; hold compressed sub-resources) |
| `Head` | 513 · `MWo3` 298 (code overlays) · `RIFF` 280 (audio) · `dbsT` 72 · `.TMH`/`TMH0` 58 (models) |
| `\x89PNG` | 7 | **branding** — f0012/14–18 = logos (144×80), f0013 = title (480×272). Not gameplay. |
| `MIG.00.1PSP` | **2** | the only raw GIM textures: **f0044** = system-UI atlas (256×256 index8 — buttons, ○✕△, START/SELECT, "NOW LOADING"); **f0045** = world-map screen (480×296). |

**Item-icon sprite atlas — NOT in the raw dump (⬜, compressed).** Where we looked (so we don't
repeat it):
- MIG magic at any offset → **only f0044/f0045** (neither is item icons).
- Bare GIM image-info headers (any format, atlas dims) across all 6657 files → **only f0044**.
- `state_ram.bin` RAM dump → **no** resident MIG/GIM (dump was mid-gather, not a menu).
- `<LZ`/`LZD3` codec magic → effectively absent (1 hit, f5677 @151); we do **not** have a working
  decompressor (the misnamed `ghidra_codec.c` is the carve readers, not the codec).
- **Conclusion:** icon sprites live inside the compressed `\x03` asset bundles / VRAM, so they
  must be captured at runtime, not from the static dump.

**Item-icon atlas — EXTRACTED via PPSSPP texture dump  ✅** (Settings→Tools→Developer Tools→"Save
new textures", then open the Item Box; dumps land in `…/PSP/TEXTURES/ULUS10391/new/`). The atlas
is `new/091874a0535e616be502b6aa.png` — **256×256, monochrome white template sprites** (color is
the runtime `+4` tint, confirming the model), on a **~23.3 px grid, 11 columns × 11 rows** (≈121
cells). Holds the ~46 item shapes **plus** UI glyphs (X, "E", play-arrow, Felyne face, cursor
frame, placeholder squares). Working copies: `ISO FILE/item_icon_atlas.png` + `_clean.png` (3×).
- **OPEN — sprite order ≠ `+3` identity.** Confirmed for both 10- and 11-col readings (e.g. the
  jewel and web sprites don't land at shapes 43/22). So `+3` indexes the sheet through an **in-game
  `type→icon` LUT**, not directly. To wire item→sprite: find the LUT (item-list draw code in the
  menu overlay — exact), or visually match each sprite to its `+3` category (best-effort; the sheet
  is now clearly legible in `atlas_top.png`/`atlas_bot.png`).
- Other dumped textures worth keeping (UI/material refs): language-select (256²), rock/ground
  material tiles (128²), world-map/noise (320²) — catalogued in `ISO FILE/tex_candidates/`.

---

## Layer 4 — RAM calibration (for save-state cross-checks)

PSP user RAM ≈ `0x08800000`–`0x0A000000` (24 MB). Save states: **176-byte header + zstd RAM blob**
(`zstandard.decompress(raw[176:], max_output_size=1<<26)`).
- **vaddr = blob_offset + CAL**, where `CAL` is derived per-dump from a known anchor (this session:
  Tigrex hitzone bytes `[75,65,40,0,15,5,30,20,110]` at vaddr `0x09bc6899` → `CAL = 0x07FFFFB8`).
  A 0x300 calibration error silently corrupts all reads — always re-anchor.
- **Overlay f71** loads at vaddr **`0x09A5F300`** (MWo3 header has a 0x200 prefix; importing at
  `0x09A5F100` is off-by-0x200 and breaks intra-overlay `jal` targets).
- Per-monster carve-addressing struct: array stride `0x1d0` (464 B), indexed by monster/area id
  (`ctx+0x1e8`); per-rank pointers switched on quest-rank global `_DAT_089cc558+0x6af10`.

> ❌ **Static loot is never live in RAM** — save-state structures (carve "roller"
> `_DAT_09a4f1a0`, result queue `_DAT_08a62eb0`, carve effect object `0x08b0c900`) are runtime
> *display* state only. Read tables from `DATA_extracted`, not RAM.

---

## Layer 5 — Coverage ledger  (what's mapped vs unexplored)

> Maintain this so we **never re-search known regions** and always know where to look next.
> Update as regions are claimed.

### File-level coverage (6657 files, by leading magic / item-density)
| bucket | count | meaning |
|---|---|---|
| model / texture / audio / overlay (TMH0 / MIG / RIFF / MWo3) | ~580 | assets — skip |
| Head | 513 | asset/header blocks — skip |
| dbsT | 72 | skip |
| **DATA (item-dense ≥0.30)** | **163** | ← **the real data search space** |
| other / unknown (text, small/raw, model sub-parts) | 5329 | low priority (incl. f19–23 text) |

**The 163 item-dense files are the entire table search space.** Identified so far:
`f0076` (rewards ✅), `f5040–f5700` (per-quest gather tables ✅, §3.2), `f5389` (smithy 🟡),
`f0071` (overlay ✅). **Remaining unexplored data clusters:** `f3397–f3407`, `f6375–f6376`,
`f0081` — densities 0.49–0.54, sizes 150–670 KB; counts ≈ quest count → likely per-quest data.
(The `f5392–f5404` cluster fell inside the now-decoded gather range.)

### Within-file coverage — f0076.bin (927,744 bytes)
| range | size | contents | status |
|---|---|---|---|
| `0 .. ~755,000` | 747 KB | mixed; **gather/supply tables ~755k** | 🟡 partly known, mostly ⬜ |
| `765,296 .. 782,000` | 16 KB | **940 reward groups** (carve/capture/quest) | ✅ mapped |
| `782,000 .. 927,744` | 142 KB | tail | ⬜ unmapped |
**→ f0076 is ~96% unmapped.** Break-part tables (262 slots, not in the reward groups) are
plausibly in one of these unmapped regions in a third record format — check here before assuming
another file.

### Next-search priority
1. The `f3397–f3407` / `f6375–f6376` / `f0081` data clusters — remaining per-quest tables.
2. Weapon recipes (may use local-index indirection, unlike rewards/armor/gather).
3. Weapon Motion Values (likely in `BOOT.BIN`).
*(Gathering % is now fully decoded — §3.2. Break parts resolved to 209/262 — see below.)*

## Open / to-extend

| target | status | note |
|---|---|---|
| Break / wound-part tables | ✅ | **SOLVED** — f0076 tail (790984–804888), 6-byte `(pct,id,qty)` records (§3.1b). **209/262** verified/fixed/adopted (`break_apply.py` + `break_reconcile.py` with variant-token + monster-anchor gates). Remaining **53** need position-labeling (item names ≠ monster name e.g. Cephadrome→Cephalos, 1-item part-code slots, generic-only slots) — name-matching alone can't resolve them safely. |
| Gathering-node % | ✅ | **SOLVED** — per-quest `f5040–f5700`, round-robin 4-LCG inner cipher (§3.2). Decrypted offline for every map/rank + Treasure/Training; applied to `gathering_areas`. Full method: [`gather-extraction.md`](gather-extraction.md). |
| Item-icon assignment | ✅ | **SOLVED** — per item `(+3 shape, +4 color)` (§3.3); `docs/rom_item_icons.json`. |
| Item-icon sprite atlas | 🟡 | **EXTRACTED** via PPSSPP dump — 256×256 monochrome 24px-grid template sheet (`ISO FILE/item_icon_atlas.png`, §3.6). Remaining: sprite→`+3` cell mapping (order ≠ identity; needs visual ID or the in-game type→icon LUT). |
| MIG/GIM texture format | ✅ | decoded — `gim_decode.py` (§3.6); UI atlases f0044/f0045 extracted. |
| **Armor forge recipes** | ✅ | **SOLVED** — BOOT.BIN static table (§3.7). 2,004/2,077 pieces ROM-verified; 300 corrections applied. 73 unmatched (piercings/masks/T-shirts/basic belts/boots/JP dummies). See [`rom-armor-recipes.md`](rom-armor-recipes.md). |
| Weapon recipes | ⬜ | may still use local-index indirection (unlike rewards/armor) |
| Weapon Motion Values | ⬜ | likely in BOOT.BIN; future "Weapon MVs" tab |

## Artifacts & tooling
- Ground truth: `docs/rom_item_master.json`, `docs/rom_item_icons.json`, `docs/app_to_rom_map.json`, `item_table.txt`
- Companion doc: [`gather-extraction.md`](gather-extraction.md) — full gather method/cipher/addresses.
- Tools (`ISO FILE\`): `databin_unpack.py`, `rom_rewards.py`, `break_apply.py`, `mhfu_emu.py`,
  `stat_apply.py`, `stat_scan.py`, `armor_diff.py`, `gim_decode.py` (MIG/GIM→PNG); gather:
  `offline_decrypt.py`, `batch_decrypt.py`, `build_pool.py`, `dump_gather.py`, `verify_gather.py`,
  `ppsspp_dbg.py`; armor forge: `_boot_slot_extract.py`, `_boot_head_extract.py`,
  `_boot_head_apply.py`; Ghidra dumps `ghidra_codec.c`, `ghidra_carve.c`
- Ground truth JSON per slot: `_boot_{head,chest,arms,waist,legs}_recipes.json`
- Memory: `rom-extraction-playbook`, `reward-carve-tables`, `item-master-table`, `databin-cipher`,
  `gather-table-CRACKED`, `gathering-extraction`, `mhfu-disassembly`, `armor-recipes-boot-cracked`
