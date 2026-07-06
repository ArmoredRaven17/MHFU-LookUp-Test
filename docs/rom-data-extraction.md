# MHFU ROM Data Extraction — Process & Reference

How the encrypted Monster Hunter Freedom Unite (`ULUS10391`) master-data archive
`DATA.BIN` was reverse-engineered and decrypted, so the game's authoritative data
can be pulled directly instead of trusting error-prone community wikis.

> **Status:** Phase 0 (decrypt) **complete**. Phase 1 (map tables) substantially done.
> **Item rarity/value/stack are now ROM-verified ground truth** (item-master table
> found & decoded — §11). `f71` identified as the `game_task.ovl` overlay and its
> carve-table *addressing* decoded; the carve/gathering **rate→item linkage** is the
> remaining open problem. See §11 (latest) and *Current State*.

---

## 1. Why

The app's data was filled/corrected from community sources (notably
`vallode/mhfu-blacksmith`) and partially verified against PPSSPP save-state RAM
dumps. The RAM route had two hard limits:

1. **Partial residency** — a save-state only contains what the game had loaded;
   weapon recipes, loot/carve %, and gathering % were never fully resident.
2. **Local-index indirection** — where data *was* in RAM (weapon recipes, loot),
   materials are stored as indices into a sub-list, not global item IDs, so they
   couldn't be matched.

The fix was to decrypt the full `DATA.BIN` (772 MB) master archive offline.

## 2. Inputs / layout

Working folder: `C:\Users\humph\Downloads\MHFU Armors\ISO FILE\`

| File | What it is |
|---|---|
| `Monster Hunter Freedom Unite.iso` | The UMD image (886 MB). |
| `BOOT.BIN` | **Unencrypted** game ELF (MIPS32 LE) — extracted from `/PSP_GAME/SYSDIR/BOOT.BIN`. The code. |
| `EBOOT.BIN` | `~PSP`-encrypted twin of BOOT.BIN — **ignore it**. |
| `item_table.txt` | 1260 items, `id<TAB>name`, recovered earlier from RAM. Ground-truth Rosetta. |
| `DATA_extracted/f0000.bin … f6656.bin` | The 6657 decrypted archive files (generated below). |
| `databin_unpack.py` | Reusable decryptor (cipher + index parser + `read_file`). |

`DATA.BIN` lives inside the ISO at `/PSP_GAME/USRDIR/DATA.BIN`, ISO byte offset
**113,967,104** (extent LBA 55648 × 2048), length **772,732,928**. It was read
directly from the ISO at that offset rather than extracted separately.

ELF address mapping (BOOT.BIN): `file_offset = vaddr - 0x08804000 + 0x25b4`.

## 3. Tooling

### Ghidra (the decompiler that cracked it)
- **Ghidra 12.1.2** at `C:\Tools\ghidra\ghidra_12.1.2_PUBLIC`.
- Java: Android Studio's bundled JDK 21 — set
  `JAVA_HOME=C:\Program Files\Android\Android Studio\jbr` before launching.
- Project `C:\Tools\ghidra_proj\mhfu` already has `BOOT.BIN` imported + analyzed
  (Ghidra parses it natively as a MIPS ELF).
- Decompile helper: `C:\Tools\ghidra_scripts\DumpCodec.java`. **Must be Java** —
  Ghidra 12 dropped Jython, so `.py` post-scripts need PyGhidra. Edit the `addrs[]`
  seed list to retarget; it BFS-expands callees and writes decompiled C to
  `ISO FILE\ghidra_codec.c`.
- Re-run a script without re-analyzing (fast):
  ```powershell
  $env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
  & "C:\Tools\ghidra\ghidra_12.1.2_PUBLIC\support\analyzeHeadless.bat" `
      "C:\Tools\ghidra_proj" mhfu -process BOOT.BIN -noanalysis `
      -scriptPath "C:\Tools\ghidra_scripts" -postScript DumpCodec.java
  ```

### Python
`capstone` (manual MIPS disasm, used before Ghidra), `numpy` (fast bulk decrypt),
`pycdlib` (ISO extraction). All already installed.

## 4. How the cipher was found

1. Characterized `DATA.BIN`: uniform ~7.96 entropy, flat byte distribution, no
   header/TOC, no `MHP2`/`<LZ` magic markers, no standard decompressor works →
   **fully encrypted**. No AES S-box or kirk/crypt strings in BOOT.BIN → custom.
2. Found the only xref to the path string `disc0:/PSP_GAME/USRDIR/DATA.BIN`
   (vaddr `0x0899a2fc`) → a constructor at `0x0884f874` that stores a vtable.
3. Decompiled the file-object init `FUN_0884d878`: it `sceIoOpen`s DATA.BIN,
   `sceIoRead`s two header chunks (`0x6808` + `0x1968`), passes each to
   **`FUN_0884ea1c`** (the decrypt), and spawns a `"fakeRofsLoader"` thread —
   so DATA.BIN is an encrypted **read-only filesystem**.
4. `FUN_0884ea1c` = the cipher; `FUN_0884ec3c`/`FUN_0884ecac` = the PRNG;
   `FUN_0884e998` = the per-file seed (`= sector number = byte_offset >> 11`).

> Dead ends worth remembering: a bit-op-count heuristic flagged `FUN_08851680`
> (actually a jump-table data accessor) and the SHA-1 routines
> (`FUN_08903f84`+, integrity layer) as "crypto" — they are NOT. Use the
> decompiler, not opcode heuristics.

## 5. The cipher (fully recovered)

- **S-box**: 256 bytes at BOOT.BIN vaddr `0x0899a138` (file offset `0x1986ec`).
  It is a permutation.
- **Keystream** — two Lehmer PRNGs seeded from an integer `seed`:
  ```
  s1 = seed & 0xffff   ; if s1 == 0: s1 = 0x7f8d
  s2 = seed >> 16      ; if s2 == 0: s2 = 0x2345
  per 32-bit word (update BEFORE use):
      s1 = (s1 * 0x7f8d) % 0xfff1
      s2 = (s2 * 0x2345) % 0xffd9
      keystream_word = (s2 << 16) | s1
  ```
- **Decrypt, per 32-bit little-endian word**: substitute each of the 4 bytes
  through the S-box, then XOR the word with the keystream word.
- **Seed = the sector number** = `byte_offset // 0x800`. The header is at sector 0
  → seed 0.

