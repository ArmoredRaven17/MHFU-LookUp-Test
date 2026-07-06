# Pokke Farm — ROM Gather-Rate Extraction

> ✅ **RESOLVED (2026-06-25) — farm gather rates FOUND in BOOT.BIN, validated against the guide.**
> The single-% farm tables are a **plaintext `[item_id u16, weight u16]` config block in
> `BOOT.BIN` @ ~`0x19A900`** (NOT the encrypted f50xx gather files — those are location). Parsed 14
> tables; **13/14 match VioletKIRA's GameFAQs farm guide at maxdiff ≤2%, and 0% on every cleanly
> split table** (Mining base/+1..+4, Insect Thicket base/+1..+4, Mushroom Tree base/+1/+2, Beehive
> ×3). e.g. Mining base = `Iron Ore 24, Earth Crystal 16, Stone 13, Disk Stone 13, Whetstone 12,
> Armor Sphere 8, Machalite 7, Ice/Suiko 3, Armor Stone 1` (== guide). Saved: `_farm_BOOT_tables.json`.
>
> **The journey (lesson):** (1) f50xx "farm" extraction was **location contamination** (shared items;
> a "Bug Tree" matched old_desert G-rank bugnet 7/7 — Royal/Divine Rhino are map drops). (2) Corrected
> to "not extracted" — farm-exclusive items (Chaos Mushroom, Snakebee Larva, Yambug+Bughopper, Dark
> Stone) are absent from the entire f4000–6000 gather range. (3) Using the guide as a **search hint
> (not truth)**, the farm-exclusive fingerprint hunt found the real block in **BOOT static, plaintext**.
> The null nodeset / empty region / 0 roll hits were right that the farm doesn't use the *runtime
> gather table* path — its data is a static BOOT config the village code reads directly.
>
> **Still to extract (adjacent BOOT regions / different format):** Thicket base + Mushroom base (just
> outside the parsed window), Fishing Pier, **Bomb Mining** & **Bug Tree** (Common/Uncommon/Rare sets
> × 6 progress tiers — many tables), Field Rows (per-seed + bonus), Sword Cave (`Dark Piece 60/Dark
> Stone 40`, carve-like). **`_farm_assigned.txt` (the old 19 f50xx matches) is location contamination
> — discard.** Use `_farm_BOOT_tables.json` instead.

How the **Pokke Farm** node drop-rates relate to the ROM. Status (2026-06-25): single-% nodes
(Mining/Thicket/Mushroom/Beehive) **extracted from BOOT @0x19A900 and validated** vs the guide
(0% diff); Bomb Mining / Bug Tree / Field Rows / Sword Cave still to extract from adjacent regions.

> The app already holds the farm **structure** (`pokke_items`: node + variant + item-list).
> What the ROM adds is the **percentages** (and item-list corrections). Per the ROM-authoritative
> rule, the ROM is the correction; community lists are the thing being verified.

## Two systems on the farm (don't conflate)

The farm runs **two distinct mechanics**, neither using the location runtime path:

1. **Spawned-entity fishing** — the **Fishing Pier** (and the **Casting Machine** net). Visible
   fish you catch; same entity system as location fishing (`docs/rom-fishing.md`). **No `[w,id]`
   gather table** — so Pier/Casting correctly return NO match in the gather extraction.
2. **Weighted gather nodes** — Insect Thicket, Mining Points, Bomb Mining, Bug Tree, Bee Hive,
   Mushroom Tree, Field Rows, Great Sword Cave. These use the gather `[weight,id]` table system.

## Key finding: farm gather is in the encrypted `f50xx` files, NOT live RAM

- **Live methods ALL fail on the farm** (verified): the location gather region `0x08A5C200` is
  **all-zero**, the nodeset pointer `0x08A5C584` is **null**, the roll/resolve/caller BPs
  (`0x0887265C`/`0x08869750`/`0x08870AC4`) get **0 hits**, and the RNG `0x088900C4` is too hot
  in the village to single-step (freezes the game). The farm uses a **different runtime path**.
- **But the static data is identical in format**: the farm node tables are **XOR-Lehmer encrypted
  in the same `f50xx` files** as location gather, and decrypt with the **same `offline_decrypt.py`**
  (see `docs/gather-extraction.md` §4). Farm and location files are **interleaved** in f50xx
  (e.g. f5053 = LR Desert sits among farm files f5000–5039).
