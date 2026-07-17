# MHFU Quest Reward Tables — ROM extraction (2026-07-13)

Quest-completion reward tables live in **`DATA_extracted/f0076.bin`** (the same `game_sub` reward file as carve/capture/break — see `docs/rom-data-extraction.md`).

## Format
Same as the carve tables: records `(pct u16, id u16)`, a group sums to ~100 and is terminated by `0xFFFF`. **Item = `rom_master[id − 1]`** (id is +1). 942 groups span file `0xBAD70`–`0xCC2BC`.

Parser output: `_reward_groups.json` (all groups), `_group_dom.json` (dominant monster per group, derived from app-loot item membership), `_quest_reward_ab.json` (per-quest A/B tables).

## Group inventory (every f0076 group labeled)
Labeled by exact `(item,pct)`-set match to the app's carve/capture/break, plus content signatures:

| label | count | meaning |
|---|---|---|
| carve | 442 | body/tail carve (already on Monster tab) |
| guaranteed-100 | 375 | single-item 100% slots (fixed rewards) |
| UNLABELED-partgroup | 86 | **the distinct Reward-A tables** (+ carve the app lacks) |
| BONUS | 20 | **Reward-B** bonus tables |
| bbq | 15 | cooking/Chops rewards |
| shiny | 4 | shiny drops the app lacks |

## Reward-A (basic reward, parts) — DISTINCT from carve (proven)
Signature: **monster parts + a Monster-Bone / Eldr-Dragon-Bone filler slot**, `(pct,id)` weighted, and the set does **not** equal the monster's carve table. Verified distinct:

| Monster | app LR carve | f0076 Reward-A |
|---|---|---|
| Diablos | Blos Fang 30 · Shell **63** · Spine 7 | Blos Fang 30 · Shell **50** · **Lg Monster Bone 20** |
| Yian Garuga | Scale 64 · Shell 28 · Mane 7 · Wing 1 | Scale 60 · Shell 25 · **Med Monster Bone 15** |
| Blue Kut-Ku | Webbing 15 · Shl 35 · Scl 45 · Beak 5 | Shl 55 · Scl 35 · **Med Monster Bone 10** |

**Every hunted monster has a Reward-A.** For a few (Rathian, Rathalos, Yian Kut-Ku, Tigrex) the reward-A *equals* their carve table, so it's indistinguishable from carve by content — but it exists. (An earlier draft wrongly called these "carve-mirror / no reward-A".)

## Reward-B (bonus reward)
Weighted **bonus** tables — group is ≥50% bonus staples: jewels, armor spheres, treasure (ShakalakaTreasre/Inheritance), seeds, eggs, coins, honey. Clean and unambiguous. e.g. `Honey 80 · Armor Sphere 10 · Suiko Jewel 10`.

## What has NO percentage
The common filler items — **Wyvern Claw/Fang, Sm/Lg Bone Husk, Cricket, Screamer, Arrowana, Seeds** — are **not** in any weighted reward group. They appear only in **static id lists** (e.g. run `294..300` = wyvern-material ids + `0xFFFF` padding) and **guaranteed 100% single-item slots**. So they are fixed/guaranteed rewards with no roll rate.

## Not quest rewards
`f61xx` files (f6112…f6189) are **supply-box / combining / ammo** tables (BBQ Spit, Book of Combos, coatings, bombs, Net, potions), not reward boxes. Heuristic (user): supply box = Map / First-aid Meds / Rations.

## Coverage & limits
- **Reward-B: ~350 quests** — reliable.
- **Reward-A: ~190–226 quests** — coverage-based (match by target monster + item overlap). **Not fully deterministic**: reward-A groups are *interleaved with carve*, not in clean per-rank blocks (Diablos has 1 reward-A group, others several, no regular stride), so a strict monster×rank key can't be derived from position alone.
- Gotchas: item_table has trailing-space names (`'Wyvern Claw '` → `.strip()`); monster matching must separate subspecies (Conga ≠ Congalala ≠ E.Congalala).

## Status
Reward-B ready to surface (Quest/Treasures tabs). Reward-A is best-effort with source citation — show where confidently matched, omit otherwise.