## 6. Archive structure ("fake ROFS")

- Sector size **0x800** (2048) bytes.
- **Header** at byte 0, length `0x8170`, decrypted with **seed 0**:
  - First `0x6808` bytes = a `u32[]` of **file-start sectors** (monotonically
    increasing). 6658 entries; the last (`0x5c1df`) equals the total sector
    count ≈ the 772 MB file size. → **6657 files**.
  - Next `0x1968` bytes = a secondary metadata structure (not needed for extraction).
- **File `i`** occupies sectors `index[i] .. index[i+1]`, located at byte
  `index[i] * 0x800`, decrypted with **seed = index[i]**.
- ~5593 / 6657 files decrypt to low entropy = stored **raw** (no decompression).
  Verified content: f19/f20/f21 = English/French/German UI text
  (*"Select an item to exchange."*); magics `TMH0` (models), `MIG.00.1PSP`
  (textures), `MWo3` (`.ovl` overlays), `RIFF` (audio), `Head`, `dbsT`.
- A minority of files may use the game's custom `<LZ`/`LZD3` codec
  (decompressor not yet located; only needed if a target table turns out compressed).

## 7. Extraction pipeline (reproduce)

```python
import sys; sys.path.insert(0, r"C:\Users\humph\Downloads\MHFU Armors\ISO FILE")
from databin_unpack import DataBin
db = DataBin()                 # opens the ISO, parses the index
print(db.nfiles)               # 6657
data = db.read_file(19)        # decrypted bytes of file 19 (English text)
```

All files were extracted to `ISO FILE\DATA_extracted\fNNNN.bin` with a numpy
bulk-decryptor (seed-independent power tables `0x7f8d^k mod 0xfff1` and
`0x2345^k mod 0xffd9` precomputed once, then vectorized per file) — **~8 seconds**
for the whole 772 MB. See `databin_unpack.py` for the reference (per-word) version.

## 8. Container & text-table format

Many files (incl. f19) are containers:
`[u32 section_count][u32 section_offsets...][per-section data]`.

f19 (English master text) has **23 sections**; section 2 (`0x8c99..0xe6df`) is the
**item-name table**: contiguous null-terminated ASCII strings in **item-ID order**.
Verified: every name matches `item_table.txt` exactly (`Stone, Disk Stone, Iron Ore,
Earth Crystal, Machalite Ore, Dragonite Ore, …`). Other languages: f20–23.
Quest text cluster: f4781–4787.

## 9. Phase 1 findings (file → meaning map)

**f19 = English master text, 23 sections** (container format above). Section map:

| f19 section | contents | count |
|---|---|---|
| sec1 | monster / entity names | 1708 |
| sec2 | **item names** (ID-ordered, verified vs `item_table.txt`) | 1627 |
| sec3 | item descriptions | (long text) |
| sec4 | **weapon names** | 1481 (≈1491 weapons) |
| sec5 | weapon descriptions | |
| sec6 | bow/bowgun names | 353 |
| sec8/10/12/14/16 | **armor names** head/chest/arms/waist/legs | ~420 each |
| sec9/11/13/15/17 | armor descriptions | |
| sec19 | save/UI strings | |
| sec22 | profanity filter (name censor list) | 939 |

f20–23 = other EU languages (same layout). f4781–4787 = quest-text cluster.

**Technique — RAM oracle for classifying binary files.** Take a distinctive 24-byte
chunk from a decrypted DATA.BIN file and search it in the PPSSPP RAM dumps. A file
whose bytes appear in `Smithy states\smithy0.bin` (SnS create-menu) but NOT in the
quest dump is loaded by the **smithy** subsystem; etc. This sidesteps format-guessing.

**Findings:**
- **f5389** (581 KB, by far the most item-ID-dense file: 74,520 item-range u16 values)
  appears in `smithy0` but not the quest dump → it is **smithy/crafting data**.
  It loads at smithy0 RAM offset 21,131,349 (delta `0x13dfdb9`), i.e. RAM
  `0x13dfdb9..0x146ddb9` (~20.8 MB) — a DIFFERENT region from the RAM-decoded armor
  recipe/stat tables (~9.69 MB / 9.84 MB), so those came from other files. f5389 has
  4 sections; sec3 (546 KB) is the big data table but its leading rows look like
  (item, 0x404) pairs / consumable lists — record format still TBD (could be combos,
  item data, or weapon recipes in an indexed form).