- **Method lesson:** every live method was exhausted before the offline route was tried; the
  offline decrypt was the winning method. *Try all documented methods before concluding.*

## Classifying farm vs location tables (the hard part)

Farm and location share most items (ores, herbs, common bugs), so raw item-overlap can't
separate them. Working discriminators:
- **Farm-exclusive items** (25 items in `pokke_items` but in no `gathering_areas`): Bughopper,
  Tailed Frog, Yambug, Vespoid/Hornetaur parts, Great Hornfly/Ladybug, Giant Corn, Chaos Mushroom,
  Dark Stone/Piece, etc. A table containing one is definitively farm — but misses farm tables whose
  items are all shared.
- **farm-recall > location-recall** — catches the distinctive mining nodes (Goldstone, Coal,
  Firecell, Ruststone, Mellanje don't overlap locations).
- **1:1 greedy assignment** of cached ROM tables to `pokke_items` variants (by recall) — resolves
  the collisions where similar variants (the 3 Bug Tree hammers, the Thicket stages) grab the same
  table. This produced the 19 matches below.

## Node mechanics (confirmed with the user)

| Node | Variant axis |
|---|---|
| Insect Thicket | upgrade stages (+1…+4) — add nodes |
| Mining Points | upgrade stages (+1…+4) |
| Mushroom Tree | upgrade stages (over time) |
| **Bomb Mining** | **which bomb you use** (Bounce/Bounce+/Small/Small+/Large/Large+) — 6 distinct tables |
| **Bug Tree** | **hammer** (Black/White/Gold) **× swing timing** (Too Early / On Time / Too Late) = **9 tables**. App `pokke_items` only has the 3 hammers — it lacks the timing split, so the ROM is finer-grained than the app structure. In MHFU the Bug Tree gives the **Rhino beetles** (Royal/Divine Rhino). |
| **Insect Thicket** | **5 upgrade stages** (base, +1, +2, +3, +4). Gives the *non-rhino* common→rare bugs. |
| Bee Hive | Prototype / Production / Modified |
| **Field Rows** | **field level + what you plant** — a SET of small per-crop tables (community "Obtainable" = their union) |
| Great Sword Cave | gives Dark Stone / Dark Piece; **NOT in the gather format** — behaves like a carve (on hold) |
| Casting Machine | net/fishing (small/medium/large catch) — **on hold** |
| Fishing Pier | spawned-entity fishing — **no gather table** |

## Results

- **19/33 variants matched to ROM tables with percentages** (clean, sum-100): all Mining Point
  stages, all 6 Bomb Mining bombs, all 3 Mushroom Tree, all 3 Bee Hive, Field Rows Fertilizer, and
  partial Insect Thicket. Examples:
  - Bomb Mining / Small Barrel: `Earth Crystal 45%, Machalite 15%, Akito Jewel 15%, Rainbow 10%, Dragonite 10%, Ruststone×5 1%`
  - Mining Point +4: `Earth Crystal 28%, Union Ore 26%, Firecell 10%, Eltalite 10%, Rainbow 9%, Hrd Armor Sphere 5%, Stone 5%, Mellanje 5%, Hvy/Ryl Armor Sphere 1%`
  - Bee Hive / Modified: `Honey 70%, Insect Husk 30%`
- **Field Rows** = many small per-crop tables (`Fire Herb 85%/Dragon Seed 15%`, `Cactus Flower 65%/Red Seed 5%/Tropical Berry 30%`, …) — present, not one table.

## How the tables are organized (from VioletKIRA's GameFAQs Pokke Farm guide)

The guide (treat its numbers as approximate/hand-counted, but its **structure** as authoritative)
explains the ~55-vs-14 multiplier and the set system:

- **Tables multiply by STORY PROGRESS, not rank.** Bomb Mining lists **6 explicit tiers** — *Clear
  4★ / 6★ / 8★ / G1 / G2 / G3* — each a full table set. **Bug Tree** has the same multi-block
  structure. So one node has (tiers × sets) tables.
- **Common / Uncommon / Rare SETS per tier.** The **tool selects which set**: bomb *type* sets the
  Common/Uncommon/Rare *probabilities* (Bounce Bomb = 90% Uncommon, etc.); **hammer quality** picks
  the set; **swing timing picks QUANTITY** (the `#` column — within the flash = more items).
- **Insect Thicket = 5 clean single-% stages** (base→+4), no set/tier split.
- **Mushroom Tree / Beehive = single-% per renovation**; quantity scales with level.
- **Sword Cave (GSC)** = fixed `Dark Piece 60% / Dark Stone 40%`, mined once per quest with 2 Elder
  Dragon Bones — **carve-like, not a gather table** (why it's absent from the gather files).
- **Field Rows** = per-seed-color tables (Red/Green/Yellow) + a shared **bonus pool** + fertilizer
  level → quantity.

### CORRECTION: f5000–5130 extraction was location-contaminated

The guide exposed a mislabel: the **rhino-bearing "bug" tables are LOCATION gather, not farm.** A
rhino table matched **old_desert G-rank bugnet 7/7** (`cricket, divinerhino, emperorcricket, flashbug,
kingscarab, royalrhino, thunderbug`); Royal/Divine Rhino are **map** drops (guide Pokke-Points
section). Farm and location both live in f50xx and share items, so without the guide as oracle the
two couldn't be separated. Consequences:
- The genuine farm **Insect Thicket** tables (guide %s with Yambug/Bughopper/Vespoid/Hornetaur) are
  **NOT in the f5000–5130 cache** → real farm Thicket/Bug-Tree files are in a different range.
- Some of the **19 "matched" variants are suspect** (e.g. the "Mining Point" match had Goldstone
  Piece, which the guide's farm mining doesn't list → likely a location table). The distinctive-item
  variants (Field Rows per-crop, Bee Hive Honey, Mushroom Tree) are more trustworthy.
- **Fix:** re-extract using the **guide's exact percentages as fingerprints** against the full
  decrypted range; a table is farm iff it matches a guide farm table. This replaces item-overlap
  classification, which the shared-item problem defeats.

## Bug nodes (Insect Thicket + Bug Tree) — data extracted, binding BLOCKED

Structure (confirmed with user): **5 Thicket stages + 9 Hammer tables (3 hammers × 3 timings) = 14
logical bug tables.** But the cache holds **~55 unique bug tables** — the farm multiplies them across
upgrade-states/ranks, and the same `f50xx` files duplicate states.

**Why clean per-variant labeling is blocked:**
- The bug tables are **interleaved** with herb/ore/mushroom tables inside each farm-state file
  (e.g. f5011 bug tables at positions 0,1,3,5,6,7,21,24) — **position ≠ variant.**
- **~55 tables vs 14 logical variants** (state/rank/timing multiplication) — not a 1:1 map.
- Thicket's higher stages share items (King Scarab, Hercudrome, Rare Scarab, Emperor Cricket — and
  likely rhinos) with the Hammer tables, so **item-matching can't separate them.**

**What IS distinguishable:**
- **Rhino-bearing tables (Royal/Divine Rhino) = Bug Tree / Hammer** (rhinos are the hammer reward).
  Almost all bug-dominant ROM tables are rhino-bearing → mostly Hammer tables.
- **Common starter tables = early Insect Thicket:** `Spiderweb ~80%/Insect Husk ~20%`,
  `Worm/Mega Fishing Fly`, `Firefly/Mega Fishing Fly`.
- **REFUTES community data:** **no ROM bug table contains Vespoid or Hornetaur parts** (rhino or not).
  The community Thicket/Bug-Tree lists include Vespoid/Hornetaur Wing/Shell/etc — those appear to be
  **community errors** (or belong to a node not in this file range). ROM-authoritative ⇒ drop them
  unless found elsewhere.

**To finish:** need the **node→table binding** — the farm/village code's table-index per
node+stage+timing (the village-overlay equivalent of the location nodeset, which reads NULL on the
farm). That's a static-disasm dig on the farm overlay, separate from item-matching. The live farm
path is unusable (null nodeset, RNG too hot to BP).

## ✅ Great Sword Cave CRACKED (2026-06-25, live disasm)

GSC is **not** a weighted-table node and **not** a carve table — the drop logic is **hardcoded in the
fill function**, recovered by live trace. It does NOT use the bomb/bug gather engine (the `0x09C297a8`
writer + `0x09C299A4` roll never fire). Its own writer is **`0x09C2A730`** (called from state machine
`0x09A77114`), found via a **write-watchpoint on the reward buffer `0x0999A130`** (the buffer GSC shares
for display). Method note: testing the community 60/40 and the carve-metadata 36/30 against assorted
rules never converged — reading the fill code was both easier and exact (don't curve-fit rates; read code).

**Fill logic (`0x09C2A814`+):** count loop over 3 slots — slot active iff `(RNG & 0x1F) < cfg[slot]`,
config `@0x09CD3318 = [32, 32, 16]` → slot1 100%, slot2 100%, slot3 50%. Item write loop: **first slot
(s2==0) always writes `0x306` (774 Dark Piece)**; every other slot rolls `RNG%100` — **`<60` → Dark Piece
(774), else → Dark Stone (775)** = **60/40 per slot**; each qty=1.

| Slot | appears | roll |
|------|---------|------|
| 1 | always (cfg 32) | **Dark Piece 100%** |
| 2 | always (cfg 32) | **60% Dark Piece / 40% Dark Stone** |
| 3 | 50% (cfg 16/32) | 60% Dark Piece / 40% Dark Stone |

⇒ **2–3 items/mine (50/50)**, 1.90 Dark Piece + 0.60 Dark Stone per mine, **overall ≈ 76% DP / 24% DS**.
So the guide's 60/40 is the *per-slot* roll (correct), but the *overall* split is 76/24 (slot 1 forces DP);
the app's old 65/35 was unsourced. Costs 2 Elder Dragon Bones per mine.
## ✅ Trenya RESOLVED (2026-06-26, live trace) — UNIFORM within category, no per-item rates

Felyne expedition (pick location, pay Pokke Points → reward on return). **Reward is rolled AT DISPATCH**
into a source buffer (`0x09A04100` = farm-buffer `0x09999DA0` + `0x6A360`), then **copied** to the display
buffer (`0x0999A130`) at return by `0x09C2A928`. Catch: write-WP on `0x09A04100` fires at dispatch (no
quest needed); write-WP on the display buffer catches only the copy.

**The selection is UNIFORM within each category — there are NO per-item weights.** Pick chain (live-traced):
roll-loop (`0x09A948xx`) → per-slot writer `0x09A94D5C` (writes result records at `0x09B22D1C`) → validator
`0x9A7BF60` → **20-case item-TYPE jump table `0x9A7BB50`** (table at `0x09B0E8C0`, indexed by type 0–19) →
BOOT `0x8883988` → worker **`0x88838B0`**, whose core is a **`mult / mflo / mult / mfhi` range-reduction of
`RNG × count`** — the textbook "scale a random number into `[0, count)`" with **no weight array and no
weighted-accumulation loop**. So each slot picks a category, then a **uniform-random item** of that category,
with that item's own stack quantity. At 1500 pts a return fills **6 independent slots** (the same item can
occupy several slots — repeats take slots, they are not qty-stacked).

⇒ **No per-item Trenya rates exist** — the app's `trenya_items` lists (location × points × category, already
validated correct against a Great Forest 1500 capture) ARE the complete item-level data. `TrenyaPage.xaml`
annotated to say selection is uniform-within-category. **Open (finer, optional):** the per-slot *category*
choice may be weighted — the `/100` reciprocal const `0x51EB851F` lives in the category/slot path, not the
item pick. **Tooling note:** `cpu.stepInto` hangs in this PPSSPP WebSocket debugger; trace via call-chain
disasm + exec-BPs, and remember a write-WP wedges single-step on the watched store.

