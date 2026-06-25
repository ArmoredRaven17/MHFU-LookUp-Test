# MHFU Gathering-Rate Extraction — Methods & Reference

How the per-node gather **drop-rate tables** (item + weighted %) were extracted from
Monster Hunter Freedom Unite — first live from RAM, then fully offline by decrypting
the ROM's encrypted gather files. This data did not exist in any community source;
it is now ROM-authoritative ground truth.

> **Status:** Live extraction proven across all maps/ranks. **Offline decryption
> solved** (2026-06-23) — every map, every rank, plus Treasure/Training quest tables,
> decryptable from disk with no emulator. Verified: `f5053` → LR Desert, 24/24 tables
> identical to the live dump.

> **Attribution:** the per-node drop *rates* are ROM-extracted, but the gathering-map **area/node
> layout** (which gather points belong to which area, and the Secret Area) was structured with the
> help of the MHFU *Guide and Walkthrough (PSP)* by **ryin77**, published on GameFAQs.

Working folder for all tools below: `C:\Users\humph\Downloads\MHFU Armors\ISO FILE\`.

---

## 1. The table format

A gather node's table is an array of `[weight u16, item_id u16]` pairs, terminated
by `0xFFFF`. **Weights are literal percentages and sum to 100.**

```
[62,163][33,168][5,93] 0xFFFF   =  Herb 62%, Sap Plant 33%, Huskberry 5%
```

**Off-by-one:** the table stores *runtime* item IDs = `ROM item id + 1`. To resolve a
name, subtract 1 and look it up in `item_table.txt`. (The pouch uses the same +1.)
This off-by-one, plus the ROM being saturated with small integers, is why years of
static searches failed — the data also turned out to be encrypted (see §4).

---

## 2. Live extraction (PPSSPP RAM)

The first working method. Used to crack the mechanism and to verify the offline route.

### Access path (runtime)
- Each **gather point** is a 24-byte record carrying a table index at `[point+0x10] & 0x7FFF`.
- `0x08869750(index)` resolves `table = *([*0x08A5C584] + [nodeset+0x50] + index*4)`.
- `0x0887265C(table, rank)` is the weighted roll: sum weights, `RNG(0x088900C4) % total`,
  walk to the landed item.
- Caller chain: gather button → state machine `0x09AAA820` → nearest-point-by-distance
  `0x09AAAB40` → `0x08870AC4` → the two functions above.

### Tooling
- **`ppsspp_dbg.py`** — Python client for PPSSPP's WebSocket debugger (read/write memory,
  registers, breakpoints, stepping). Enable *Settings → Tools → Developer tools → Allow
  remote debugger*. See `docs/rom-map.md` / memory for the protocol.
- **`dump_gather.py <map> <LR|HR|GR|auto> [day|night]`** — reads the decrypted table
  region from live RAM, parses tables, resolves names, writes `gather_dumps/<RANK>_<map>.txt`.
  Also validates the rank against the app's lists and auto-detects rank when `auto`.

### Three hazards the live method must handle
1. **The table region floats per stage.** It is *not* at a fixed address; it drifts
   (e.g. GR Swamp's spilled past an early narrow window, truncating ~4 tables). Use a
   **wide read window** `0x08A5C200 + 0x1400` and always sanity-check the table count
   against sibling ranks.
2. **Rank is map-dependent, not ore-tier-fixed.** Union Ore, Novacrystal, Rare Scarab,
   Ancient Stone, and even Dragonite all appear as rare High-Rank drops on harsh maps;
   only **Eltalite Ore / Purecrystal** are truly G-Rank-exclusive. Don't infer rank
   from ores — match the dump's item-set against the app's `low/high/g_rank` lists.
3. **Sparse / siege maps leave stale residue.** Maps with few or no field nodes (Town,
   Fortress, the arenas, Tower 3) don't fully overwrite the region, so a scan picks up
   the *previous* map's tables. Detect via the nodeset pointer `[0x08A5C584]` reading
   uninitialized **and** tables matching a prior dump. To get a clean read: at the quest
   **counter**, zero the region (`memory.write` base64 of `0x1400` zero bytes), then start
   the quest so only fresh tables load. For a single specific node, breakpoint the roll
   `0x0887265C` and gather — `a0` is the exact table the game used (immune to residue).

### Gather mechanisms found
- **Weighted field nodes** — the normal case; the bulk of the data.
- **Weighted Supply Points** — same format, supply-type items (siege maps).
- **Fixed-item spots** — a set item, no `%` (e.g. Ballista S; non-depleting).
- **Supply Box** — fixed base-camp loadout, no `%`.

Day vs Night: the ROM treats them as separate stages, but the **gather tables are
effectively identical** (verified Swamp LR: 16/17 tables byte-identical). No need to
dump both.

---

## 3. Why the data was encrypted (and unfindable statically)

Each stage's gather tables ship **XOR-encrypted** inside per-quest files in the
`DATA_extracted/f50xx` range (the `DATA.BIN` archive is decrypted first — see
`docs/rom-data-extraction.md` — then the gather tables inside are a *second*
encryption layer). So the tables exist nowhere as plaintext to be searched for.

The decryptor lives in `BOOT.BIN`:
- Decrypt function entry **`0x088C2CE0`**, inner loop **`0x088C2D1C`**.
- Keystream generator **`0x088C2B94`**.

---

## 4. Offline decryption (the keystream)

**The keystream is four independent Lehmer LCGs consumed round-robin.** Decompiling
the loop was the key:

```asm
088C2D1C  addu  v0, s4, s0      ; v0 = t0 + byte_counter
088C2D20  ext   a1, v0, 1, 2    ; stream = (v0 >> 1) & 3      <-- round-robin index
088C2D24  jal   0x088C2B94      ; keystream(state_base, stream)
...
088C2D38  xor   a0, a0, a1      ; plaintext = cipher XOR (key & 0xFFFF)
```

So for u16 index `n`: `stream = (t0 + 2n) >> 1 & 3`, cycling `0,1,2,3,0,1,2,3…`. Each
of the 4 streams keeps its **own running state**, advanced only when that stream is
used: `state = (state * mult[stream]) % mod[stream]`, key = the new state.

Constants (in `BOOT.BIN`):
- `mult` @ `0x089B5008` = `[0x1709, 0x3df3, 0x747b, 0xb381]`
- `mod`  @ `0x089B5018` = `[0xff9d, 0xffa9, 0xffc7, 0xfff1]` (primes near 2¹⁶)

This round-robin interleave is why a single-LCG decrypt produced garbage — and why the
first offline attempt failed before the loop was decompiled.

### Cracking the seeds (no emulator)
The plaintext is a strong oracle: decrypted u16s are item values (`< 1400`) or `0xFFFF`,
and a table's first u16 is a weight `1..100`. For a candidate region offset and phase:

1. The first u16 belongs to one stream and is a weight. Guess it (`1..100`), recover the
   key `k1 = cipher0 ^ weight`, and **derive that stream's seed** by modular inverse:
   `seed = (k1 · modinv(mult, mod)) % mod`.
2. Verify by rolling that stream forward over its other positions (every 4th u16) — they
   must all be valid item values. A wrong guess fails fast.
3. Repeat per stream. With all 4 seeds + phase, decrypt the whole region and confirm it
   parses into ≥4 sum-100 tables.

### Tooling
- **`offline_decrypt.py [file]`** — cracks one file: scans offsets, recovers the 4 seeds
  + phase, prints the decrypted tables. (`try_crack(data, off, rlen)` is the core.)
- **`batch_decrypt.py <lo> <hi>`** — cracks a range of `f####.bin`, **dedupes by table-set**
  (per-quest files heavily duplicate the same map+rank), and identifies each unique set by
  item-overlap with the app's gather data.