- **f3196–f3959** (~760 files, 16–20 KB each, ~24% item density, versioned `…1.0`
  headers) load in NEITHER smithy nor quest dump → some other per-context system
  (plausibly per-quest or per-map data — count ≈ MHFU quest count). Examined f3843:
  item lists (Flash Bomb, Honey, Blue Mushroom…) + binary, no clean text.

## 10. Current state & next steps

**Done**
- Phase 0: DATA.BIN decrypted; all 6657 files extracted; cipher + tooling documented.
- Phase 1 (substantial): text tables mapped + item names verified; entity skeleton
  (counts) established; container format decoded; **f5389 identified as smithy data**
  via the RAM oracle; per-context f3xxx cluster localized.

**Gathering data — localized (your quest-state insight).** Gathering tables load at
quest **start** (map load), so they're already resident in the existing Jungle quest
dump `state2.bin` — no new capture needed. RAM oracle vs quest-not-village gave **140
quest-only files** (Jungle map/monster/gathering/loot). Of these the item-dense data
tables are **f81** (1 MB), **f5401** (149 KB, quest-specific), **f3407** (213 KB) — all
contain 100% of the app's 73 Jungle gathering item IDs. BUT the record format isn't a
flat (item, rate) array: the dense regions interleave item IDs with paired `0xFFxx`
values (look like signed/flag fields), and the app's per-node item *order* does not
match the ROM grouping, so exact-sequence anchoring failed. **The app's gathering
item lists themselves look correct (all items present); the missing piece is the
per-item RATES, which need the record format decoded.**

> ⚠️ **SUPERSEDED 2026-06-21 — see §12.** The carve/reward tables are in **f0076** (a data
> file), format `(pct u16, id u16)`, items stored as global `id−1` (NO indirection). f71 is the
> *code overlay that reads* carve data at runtime; the `[40,20,15,15,10]` byte-run hit below was
> coincidental. The "hard wall / largely divergent" conclusions further down are wrong — solved.

**Loot/carve table — FOUND: f71.** Anchored on the known Vespoid high-rank body carve
`[40,20,15,15,10]` (confirmed in RAM earlier) → a **unique** hit at f71 offset 1470404.
f71 (1.78 MB) is the monster loot/carve table; it is NOT a container (raw data). The
**percentages are a directly-readable contiguous byte array** (carve sets back-to-back,
e.g. `…70 20 20 15 15 · 60 30 25 30 25 · 50 20 10 15 10 · 40 20 15 15 10…`). However the
**items are NOT stored as a parallel u16 array** next to the percentages — the matching
carve items (Vespoid Carapace 658, Vespoid Wing 659, … for that set) do not cluster
near offset 1470404. This is the **local-index indirection** again (Phase 2): loot
references items by position in a per-monster sorted sub-list, not by global ID.

**Master data-file map (located so far):**
| file | role | how found |
|---|---|---|
| f19 | English master text (item/weapon/armor/monster/skill names) | item-name string search, verified |
| f20–23 | other EU language text | parallel layout |
| f4781–4787 | quest text | string search |
| **f5389** | smithy/crafting data | RAM oracle (smithy-only) |
| **f71** | monster loot/carve table (% direct, items indirected) | known-carve-% anchor |
| f81 / f5401 / f3407 | gathering candidates (all 73 Jungle items present) | quest-state oracle |

**ROFS secondary header decoded** (the `0x1968` bytes after the sector table): it is a
table of **(file_index u32, decompressed_size u32)** pairs for the **813 compressed
files** — i.e. which files use the custom LZ codec and their unpacked sizes. NOT a
name table. So files are addressed by **numeric index** in the game code (no names),
and f71 is absent from this list → confirmed stored raw.

**Loot indirection confirmed code-driven (Phase 2 trace begun).** In f71 the carve
percentages are a direct byte array, but the matching items are neither a parallel
array next to the % nor a sorted per-monster sub-list near it — Vespoid's 11 drop
items cluster loosely around byte ~80006 (far from the % at 1470404), mixed/repeated.
So the %↔item linkage is resolved by **code at runtime** (index → sub-list), not by
data adjacency. → Must trace the reader in Ghidra.

**Trace plan.** Since files are opened by numeric index via the fakeRofs worker
(`FUN_0884de3c`, which dequeues requests carrying a ushort sector-table index at
`entry+0x20*i+6`), the route in is: find the fakeRofs **read-request API** (the
enqueue side) and enumerate its **callers** → that maps file indices to subsystems
(which code loads f71 / f5389 / the gathering files), giving the anchor to the
loot/recipe/gathering readers and their record formats.

### Phase 2 trace — progress & the anchor problem (2026-06-20)

Ran several Ghidra passes (`DumpCodec.java`, `-process BOOT.BIN -noanalysis`, with a
CALLERS dump added). Findings:
- The fakeRofs is a **decoupled singleton service**: both the init `FUN_0884d878`
  and the worker `FUN_0884de3c` have **no direct callers** (started as threads /
  reached via globals), so there is no call-chain to walk up to the requesters.
