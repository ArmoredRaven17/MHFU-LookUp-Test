# MHFU Damage Formula — ROM-extracted constants

Constants and code locations for the MHFU (MHP2G) damage calculation, recovered by live
PPSSPP debugging + disassembly of the combat overlay. **These correct several values that
community guides get wrong for MHFU** (most cite later-gen numbers).

## Damage modifier block — `DATA_extracted/f0076.bin` @ `0xE0700–0xE0770`

The combat overlay `f0076` holds the damage-modifier tables (the *data*); the calc *code*
is in the same overlay (~file `0x2A7C0`, seen live at RAM `0x9C437C0` with `f0076` loaded at
base `0x9C19100`). It reaches the tables via `lui 0x9D0` + a *negative* `addiu` (e.g.
`0x09D00000 - 0x67AC = 0x09CF9854`), which is why an absolute-address grep for `0x9CF9…`
finds nothing.

| Table | f0076 offset | ROM values (Red→White) |
|---|---|---|
| **Raw sharpness mod** | `0xE0758` | `0.5, 0.75, 1.0, 1.0625, 1.125, 1.2` |
| **Element sharpness mod** | `0xE0754` | `0.25, 0.5, 0.75, 1.0, 1.0625, 1.125` |
| **Critical-hit mod** | `0xE0748` | `1.25` |
| 7-value table (purple-inclusive?) | `0xE0738` | `0.5, 0.75, 1.0, 1.125, 1.25, 1.3, 1.5` |
| 2-D per-class/sharp table | `0xE06B8` | rows of 4 floats, indexed `[a2][sharp]` |

> **The correction:** MHFU green/blue/white raw sharpness is **1.0625 / 1.125 / 1.2**, *not*
> the 1.05 / 1.2 / 1.32 most guides list (those are MH3U+). Element mods are the raw table
> shifted down one slot (red starts at 0.25). Crit is ×1.25.

**Resolved 7-colour tables (user-confirmed 2026-07-05, incl. Purple)** — used in the app's
Sharpness Modifiers modal (`SharpnessDialog.cs`):

| Sharpness | Red | Orange | Yellow | Green | Blue | White | Purple |
|---|---|---|---|---|---|---|---|
| **Raw** | 0.50 | 0.75 | 1.00 | 1.125 | 1.25 | 1.30 | 1.50 |
| **Element** | 0.25 | 0.50 | 0.75 | 1.00 | 1.0625 | 1.125 | **1.20** |

Raw is the 7-value table at `0xE0738` (the user confirmed it as the authoritative Red→Purple raw
table, overriding the 6-value `0xE0758`). Element Red→White is `0xE0754`; **Purple element = 1.20**
(user-supplied). **Status has no ROM-confirmed sharpness modifier** — intentionally not shown.

Formula shape (confirmed live): `damage = trueRaw × motionValue × sharpnessMod ×
hitzone/100 × crit`, where True Raw = displayed Attack ÷ class "bloat" multiplier (GS/LS 4.8,
SnS/DB 1.4, Hammer/HH 5.2, Lance/GL 2.3, bowguns/Bow 1.2 — a community abstraction; **no
4.8/5.2 float table exists in the ROM**, the game stores values differently).

## RNG / weighted-roll mechanism

- **RNG function:** `0x088900C4` (BOOT.BIN, symbol `z_un_088900c4`). *Every* weighted roll
  in the game calls it, then `div`s for the modulo. Event-driven — nearly silent at idle.
- **Gather roll:** `0x0887265C` (`a0` = `[weight u16, runtime-id u16]…0xFFFF` table). The
  known anchor that cracked gathering.
- **277 weighted-roll sites** total call the RNG (40 in BOOT.BIN, 79 in `f0071` field
  overlay, 158 in `f0076`).

## Motion values — status

The MV is **per-attack**, copied into the live attack-instance object at attack-start (the
field at `+0x18` is a constant, NOT the MV; the real MV is the changing FPU value `f17` at
the calc). Its source is computed in **VFPU instructions capstone can't decode**, so the
static MV table isn't yet located. Community MV tables exist for MHFU (patchier than later
gens) — revisit if gaps remain.

## Fishing — status (open)

Fishing is a **separate** mechanic from the gather roll (no fish in gather dumps; the gather
roll never fires while fishing). The spawn/catch pool uses **local-index indirection** (small
indices into a per-spot fish sub-list, not global fish IDs 228–242), so fish-ID searches and
occurrence-counts dissolve into value-frequency noise. The fishing pick is one of the 277
RNG-roll sites (likely in `f0071`, the field overlay). Live isolation is blocked by the
turn-based debug loop (can't real-time-skip the shared RNG's background rolls); **next step is
offline disasm of the `f0071` roll sites** to pin it, then one live freeze to confirm.
Fish IDs: 228–242 (Knife Mackerel→Ancient Fish); bait items 139 (Tuna) / 140 (Arrowana).
