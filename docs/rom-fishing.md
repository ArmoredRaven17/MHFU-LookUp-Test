# ROM Fishing System — Reverse-Engineering Notes

Status (2026-06-25): spawn mechanism fully decoded; per-spot **weights** decoded;
per-spot **species** extraction method known but the **architecture question is
still open** (global / per-area / per-spot type→species). See "Open question" below.

Fishing is a **spawned-entity** system: visible fish swim in the spot and you catch
specific ones. It is NOT the gather/mining "cast-and-receive" model. (The Pokke Farm
Pier uses this SAME system — see Farm section. An earlier guess that the Farm was
"gather-style" was wrong; it was inferred from documented percentages, but Gathering
itself had no community data either, so "documented" implies nothing about mechanism.)

## Status update (2026-06-26) — static verdict + Farm correction

**Ran the cheap static sweep we should have run first** (grep BOOT + all DATA_extracted for clustered fish
ids 228–244): **there is NO flat `[id,weight]` fishing-pool table in the ROM.** Every gapped cluster was a
red herring — f0076@0x4DC40 is a generic item-handler switch, f0076's farm region fish are *Trenya reward*
tables, f0081@0x93B84 is a per-entity definition table. So fishing is genuinely **procedural** — the only
farm activity not stored as a static table (bomb/bug/GSC/Trenya all were in f0076). Lesson logged: try the
cheap static method before multi-session live RE.

**Correction to the earlier "Farm = same f0071 system" claim:** f0071 is **NOT loaded at the Farm**
(signature absent across `0x09xxxxxx`). The Farm Pier runs its own fishing code in the **Farm overlay**
(~`0x09ABxxxx–0x09ADxxxx`), separate from the decoded location switch. Its `0x888553C` pick calls at
`a1<0x1e` are **scenery/animation placement** (positional `0x9ABE118` with float coords, degenerate
`a1==a3` picks), not species selection. The Farm's actual fish-species mechanism is **un-located**.

### What we know — three tiers

**Fishing in general (all of it):**
- Spawned-entity system: visible fish swim; you catch specific ones. No `[id,weight]` table — procedural.
- Weighted pick = BOOT fn `0x888553C`: `roll = RNG()&7`; `<thr1` → fishA (`thr1/8`); `<thr1+thr2` → fishB
  (`thr2/8`); else no-spawn. Each fish weighted out of 8.
- Species = `*(ctx+0x190) + type*0x250 + 0x14D`; entity species N ↔ item runtime-id N+1.
- Species are chosen at **area-load**, not on cast (you cast to *catch* an already-spawned fish).
- **Open (architecture):** is `type→species` global / per-area / per-spot? Evidence leans global; one
  global-template capture at a location spot would resolve it.

**Fishing in locations (f0071 — most decoded):**
- Pool logic = one `switch(spot_type @ctx+0x7A6)` in f0071, ~32 spots (`0x3E9`–`0x431`), **fully decoded
  offline** (`decode_fish_switch.py`): every spot's type-set + pick weights.
- f0071 **floats** per load — re-derive base via signature `f0071+0x84E60`; register fn (a0=spot ctx) fires
  only at a genuine area-load.
- Remaining: read one complete template (global test) → synthesize all 32 pools' species offline. 2 spots
  already confirmed (Old Desert Area 4 pool written to app).

**Fishing in the Farm (Pier — least cracked, separate system):**
- Separate code in the Farm overlay; f0071 not involved. No static table.
- Pick-fn calls reachable there are scenery/animation, not species. Species mechanism un-located (likely
  fixed placement at load).