- Requesters submit via an **enqueue** that fills the request array at `obj+4`
  (0x20-byte entries: buffer@+4, file-index u16@+6, size@+8; count@`obj+0x1004`).
  Found the array-init (`FUN_088b85cc`) and worker-side managers, not the enqueue yet.
- **Anchor attempts that failed** (all hit the decoupled-service wall):
  1. Secondary header → compressed-size table, no names.
  2. fakeRofs caller trace → init/worker have no callers.
  3. RAM-correlation of the f5389 (recipe) buffer pointer → 131 mostly-coincidental
     round-address pointers in static RAM, none cleanly at f5389's base
     (`0x09bdfdb9` in smithy0); the recipe code likely indexes the buffer rather than
     storing a base pointer.

### Item-index table format + reward mechanic (2026-06-20)

Searching `state2.bin` for a quest's known reward items (app's "Beating of Royal Wings"
/ Vespoid Queen reward list) found a tight cluster at byte 11701822: an **item-indexed
table**, record = **`[item u16][00][data u8]`** (4 bytes), item IDs **sorted**, items with
multiple drop sources repeated (e.g. Blood Red Horn 668 ×2, Monoblos Shell 670 ×2,
Vespoid Abdomen 655 ×8). This is the per-item reverse index ("where obtained").

- The **data byte is NOT a plain %**: values range 9–253 (e.g. 668→251, 671→221),
  impossible for a single drop chance. Calibrated against the *known* Vespoid high-rank
  carve `[40,20,15,15,10]` for items `[658,659,660,24,25]` → table gives `36,74,81,…`,
  **no match**. So the byte is an encoded **weight or offset**, not the rate.
- **Reward mechanic (user-confirmed):** each reward item is rolled **independently**
  (its % = P(item appears)); guaranteed items = 100%; box totals exceed 100% because
  there's no per-roll normalization. Carve is the different "one item per carve, %s sum
  to 100" distribution (the f71/state2 byte arrays at ~29.1 MB).
- **No external calibration available** — the user exhausted all sources before RE'ing
  the ROM, so there's no trusted weight↔% pair to solve the encoding from data alone.

**Net:** the rate↔item linkage AND the weight→probability encoding are resolved only in
the reader code. The data side is exhausted.

### Deep Ghidra trace — RNG anchor + RAM-base calibration (2026-06-20)

- Game RNG = **drand48** 48-bit LCG: constant pool at ELF vaddr `0x893349e`
  (`0xDEECE66D` mult-lo, `0x0005` mult-hi, `0x000B` increment), with a `0x1234ABCD`
  marker at `0x893349a`. NOT referenced by normal address loads (vestigial or
  `$gp`/pointer-accessed) — RNG anchor didn't pan out.
- **RAM-base calibration (genuine advance):** the `0x1234ABCD`+drand48 data IS in the
  PPSSPP dumps at offset 9647347 → mapping **`vaddr = ram_offset + 0x07ffffa7`**
  (≈ base 0x08000000). Lets any RAM-dump offset be turned into an ELF vaddr for xref.
- **The loot tables are RESIDENT** (item-index table @ off 11678562 and the carve%-ish
  region @ off 29123349 are byte-identical across village/quest dumps) — fixed addresses.
- Scanning code for direct refs to those vaddrs: the carve%-region refs all land on a
  **neighboring area-spawn table at `0x9bc8500`** (FUN_08872108 reads 3×i16 x/y/z per
  area; FUN_08871bc4 indexes it by a monster's area-byte for AI). That's **map/AI data,
  not loot**.
- **Likely-coincidental anchor:** nothing points to `0x09bc62dd` (my `[40,20,15,15,10]`
  carve match), the nearby code is monster-AI, and that 5-byte sequence is the only
  evidence it's carve data. So the f71/`[40,20,15,15,10]` lead is probably a coincidence
  in map/area data — **f71 is more likely map/placement data than the loot table.**
- The real item-index table (sorted item IDs @ `0x08b23309`) is referenced only via
  **heap pointers**, not a static global, so it can't be cheaply xref'd to a reader.

### f71 CONFIRMED = monster data; carve is real (2026-06-20, later)

Reliable anchor breakthrough: **hitzones** (damage multipliers, zero overlap with item
data). Tigrex's head hitzone `75 65 40 0 15 5 30 20 110` (cut/bash/shot/fire/water/ice/
thunder/dragon/ko — note ROM elem order fire/water/ice/thunder/dragon) matches **24/24**
in **f71 @ 1471897**, and is resident in RAM @ 29124850 (vaddr `0x09bc6899`). So:
- **f71 IS the monster/quest data file** — my earlier "f71 = map data" was the error; the
  `[40,20,15,15,10]` carve anchor @ f71:1470404 / RAM:29123357 is REAL (it's Vespoid high
  body carve), 1493 bytes from the Tigrex hitzones (different *tables*, same file).
- f71 holds **separate tables**: a carve **% byte-array** (sets back-to-back, 0-separated),
  a **hitzone** table, and an **area x/y/z coord** table at vaddr `0x9bc8500` (read by the
  map/radar display fns `0x8872108`/`0x887221c`/`0x8871bc4` — NOT carve).