## Why the community had farm rates but not location rates

Not because the farm was easier to *extract* (it's the same encrypted format, arguably harder to
reach live). The farm is in the **village** — gatherable repeatedly between hunts with no quest
gating — so the community **hand-counted** it. Location nodes are quest-locked and impractical to
grind. So the community farm numbers are empirical (roughly right, sampling error), not ROM-exact.

## Tooling (in `…/ISO FILE/`)

- `offline_decrypt.py` — the XOR-Lehmer decryptor (shared with location gather).
- `_all_tables.json` — **cached** unique decrypted tables from f5000–5130 (avoids re-cracking; ~615
  unique tables total, ~55 of them bug-dominant).
- `_farm_assign.py` — 1:1 assign cached tables to `pokke_items` variants (gave the 19 matches).
- `_farm_assigned.txt` — the 19 matched variants with ROM % and community-only-item diffs.
- `_find_gsc_trenya.py` — targeted hunt for Great Sword Cave / Trenya across a file range.

## Open data corrections to watch (ROM-authoritative)

The matched ROM tables flag `community-only` items per variant (community has, ROM lacks) — likely
community errors or mis-staged items. Notable: Vespoid/Hornetaur parts in the bug nodes (see above).
Per the ROM-authoritative rule, prefer the ROM item-set; flag community-only items for review rather
than blind-deleting.