- **Casting Machine (net) — CRACKED, and it's NOT fishing:** it's a bomb/bug-style **weighted reward table**.
  The net cast pops the reward screen (writes `0x0999A130`) and runs on the bomb engine (`RNG%100` walk of
  a `[id, weight%, qty]` table). The table is **static in f0076 @0xB82A8** (by the bomb tiers): 19 records,
  weights sum 100. **Net fullness sets the ROLL COUNT, not the pool:** `s0 = config[level] + (RNG&1)`, level
  from `lb a2,6(a0)` indexing config @`0x09CD3308` = `[8, 6, 4, 1]` (fullest→8 items, least→1; +0-1 random).
  Same 19-item table at every fullness. Full pool + rates + fullness counts written to the app's `Casting
  Machine` tab. So the Pier is procedural/un-cracked, but the Casting Machine was the easy static win all along.
- App currently has guide-sourced Pier %s (likely observed proportions, **unverified**); prior farm pool
  {228–235, 239, 243}.

## Mechanism (confirmed)

- Fishing spawn function: `f0071` file offset `0x84D00` (real entry ~`0x84CF8`).
  **Runs at AREA LOAD only** — not on cast / catch / reel / movement / re-entering an
  already-loaded area.
- It is a `switch(spot_entity_type)` on `ctx+0x7A6` (u16; `ctx+0x7A6 = ctx+0x790+0x16`).
  32 cases, spot-type IDs `0x3E9–0x3FF` and `0x424–0x431` (gap `0x400–0x423` is real).
- Each case = a fixed sequence of `pick` + `register` calls.
  - **pick** `0x888553C` (BOOT, fixed): `pick(a1=candA_type, a2=thr1, a3=candC, t0=thr2)`.
    Rolls RNG `0x088900C4`; `roll&7 < thr1` → return candA (prob `thr1/8`);
    `< thr1+t0` → candC (prob `t0/8`); else −1 (no spawn).
  - **register** `0x9ACB620`: `register(a0=ctx, a1=position int→float, a2=type_index, a3=section)`.
    Places an entity of `type_index` at the spot. `a3`/section seen = 0 in observed calls.
- All 32 cases decoded (type-index sets + weights) in `decode_fish_switch.py`.

## Species location (confirmed: disasm + a clean live read)

```
species = byte at  *(ctx+0x190) + type*0x250 + 0x14D
```
- getter `0x886421C` (BOOT): `entry = *(a0+0x110) + a1*0x250` (stride `0x250 = 37<<4`).
  Called via `0x8865F24` with `a0 = ctx+0x80`, `a1 = type` → template ptr at `ctx+0x190`.
- `0x8865F24` reads `entry+0x100/0x104/0x108` (position floats) → not the species reader.
- **Confirmed read**: Spot B (`ctx=0x090BD430`, fully loaded) template gave five clean,
  distinct species: `t3=Sleepy t4=Rumble t5=BurstArr t7=SmGold t8=Silver`. The model works
  when pointed at a real, fully-initialized spot object.
- The species byte is **not** written by a direct `sb …,0x14D` (0 hits in f0071/f6098);
  the template is populated by a **memcpy of master entity-templates** (species baked at
  `+0x14D`). The per-spot key = "which master indices get copied" — NOT yet located.

## Fixed anchors (BOOT — never float)

| Addr | Role |
|------|------|
| `0x888553C` | pick fn (weighted selector) |
| `0x088900C4` | RNG |
| `0x886421C` | template-entry getter (`*(a0+0x110)+type*0x250`) |
| `0x8865F24` | mid (reads position floats from entry) |
| `0x886025C` | entity-build (spatial/collision; not the species writer) |
| `0x888080C` | area→stage-variant lookup → cached at `ctx+0x40C` |
| `0x8865BAC` | area_id check (returns bool) |

`0x888080C` detail: `TABLE1 @0x089AA370` = one byte per `area_id` → index; `TABLE2 @0x089AA344`
= 4-byte records, a selector picks byte 1/2/3 (Day/Night/rank variant). Area→bounds float
table at `0x09CDF040` (32-byte records per area_id). Neither is the species source.

## Floating anchors (overlays RELOCATE on every area-load)

- `f0071` base observed at `0x09A5F300` and later `0x09AD6994`. **Re-derive each time** via
  signature `f0071+0x84E60` (the BEQL immediate chain testing `0x3E9…` — no jals, so the
  on-disk bytes match RAM). The `f0071+0x84D50` signature FAILS: it contains relocated jal
  targets that differ between file and RAM.
- setup fn = `f0071_base + 0x84D00` (`a0` = spot ctx).
- register fn = decode the jal at `f0071_base + 0x84EFC` (was `0x09ACB620` both sessions —
  f6098 may relocate less, but a raw read of `0x09ACB620` can show stale/leftover code;
  verify via the jal target).

## Methods: reliable vs dead

- **DEAD — heap-scanning for templates by fish bytes.** Species `228–243` = `0xE4–0xF3`,
  ordinary byte values. A full-heap lattice scan returns **36,000+ false "templates"**.
  Catch-fingerprint scans (even 4–5 species on the `0x250` lattice + pointer-reference check)
  are noise-dominated. **Do not pursue this family of approaches.**
- **RELIABLE — register-fn `a0` at area-load = a real spot ctx** (gave Spot B noise-free).
  Capture ALL register calls during a load, **group by `a0`**, filter `a0` to "template has
  fish at `+0x14D`". Do NOT filter by `spot_type` — at register-time `spot_type@0x7A6 = 0`
  (set only after registration completes). `a2` may be a non-fish type (saw 14, 30) because
  the spot also registers non-fish entities; the `a0` grouping + fish-template filter is what
  identifies the spot.
- **Robustness:** the PPSSPP websocket JAMS on >16KB reads (256KB wedged the whole debugger;
  a leftover zombie process held the port). Rapid halt/resume during a load also chokes it →
  use a reconnect-on-failure wrapper. The register-on-load capture's only failure mode was a
  flaky `cpu.resume`; bulletproofing it (reconnect) is the fix.

## ID mapping

- **entity species N ↔ item runtime-id N+1** (entity KnifeMack `228` → item "Knife Mackerel"
  `229`). Item runtime-id = ROM id + 1.
- 228 KnifeMack · 229 Sushifish · 230 Sleepyfish · 231 Pin Tuna · 232 Rumblefish ·
  233 Scatterfish · 234 Burst Arowana · 235 Bomb Arowana · 236 Glutton Tuna ·
  237 Gastronome Tuna · 238 Speartuna · 239 Small Goldenfish · 240 Goldenfish ·
  241 Silverfish · 242 Ancient Fish · 243 Springnight Carp.

## Pokke Farm (Pier)

- Same spawned-entity fishing system as location maps (fish visible in the spot; user-confirmed).
- Community-guide "Pier" table — treat as **UNVERIFIED** (possibly hand-counted, not ROM-pulled;
  community had Farm rates but never any location-gathering rates, which signals the Farm was
  merely *easier to observe*, not a different/simpler engine):
  - Initial / +1 / +2 depletion columns, each ≈100%.
  - Pool = {KnifeMack, Sushi, Sleepy, PinTuna, Rumble, Scatter, BurstArr, BombArr, SmGold, Spring}
    = `{228–235, 239, 243}` (10 fish). Percentages are not multiples of 1/8.
- Farm spot data was not findable via idle heap scan (same byte-noise problem).

## Empirical ground truth (catches)

- **Spot A** (a location area): caught {KnifeMack, Sushi, Sleepy, Rumble, BurstArr} =
  `{228,229,230,232,234}`. Frequency: KnifeMack ≫ Rumble > Sushi > BurstArr, Sleepy (rare).
- **Spot B** (same area, `ctx=0x090BD430`, memory-read): `{230,232,234,239,241}`
  (Sleepy, Rumble, BurstArr, SmGold, Silver). Differs from Spot A ⇒ **≥2 fishing points per area.**

## OPEN QUESTION — decides whether we're done

Is `template[type] → species` **global**, **per-area**, or **per-spot**?
- **Global** → read ONE complete template + apply the decoded type-sets ⇒ all 32 pools, offline, no further in-game work.
- **Per-area** → one complete-template read per area.
- **Per-spot** → genuinely per spot (worst case).

Evidence currently **leans global**: two reads of the same object agreed on the fully-loaded
slots (`t4=Rumble, t5=BurstArr, t8=Silver`) and differed only on `t3, t7` — almost certainly
mid-load stale values, not a real per-area difference. Note a spot's template is filled only
for *that spot's* type-set (Spot B had only `t3,4,5,7,8`), so one spot won't reveal other
types directly; but if global, shared types are consistent and the union across spots builds
the full map.

**Test:** bulletproof register-on-load capture of COMPLETE templates (type slots 0–25) from
**two different areas**; compare whether the same type index yields the same species. Equal ⇒ global.

## Tooling (in `…/ISO FILE/`)

- `decode_fish_switch.py` — offline decode of all 32 cases (type-sets + weights). **DONE.**
- `_capture_regload.py` — register-on-load capture, group by `a0` (needs reconnect-hardening).
- `synthesize_fish.py` — merge live species + offline weights.
- `dump_fish_passive.py` — heap-scan reader. **DEPRECATED** (byte-noise; see Dead methods).
- `FISH_CAPTURE_GUIDE.txt`, `fish_dumps/_confirmed_catches.md` (empirical catches).

## Next step

Build the bulletproof (reconnect-on-failure) register-on-load capture; grab COMPLETE templates
from two areas; resolve the architecture question. If global, derive all 32 pools from the ROM
with no further in-game work.