- Carve **items are not global IDs in f71 at all** — pure indices; the resolution
  sub-list lives elsewhere (global item-index table @ `0x08b23309`, or another file), and
  the % values aren't the app's display %s (weights/different encoding). So the
  index→item→% chain spans ≥2 structures + an unknown weight encoding.

**RAM→vaddr calibration:** `vaddr = ram_offset + 0x07ffffa7` (from the drand48 marker).
Game RNG candidates (drand48 pool @ `0x893349e`; Park-Miller 16807) are NOT referenced by
direct address loads — so the carve roller is reached via a monster **object pointer**,
not a static address, defeating static xref.

### RECOMMENDED next approach: dynamic analysis (PPSSPP debugger)

Static RE keeps losing to the object-pointer + multi-table indirection. The decisive move
is to **watch the game do it**: in PPSSPP, set a **memory read-breakpoint on the carve
data** (RAM ~29123357, vaddr ~`0x09bc62dd`) and carve a monster — PPSSPP halts on the
exact instruction reading it. That instruction → the carve reader function → decompile in
Ghidra (project already set up) → the format falls out directly (index base, weight→%
formula, sub-list pointer). Same trick works for quest-reward and gather readers. This
sidesteps every static wall hit so far.

**Honest conclusion on rates:** the rate data resists every reliable anchor — rate bytes
(0–100) are too short to locate unambiguously, item refs are code-indirected, and the
readers use base-pointer field access that static scans can't trace. Cracking it would
require mapping the full monster/quest data-record structures from the decompiled
readers — a long, deep RE effort, not a quick win. The decryption + full data access
remains the banked result.

**Conclusion:** cracking the index→item resolution is the hard tail. It needs either
(a) sustained Ghidra navigation — locate the fakeRofs **object global** (the singleton
handle), then the read API that references it, then its callers' file-index constants;
or (b) a **targeted RAM capture** anchor (e.g. a save-state on a carve-result screen
showing a known item, to correlate the displayed item ↔ the buffer read), the same
trick that nailed the create-menu data. The **percentages are already readable** in
f71, so carve-% verification does not depend on this crack.

**Open (Phase 1 → 4)** — now iterative data archaeology, no more hard walls:
- Decode f5389 sec3's record format → extract the crafting recipes it holds.
- Find the **weapon recipe**, **monster loot/carve %**, and **gathering %** tables —
  either by parsing f5389 / f3xxx, capturing more targeted PPSSPP states for the RAM
  oracle (e.g. a gathering screen, a quest-reward screen), or Ghidra-tracing the load
  call for each subsystem to get the exact file index + record layout.
- Phase 3: verify the app's existing data (esp. weapon recipes) against ROM.
- Phase 4: fill the gaps (gathering %, loot/carve %).

## 11. Overlay decode, item-master found, foundation rebuilt (2026-06-20, latest)

**Dynamic analysis was tried and FAILED — and the failure was the clue.** PPSSPP
memory read-breakpoints on `f71`'s loaded carve/hitzone buffer (vaddr ~`0x09BC66C1`)
**never tripped** on combat, carve, or area-change (even on the IR Interpreter, with
the breakpoint verified as Memory/Read). So **the game never re-reads the f71 buffer
during gameplay** — it's read once at load and worked from transformed copies. The
live-breakpoint route is structurally a dead end for this data; stop pursuing it.

**`f71` IS `game_task.ovl` — the game-logic OVERLAY (code + data, not a flat table).**
Header magic `4D 57 6F 33` ("MWo3") + filename `game_task.ovl` @ +32. **Loads at vaddr
`0x09A5F300`** (vaddr = file_offset + `0x09A5F300`; the MWo3 header has a 0x200 prefix —
do NOT use `0x09A5F100`, off-by-0x200 corrupts intra-overlay `jal` targets in Ghidra).
Import: `-processor MIPS:LE:32:default -loader BinaryLoader -loader-baseAddr 0x09A5F300`.

**Carve-table *addressing* decoded** (Ghidra selector `FUN_09ababc0`): a per-monster
struct array (stride `0x1d0`=464 B) indexed by monster/area id (`ctx+0x1e8`); each
struct holds **per-rank record pointers** chosen by a switch on the quest-rank global
(`_DAT_089cc558+0x6af10`, cases 0–0x1f) → stored to `ctx+0x4c8`. Carve %-records are
in-overlay; the rank-switched *reward* records point OUTSIDE the overlay (runtime-loaded
per-quest reward tables). **Still open:** the record's internal item-index encoding (the
roller is reached via the runtime monster object → defeats static xref, same wall).
Helper: `C:\Tools\ghidra_scripts\DumpCarve.java`; output `ISO FILE\ghidra_carve.c`.

### Item-master table — FOUND & DECODED (rarity/value/stack)

It is **RAM-resident only** (compressed on disk → absent from `DATA_extracted/`, which
is why every plaintext-file search failed). Read from a RAM dump: `state_ram.bin` @
**file offset `0x99d32b`**, **24-byte records**, indexed by `item_table.txt` order (ROM id).