## Parameterized gather engine (decoded) — the farm's actual model

The farm resolves tables at runtime from this config (BOOT, offline):
- **Shape table `0x089A5C38`**: 7 **distribution shapes**, each 4 bytes `[N, w1, w2, w3]` with
  `w1+w2+w3 = 100` (set/quantity probability curves: `[1,100,0,0] [1,70,30,0] [2,100,0,0]
  [1,5,85,10] [2,25,50,25] [3,100,0,0] [5,100,0,0]`). Followed by a **pointer array** (`0x089A5C38`
  +0x38…+0x50) and the **diminishing success rates** `100 95 90 85 75 65 55` at +0x40 (decay as a
  node is re-gathered).
- **Roller `0x0885B82C`**: rolls `RNG(0x088900C4) % 100` against a selected shape (calls
  `0x885B5B8`, `0x885BDAC`).

**Still missing — the per-node binding:** each farm node's `(item-subset → shape)` config is NOT in
the gather files, the plaintext item-lists (those are sequential ID *enumerations*, e.g. f0064), or
findable by fingerprint. It lives in the **village/farm overlay** (consistent with the null-nodeset
runtime path). Decoding that overlay is the next, deeper step. The GameFAQs guide (`_guide_farm.json`)
is the validation oracle: once a node's item-subset + shape resolves to a table, check it vs the guide.