### What the files contain
- **One rank per file**, **one map per file**; *many* quest files duplicate the same
  (map, rank) — dedupe by content to get the unique set.
- The filename does **not** encode the stage — identify by decrypted **content**, not by
  number. (Old memory labels like "f5053 = Snowy" were wrong; f5053 is LR Desert.)
- Files with near-zero app-overlap but coherent items are **Treasure / Training quest**
  tables (Dragonrock, Wyvern Ore, Old Vase Bottom, Rathalos Fly, etc.) — a category the
  app never had. Keep them; classify by their distinctive items rather than discarding.

---

## 5. Verification & applying to the app

**Principle: the ROM is authoritative.** The app's gather data is community/wiki-sourced
and is the thing being *corrected* — never relabel a ROM read to match the app. The
app-overlap score is a sanity/identification signal only; a low score means a wiki gap
(or a non-normal quest type), not a bad dump.

- **`verify_gather.py [map]`** — cross-checks each dump against the app's `gathering_areas`:
  matches ROM tables to app nodes (app-node-centric, ROM tables reusable since app nodes
  share tables), and reports per node the items to **add** (ROM has, app lacks) / **remove**
  (app has, ROM lacks), the app nodes with no ROM backing (suspect/wiki errors), and the
  ROM tables missing from the app. Writes `verify_report.json` with the weighted tables
  staged for applying.
- **Normalize before diffing** to avoid false positives: strip app conventions like
  `Item(Transport)` egg suffixes and the `Nothing` placeholder, and reconcile name variants
  (`Sm Bone Husk` ↔ `Small Bone Husk`).
- **Applying** (Phase 4): replace the `~N%` placeholder produced by
  `GatheringViewModel.ParseDrops` with the real per-node weights, and apply the
  ROM-confirmed item corrections, into `data/mhfu.db` `gathering_areas`. Back up the DB
  (`.bak-<ts>`) and guard row counts per `docs/architecture.md`.

---

## 6. Tool & artifact inventory

| File (`ISO FILE/`) | Purpose |
|---|---|
| `ppsspp_dbg.py` | PPSSPP WebSocket debugger client (live RAM/regs/breakpoints). |
| `dump_gather.py` | Live per-stage table dump + rank validation. |
| `offline_decrypt.py` | Offline single-file gather decryptor (round-robin LCG crack). |
| `batch_decrypt.py` | Offline range decrypt + dedupe + map/rank identification. |
| `verify_gather.py` | Cross-check ROM dumps vs app `gathering_areas`; stage corrections. |
| `gather_dumps/*.txt` | Per map+rank extracted tables (human-readable). |
| `item_table.txt` | `id<TAB>name` Rosetta (runtime id = this id + 1). |

## 7. Key addresses (BOOT.BIN / RAM)

| Address | What |
|---|---|
| `0x08A5C200 + 0x1400` | Live decrypted table region (wide read window; floats per stage). |
| `0x08A5C584` | Nodeset base pointer (uninitialized ⇒ sparse/siege map). |
| `0x0887265C` | Weighted roll; breakpoint + gather ⇒ `a0` = exact table used. |
| `0x088900C4` | Gather RNG. |
| `0x088C2CE0` / `0x088C2D1C` | Offline decrypt function entry / inner loop. |
| `0x088C2B94` | Keystream generator (Lehmer LCG, per-stream state @ `base+0xAA0+stream*2`). |
| `0x089B5008` / `0x089B5018` | LCG `mult[4]` / `mod[4]` constants. |