| offset | field |
|---|---|
| +0 u8 | rarity, **0-based** (byte +1 = displayed Rare) |
| +1 u8 | stack/carry (consumables 10, materials 99, jewel 1) |
| +3 u8 | type/category |
| +10 u16 | buy/base value (≈10× sell) |
| +14 u16 | **sell value** (matches app exactly: Shell 120, Wing 73, InnrWng 512, Broth 1000) |

**Method that cracked it (REUSABLE for any indexed table):** anchor a strided byte-column
search on a run of **user-confirmed true values**. The user read 24 real in-game rarities
(items 0–27); a search of every file+RAM for a 24-byte column reproducing that exact
sequence (testing 0-based / u16 variants, strides 1–79) gave a single unique hit. Exact
match across 20+ low-cardinality anchors ≈ 1-in-10^16 — decisive where blind structural
search fails.

**Verification & key conclusion:** 24/24 anchors exact; Rare 8 = the 7 monster Jewels,
Rare 7 = elder-dragon rares (semantically correct). Distribution
`{1:75,2:76,3:103,4:269,5:695,6:21,7:14,8:7}`. **In MHFU, crafting materials cap at
Rare 5** — all 42 items at Rare 6–8 are treasure/trading items (Jewels, melons, eggs),
none tracked by the app. The app's "577 at rarity 5" was CORRECT (Rare 6+ for *materials*
is an MHGU-era thing). App **value & stack also verified correct** vs ROM.

### Item-table foundation rebuilt

- `docs/rom_item_master.json` — 1260 items {id,name,rarity,value,stack} = **ground truth**.
- `docs/app_to_rom_map.json` — app-name → ROM-id bridge.
- Reconciled 901/920 app items: **23 name fixes** (typos → in-game names, each validated
  as the same item by matching value+rarity), **58 value fixes**, **41 stack fixes**, rarity.
  Backups: `data/mhfu.db.bak-rarity-rom`, `data/mhfu.db.bak-itemfoundation`.
- Unresolved: 8 JP-magazine promo tickets (Famitsu/Dengeki/Magazine/Pirate — not in the US
  ROM) + 3 oddities (`Pur Rubbery Wng`≈Pur Gypceros Wng, `Amezari Shell`×2 no match).
- Missing from app: **347 ROM items** (~120 real materials, ~30 monster "Info" unlocks,
  42 treasure, 16 ammo) — pending an add-for-completeness pass.

### DUMMY items — JP-only (MHP2G) content disabled in the US ROM