## Bomb Mining / Bug Tree / Field Rows — flat formats ruled out (need handler code-trace)

These use the count + Common/Uncommon/Rare-set structure (guide §7/§9). Tested and **ruled out**:
- `[id,weight]` pairs — a full-BOOT scan finds **only 5** mining tables (= the single-% Mining stages); the bomb sets are NOT here.
- `[id,count,weight]` triples (weights sum 100) — zero matches.
- repeated-item signature (same item at 2 counts) — only hits **tagged item-metadata** records
  (`id, 0xA3A2/0x2402, …` at e.g. 0x01E094, 0x072BF0), not weight tables.

⇒ The bomb/bug-tree/field tables are **not flat tables**; the count + set logic is applied in code
over a tagged/parameterized record (or a DATA-file overlay). **Next step is a code-trace** — find
the bomb-mining reader (static disasm of the village/farm overlay, or live trace) to get the exact
format + address, then validate against the guide. Sword Cave = `f0076` carve; Pier = f0071 fishing.

### Bomb Mining — live PPSSPP trace (2026-06-25), partial

Method that worked (Lg Barrel-Bomb+ handed; save state before hand-off): RNG capture → physics only;
**read-watchpoint** on node tables → 0 fires (bomb does NOT read `0x0899C63C`); searched RAM for the
exact reward → **display buffer at `0x0999A130`** = `[item_id u16, qty u16]` pairs, null-terminated
(8 entries for Lg Barrel-Bomb+, == on-screen reward); **write-watchpoint** on it caught the writer.

Anchors (overlay addresses float per area-load — re-derive by re-tracing):
- Display reward buffer: **`0x0999A130`** (`[id,qty]` pairs).
- Reward built by state-machine fn **`~0x09A75xxx`** (counter at `s5+0x1c`); writes buffer via
  subroutine `0x09C297a8`/`0x09C298xx` (VFPU-heavy; capstone basic-MIPS can't fully decode).
- Generic weighted **roller `0x8885494`** — sig `(a0=table_ptr, a1=count, a2=weight, a3=flag, t0)`.
  Table-pointer array at **`0x08A62EA4+`** → tables in `0x08B5xxxx`.
- At hand-off the roller fired **only twice, both with bomb-ITEM table `0x08B510C0`** (e.g. Clust S
  Lv3), a1=6 then 7 — **NOT the minerals.**

**Data-backed conclusion (not an assumption):** the mineral reward is NOT rolled at hand-off through
`0x8885494`, and NOT from the node tables — it's produced by a **different path and/or earlier in the
farm cycle**, then copied into `0x0999A130` for display. To catch the actual mineral roll: an **earlier
save state** (bomb setup / quest-return) + watch a broader set of rollers (`0x8885494`, `0x0885B82C`,
`0x0887265C`), or find `0x09A75xxx` in the decrypted DATA.BIN overlay and disasm offline.

**Tooling lessons (banked):** `memory.breakpoint.remove` requires the original **address AND size**
(address-only silently fails); a memory **write**-watchpoint **wedges `cpu.resume`** (re-triggers every
resume) — remove the BP *before* resuming. Exec BPs don't have this wedge. The roller is quiet at idle.

### Bomb Mining — verdict: VFPU-computed, resists plaintext extraction (2026-06-25)

User confirmed bomb mining is **rolled fresh each hand-off** (same bomb → different haul; instant, no
quest wait). Window = hand bomb → animation → reward menu opens. Multi-roller capture (`0x8885494`,
`0x0885B82C`, `0x0887265C`) over a full hand-off: **only `0x8885494` fired** (3×), always on table
`0x08B510C0`. But a direct scan of that table + the array's `0x08B59A40`/`0x08B59BC0` finds **0 mineral
IDs** (only "Clust S Lv3"-type data) — so the roller is NOT producing the reward minerals.

Net: the reward minerals are ❌ not in node tables, ❌ not in roller tables, ❌ not a verbatim RAM copy
(ordered-seq search → only the display buffer), ❌ not in `0x08Bxxxxx`. They are written to `0x0999A130`
by **VFPU stores** (`0x68`-opcode, capstone-undecodable), value rolled per hand-off. ⇒ **Bomb-mining
haul is computed in VFPU float, not picked from a plaintext `[id,weight]` table.** Every method that
cracked the single-% nodes (plaintext BOOT block) fails here by design.

**Two real paths (neither is a quick win):**
1. **Empirical sampling** — hand N bombs per type, record `0x0999A130` each time (RAM read, automatable
   via the live debugger), infer the distribution from game output. This is ROM-authoritative (actual
   game rolls) and is exactly how the community guide got its bomb numbers. Tedious but tractable.
2. **VFPU disassembly** — decode the fill/roller VFPU code (needs a VFPU-aware disassembler, not capstone
   basic-MIPS) to recover the float-weight tables. Deep, multi-session.

### ✅ Bomb Mining MECHANISM CRACKED (2026-06-25) — weighted Common/Uncommon/Rare in `0x09CDxxxx` overlay

Superseding the "two paths" above: live trace recovered the actual logic. The reward writer
`0x09C297a8` (called from state machine `0x09A75308`) is JUST the buffer **clear** (16 `sh zero`, why
the write-WP wedged on VFPU stores). The **fill** is at `0x09C29940+`:

- `0x09C29964 jr v0` — **switch on bomb type** (`v0 = *(ctx+8) − 0x54`, 9 cases) → set-index `s1` 0–5.
- `0x09C299D0` copies a **21-byte weight table from `0x09CD32E0`** (the Common/Uncommon/Rare split).
- `0x09C299B8`/`0x09C29A00` call **RNG `0x88900c4`**; `0x09C29A10 div …,0x64` = **RNG % 100**;
  `0x09C29A2C–A48` = cumulative-weight walk (`subu a1,a1,w; bgez; idx++`) → selected index.
- Item id + quantity resolved via `0x9c19680` from the **item-set tables in the `0x09CDxxxx` overlay**
  (e.g. mineral set @ `0x09CD0904`: `[id u16, qty u8, …]` 6-byte records — Earth Crystal/Machalite/
  Dragonite/Lightcrystal/Ice Crystal/Armor Stone/Armor Sphere/Suiko/Akito, == reward items).

**Set-selection weights @`0x09CD32E0`** (21 bytes, 0-separated groups, each = 100):
`[40,50,10] [60,40] [90,10] [90,10] [80,20] [40,60] [60,40]` — the Common/Uncommon/Rare percentages
the guide described, now ROM-confirmed. The data is in a **floating overlay** (`0x09CDxxxx` relocates
per area-load) — why BOOT/`0x08Bxxxxx` scans all returned 0. Display reward buffer = `0x0999A130`.

**✅ Item-set record format CRACKED + tables extracted (2026-06-25):**
record = **`[item_id u16, qty u8, common% u8, uncommon% u8, rare% u8]`** (6 bytes). The 3 weight bytes
are the **Common / Uncommon / Rare columns**, and within each set **every column sums to exactly 100**
(validated). Sets are bomb **power tiers**. Extracted 5 clean sets from `0x09CD0950`+ (overlay):

| Set | @addr | items | C/U/R sums | tier |
|----|-------|-------|-----------|------|
| 1 | 0x09CD0950 | 24 | 100/100/100 | low (Whetstone→Battlefield) |
| 2 | 0x09CD09E8 | 25 | 100/100/100 | mid (+Carbalite/Lapis) |
| 3 | 0x09CD0A88 | 31 | 100/100/100 | high (+Eltalite/Ryl) |
| 4 | 0x09CD0B48 | 33 | 100/100/100 | higher (+Mellanje/Tru) |
| 5 | 0x09CD0C18 | 34 | 100/100/100 | top |

Saved: `_bomb_sets.json`. **Validation:** Lg Barrel-Bomb+ reward (Mellanje/Hvy Armor Sphere/Carbalite/
Dragonite/Akito/Ice Crystal/Armor Stone) — all in SET 4. So Lg Barrel-Bomb+ → SET 4. There's also a
small leading set @`0x09CD0904` (~11 items) preceded by a 4-byte header `01 0C 0A 03`.

**✅ FULL MODEL CONFIRMED (2026-06-25, live) — the two axes are independent:**

- **SET (tier table) = STORY PROGRESS, not the bomb.** The fill code (`0x09C29A40`+) is a cascade
  `0x9c19680(progressCtx, questThreshold)` checks (thresholds 0x14,0x24,0x26,0x67,0x78,0x7a,0x7e) that
  pick the set base: `lui s4,0x9cd; addiu s4,…`. So a given player's progress fixes the tier table;
  **all bombs use the same set**.
- **SIX tiers, by cleared-quest rank** (corrected — first pass missed the 4★ tier @`0x09CD08D8`, which
  starts before `0x09CD0900` and was mis-scanned): **4★ @0x09CD08D8 (19 rec) · 6★ @0x09CD0950 (24) ·
  8★ @0x09CD09E8 (25) · G1 @0x09CD0A88 (31) · G2 @0x09CD0B48 (33) · G3 @0x09CD0C18 (34)**, every
  column = 100. Saved: `_bomb_sets_v2.json`.
- **Cross-validated against VioletKIRA's GameFAQs Pokke Farm guide §7: the ROM matches the guide
  EXACTLY** — all 6 bomb splits and all 6 tier tables (cell-for-cell: e.g. 4★ Iron Ore C20/U25/R10,
  Machalite U10/R32; player at G2). Independent confirmation of the live RE. The guide also supplied
  the quest-rank tier labels (4★/6★/8★/G1/G2/G3), resolving the earlier "tier→rank unknown".
- **BOMB = the Common/Uncommon/Rare SPLIT.** Switch `0x09C29964` (`v0 = itemid − 0x54`; **`*(ctx+8)` IS
  the item id — confirmed live**) → jump table @`0x09CF96D8` → `s1` → weight group @`0x09CD32E0`
  (`s1*3` stride): s1=0`[40,50,10]` s1=1`[0,60,40]` s1=2`[0,90,10]` s1=3`[0,90,10]` s1=4`[0,80,20]`
  s1=5`[40,60,0]`.
- **Roll:** `RNG%100` walks the split group → tier (C/U/R) → roll an item from that tier's column of the
  progress-set. Trigger = **opening the rewards table** (not the hand-off animation).

**Bomb → split (jump table @0x09CF96D8, id = case+0x54). SIX handable bombs (cases 0–5):**
| id | bomb | case → s1 | C / U / R |
|----|------|-----------|-----------|
| 84 | Sm Barrel-Bomb | 0→0 | 40/50/10 |
| 85 | Sm Barrel-Bomb+ | 1→1 | 0/60/40 |
| 86 | Lg Barrel-Bomb | 2→5 | 40/60/0  **(live-confirmed: reward = SET4 C+U only, 0 rare)** |
| 87 | Lg Barrel-Bomb+ | 3→**6** | **0/60/40** (live-confirmed; fallthrough VFPU sets s1=6, the 7th group `[0,60,40]`) |
| 88 | Bounce Bomb | 4→2 | 0/90/10 |
| 89 | Bounce Bomb+ | 5→3 | 0/90/10 |
| 92 | `dummy` (JP-only, **IS hand-in-able**) | 8→4 | 0/80/20  **(live-confirmed: reward = SET4 U+R only, 0 common)** |

Case 6 (id 90 Anti-Dragon Bomb) = supply/account, not hand-in-able. Case 7 (id 91 `dummy`) not offered.
**So SEVEN handable bombs** (cases 0–5 + case 8); only Lg Barrel-Bomb+ (case 3 fallthrough) split unread.

**Validation:** with player at SET 4, Lg Barrel-Bomb gave Iron Ore/Disk Stone/Dragonite/Earth Crystal/
Machalite/Ice Crystal — all SET4 Common+Uncommon entries, **no Rare-column items** (Mellanje/Carbalite/
Hvy Armor Sphere), exactly matching split `[40,60,0]`. Earlier Lg+ haul hit SET4 Rare items → its split
has R>0. **Effective % (per progress tier) = (C/100)·CommonCol + (U/100)·UncommonCol + (R/100)·RareCol.**

Anti-Dragon Bomb (id 90) + dummies (91,92) aren't hand-in-able (supply/JP-only) → menu won't offer them.
Bug Tree = same engine (hammer/timing as the switch input). Data in floating `0x09CDxxxx` overlay
(re-derive per session; switch jump table @`0x09CF96D8`, weight groups @`0x09CD32E0`, sets @`0x09CD0950`+).

## ✅ Bug Tree CRACKED (2026-06-25) — static in f0076, 10-byte records, 5 tiers

Found via the reframe "farm tables live in the ROM files, not (persistently) in RAM" — Bug Tree data is
**load-on-demand** in RAM (freed after the roll; the reward still writes to `0x0999A130`), but it sits
**static in `f0076.bin` right after the bomb tiers** (bomb tiers @0xB77D8–0xB7BE4; bug tiers @0xB7BF0+).

**Record = 10 bytes** (wider than the bomb's 6): `[id u16, qty u8, C u8, U u8, R u8, C' u8, U' u8, R' u8,
pad u8]` — **TWO C/U/R distributions**, each column summing to 100. The first triple = the guide's main
%, the second = the guide's parenthetical `(X%)`. (Why all earlier 6-byte/4-byte scans missed it.)
**Bait items have LOW ids** (Huskberry=93, etc.) — do NOT filter `id>100` or you lose the tier's front.

**5 progress tiers** (= guide §9's 5 blocks), all columns = 100, extracted to **`_bug_sets.json`**:
`@0xB7BF0 (20 rec) · 0xB7CC8 (29) · 0xB7DF8 (35) · 0xB7F60 (39) · 0xB80F0 (43)`. Tiers separated by small
non-tier blocks (jewel/YamaTsukamiFluid records) — parse each tier from its Huskberry start to the
first invalid record. Validated cell-for-cell vs VioletKIRA guide §9 (Godbug/Thunderbug/Huskberry/Insect
Husk/Yambug all match).

**Mechanic — verified vs inferred:**
- ✅ Hammer → set/column: Common Hammer reward = all Common-column bugs (one live run, Common Hammer + early swing → `0x0999A130` = Vespoid/Hornetaur Wing, Godbug, Killer Beetle).
- ⚠️ INFERRED main vs alt = swing timing: in *alt*, junk (Huskberry) drops to 0% and good bugs rise
  (Godbug 13→15) → reads as within-flash/perfect-timing vs normal. Not proven like the bomb switch.

**OPEN (deferred — user will supply in-game progress info):** (a) tier→quest-rank mapping — the guide did
NOT label bug tiers by rank (unlike §7 bombs' "Clear 4star"), so tiers are currently just 1–5; (b) confirm
the main/alt = timing read. App `pokke_items` Bug Tree NOT yet rebuilt — waiting on (a). Same engine as
bomb mining ([[farm-gather-cracked]]); 3 hammers (Common/Uncommon/Rare) likely = the 3 columns.

## Next steps

1. **Stage the 19 confident variants** (Mining/Bomb Mining/Mushroom/Bee Hive/Field Fertilizer)
   into `pokke_items` — add a `weight` column, back up DB first, reconcile item lists per ROM.
2. **Bug-node binding RE** — static disasm of the farm/village overlay to recover node→table indexing
   (resolves the ~55-tables → 14-variants mapping the item-matching can't).
3. **Great Sword Cave** — check the carve/reward tables (`f0076`), not the gather files.
4. **Trenya** — locate its reward data structure (separate from gather).
5. **Field Rows** — the per-crop tables are present; map crop→table if the app wants per-crop %.