`ULUS10391` retains **16 items** disabled by blanking the f19 name to `"dummy"` while keeping
the **full item-master record intact** (rarity/value/stack/type preserved — only the name
string was stripped). These are MHP2G (Japanese MHFU) items, unobtainable in the US version
without save-editing; historically reachable via **cross-play with JP players** (trade JP
materials → forge JP-only weapons — ties to the `DUMMY` weapon entries in vallode's data).
Category inferred from the item-master `+3` **type byte** (mapped via matched items) + neighbors:

| ROM id(s) | type | inferred category | context (neighbors) |
|---|---|---|---|
| 90, 91 | 0x02 | Hunting Tools (bombs/throwing) | after `Anti-Dragon Bomb` |
| 464 | 0x09 | Monster Material — unique part (val0, stk1) | Rajang block (`Rajang Tail`…`Gold Rajang Pelt`) |
| 517, 518 | 0x34 | Monster Material — high value (3000 / 6000z, stk99) | Shen Gaoren / Rathian region |
| 928–938 (11) | 0x25 | Unique Material / promo tickets | ticket region (`Limited Paw Pass`…`Hunter's Ticket`) |

The block **928–938 are the JP promo/event tickets** — they line up with the app's
`Famitsu / Dengeki / Magazine / Pirate / SpecFamitsu` tickets, which the app carries with JP
names from a JP source. So the app is **more complete than the US ROM** here → **keep those app
entries** (they name otherwise-blanked dummies; do NOT delete them as errors). Recovering the
exact name↔id mapping needs the JP MHP2G item table (or vallode's DUMMY weapon data); obtaining
them in-game needs save-editing. All dummy records' data is intact → a save editor can read/write them.

**Recovered dummy identities + naming cleanup (2026-06-20):** the app's JP-sourced names
de-blank two dummies — **517 = `Amezari Shell`, 518 = `Gt Amezari Shell`** (matched by value
3000/6000z) — and the 8 JP tickets correspond to 928–938 (the app is the Rosetta here).
Aligning app names to the ROM also exposed **12 duplicate names**: 8 true redundancies (a
mistranslated/typo variant + the canonical, e.g. `ThckWhtFatlisShl`→`…Scl`,
`Hunter Soul Ticket`→`Hunter's Ticket`) + `Pur Rubbery Wng` (stale dup of `Pur Gypceros Wng`
id 406 — the old "Rubbery"=Gypceros naming) → **9 rows removed** (920→911). The other 4
(`Frozen Berry`, `Select`/`Spicy Mushroom`, `Sushifish`) are the app's **intentional
multi-category listings** (same item under e.g. Consumable + Plants tabs) — kept. Item refs
are **name-based** (no numeric item-id columns), so removing a dup row is safe (the name
persists). Backups: `data/mhfu.db.bak-{rarity-rom,itemfoundation,dedupe}`.

**Missing-items pass (2026-06-20):** of the 347 ROM items absent from `items`, only **5 were
genuine gaps** → added `Congalala Pelt`/`Pelt+`, `Grn Plsioth Fin+`, `Crag S Lv3`,
`Hunter Soul Tkt` (911→916). The rest are tracked elsewhere or out of scope: **163 decoration
jewels** live in the separate `decorations` table (some — e.g. `Paralysis Jewel`,
`Pep Jewel` — appear MISSING there → a *decorations-table* audit, not `items`); **~42 treasure**
items (melons/eggs/monster-Jewels = the trading system); **~31 monster "Info"** items
(hunter's-notes refs). Decisions on treasure/Info/deco-audit are open (user's call). **Method
notes (reusable):** infer item category from **rom-id range** (item_table.txt is
category-ordered: consumables→tools→ammo→plants→minerals→bones/insects→monster-mats(300-949)→
unique/spheres), NOT the +3 type byte; detect decorations by description (`"Decoration that
raises…"`). **f19 item descriptions** = null-terminated strings in item order starting at file
offset **0xfc4d** (= item id 6); `desc(rid)=descs[rid-6]`, 92% verbatim-match vs app (rest are
app-edited). Backups `.bak-additems`, `.bak-addmaterials`.

**Full reconciliation complete (2026-06-20):** decorations ARE items by item-box definition
(per the MHGU save editor) — verified the `decorations` table is complete (168/168 ROM
decorations present). Treasures live in the `treasures` table (142, the treasure-quest
gathering items) and trading-treasures act like Account/Supply (pouch, turned-in). Added the
final 48 residual ROM items to `items` (29 monster "Info" → Account Items, 12 trading-treasures
→ Unique Materials, 7 materials → Monster Materials, e.g. `Congalala Stomch`/`Innrds`,
GarugaClavclMeat — these had rom_id≥950 so the earlier <950 cutoff missed them). **Result: 0 of
1244 non-dummy ROM items unaccounted** across items(964)/decorations(168)/treasures(142). Backup
`.bak-addremaining`. The item foundation (rarity/value/stack/name/category, ROM-keyed) is done.

### Carve-rate verification — initial pass (2026-06-20)

**f71 IS the carve source** — per-monster carve records (struct array @ `0x09bb89bc` → records
`0x09bc50a0+`; Vespoid @ `0x09bc6280`). Each record is a **2D %-table**: rows ≈ rank/carve-type
(stride ~20 bytes), columns ≈ the monster's item slots. Vespoid HR body carve `[40,20,15,15,10]`
confirmed at record **+68**.

**Verification result (corrected):** the app's carve data broadly does NOT match f71 as plain
bytes. Order-independent (multiset) match **by rank** (len≥3 carve sets): LR 46% (mostly the
short 3-value sets matching by chance), Elder 6%, HR 6%, G-rank 13%. So Vespoid's HR
`[40,20,15,15,10]` match was an exception, not the rule — the bulk of the app's carve %s appear
nowhere in f71 even ignoring order. Two possibilities, and prior RE points to the second:
(1) the app's wiki-sourced carve values are largely wrong; (2) **f71 does not store carve as plain
display %s** — they're encoded weights and/or the full carve data is runtime-loaded per-quest
(the rank-reward pointers go OUTSIDE the overlay to `0x09d2xxxx`). The `0x1d0` per-monster struct
is **AI/spawn data** (floats=1.0, spawn coords), NOT carve — its pointer fields go to spawn/runtime,
not the carve records. **So carve-rate extraction is the project's genuine hard wall**: it needs the
roller code (record layout + weight→% formula + item local-index resolution), and the roller is
reached via runtime object pointers, defeating static xref (the same wall as the loot/reward trace).
The solid, bankable finding: **the app's carve rates are ROM-unverified and largely divergent.**

**Remaining carve task (the original goal):** decode the per-monster record structure (the %-table
layout: which row = which rank/carve-type, the column/item ordering, set delimiters) to extract the
ROM's true carve %s, then resolve the item local-index linkage ([[databin-cipher]] Phase 2). The data
is present and plain-byte where the structure is known (HR row) — this is now a structured-RE problem
on a located table, not a blind search.

### Net state of the rate problem

Item metadata is solved. The carve/gathering **rate→item linkage** stays open: rates are
short bytes (can't anchor blind), items are local-index-indirected, and the roller reads
via runtime object pointers (both data-adjacency and live-breakpoint routes exhausted).
Remaining path = decompile the in-overlay carve-record parser + the per-monster sub-list
resolution (the `0x09bb89bc`-array → in-overlay record chain), or use the same
user-confirmed-anchor search method if a run of true rates can be obtained.

**Key references**
- Plan: `C:\Users\humph\.claude\plans\dynamic-toasting-sifakis.md`
- Cipher details (memory): `…\memory\databin-cipher.md`
- Item-master details (memory): `…\memory\item-master-table.md`
- Decompiled codec: `ISO FILE\ghidra_codec.c`; carve readers: `ISO FILE\ghidra_carve.c`
- ROM item ground truth: `docs/rom_item_master.json`, `docs/app_to_rom_map.json`

## 12. CARVE / REWARD TABLES — SOLVED, f0076.bin (2026-06-21)

**Supersedes §10's "f71 = carve table" and the "genuine hard wall / app rates largely divergent"
conclusions.** The carve rates were neither in f71 nor divergent — they sit in a *data* file with
items stored as **global IDs**, and the app's existing values were mostly correct. Found by
abandoning the RAM/overlay route entirely and reading the decrypted master files.

### Where & format
- **`DATA_extracted/f0076.bin` = the monster reward data** — body/tail carve, capture, quest
  reward A/B, per monster × rank. **~940 reward groups.**
- Record = **`(pct u16, id u16)`** little-endian. Group terminated by a **`0xFFFF`** halfword.
  Each group's percentages **sum to exactly 100**.
- **Item = `rom_master[id − 1]`** — the IDs are off-by-one (slot 0 reserved = "empty"). The −1 is
  mandatory; without it everything looks like the wrong item.
- **No local-index indirection** — items are global IDs. The Phase-2 "indirection wall" does NOT
  apply to rewards (may still apply to weapon recipes).
- **Sibling format, same file (~offset 755k): `(id u16, qty u8, pct u8)`, null-padded, sum-100** =
  gather / supply / Reward-B tables (heterogeneous item mixes).
- Layout: monster-ordered blocks, one block per (rank × reward-type); the same monster sequence
  repeats across blocks → the app's rank keys (`guild_low_12 / elder_guild_low / nekoht_guild_high
  / g_rank / treasure_hunt`) map straight onto blocks.

### Why the earlier f71 route failed (so it isn't retried)
- f71 is the **code overlay that reads** carve data at runtime, not the table. The
  `[40,20,15,15,10]` hit there was a coincidental 5-byte run in 1.78 MB.
- Carve pcts are **u16 interleaved with IDs**, so plain-byte / multiset anchoring in f71 could
  never match.
- The PPSSPP RAM / save-state route only ever exposed **runtime display state** — the carve
  "roller" `_DAT_09a4f1a0`, the result queue `_DAT_08a62eb0`, and the carve object `0x08b0c900`
  (the on-screen "+item obtained" effect, with a vtable + screen-position floats). None hold the
  static table. The `0x09ce…` RAM tables are **sound/effect** data (item→obtain SFX), not loot.
  **Static loot lives in the decrypted files, never in RAM.** Full dead end — do not revisit.

### Method (reusable playbook — see also [[rom-extraction-playbook]])
1. Decrypt → `DATA_extracted` (`databin_unpack.py`).
2. Scan all files (skip >~6–20 MB = textures/audio/models) for **clusters of known item IDs**
   (`rom_master`) belonging to the target entity (a monster's parts).
3. **Decode the record format from RAW HEX by hand** on one known group — never guess field
   widths/order. (Here: pct-FIRST, u16/u16, `0xFFFF` delimiter.)
4. **Calibrate IDs** against a known-good reference (the app's own data, or a user/wiki example) —
   that's how the −1 surfaced.
5. Cross-validate at scale: match every ROM group to app data by item-set; exact % agreement =
   confirmation. Beware pitfalls: clustering filters (monster-parts-only) reject carves that
   include bones/commons; positional matching breaks on order diffs (use set-based); ROM names are
   abbreviated (`Plt+` vs `Pelt+` → consonant-skeleton match); keep `+` exact (Scale ≠ Scale+).
6. Apply to DB with `.bak` backup + re-verify against ROM.

### Cross-validation result (carve + capture)
Tool: `ISO FILE\rom_rewards.py` (parse + match + apply; modes summary/fill/disc/apply).
- **359 slots verified** — app already matched ROM (so the 2026-06-20 "largely divergent" note was
  an artifact of looking in f71 with the wrong format).
- **50 null-% gaps filled** across 21 small monsters (Bullfango, Conga, Velociprey, Genprey,
  Ioprey, Blango, Popo, Apceros, Aptonoth, Anteka, Mosswine, Remobra, Giaprey, Cephalos, Kelbi,
  Hermitaur, Ceanataur, Hornetaur, Shakalaka, …).
- **10 real discrepancies (app wrong, ROM authoritative)** — mostly item↔% transpositions in the
  wiki source: Diablos LR carve Shell/Tail 40/60→60/40; Rathian treasure Chops/Jewel 15/85→85/15;
  Congalala treasure Stomach/Innards swap; Yian & Blue Kut-Ku Scale/Shell swaps; Iodrome & Melynx
  swaps; Green Plesioth HR 18/64→22/60; Rathalos G Wyvern Tears 25→24.
- **Applied** to `data/mhfu.db` (28 monsters; `.bak-<ts>`); re-verify = 417 match ROM, 0 pending.

### Still open
- **Break / wound-part tables** (262 app slots, ALL already have %): NOT in f0076's reward groups →
  separate structure to locate. Self-anchored by the app's break items+% (it's a verify, not a fill).
- **Gathering %** (20 areas; app has node item lists but ZERO %): pure fill from the f0076
  `(id,qty,pct)` gather format and/or the earlier f81/f5401/f3407 candidates. Only pure-fill with no
  app % to self-check → an independent reference for 1–2 areas is the best validator.
- **Weapon Motion Values** (future, post-gathering) → new "Weapon MVs" app tab ([[weapon-motion-values]]).
