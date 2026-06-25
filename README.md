# MHFU Lookup (C# / WinUI 3)

An offline reference app for **Monster Hunter Freedom Unite (MHP2G)**, built in C# with WinUI 3.
Look up weapons, armor, monsters, quests, items, gathering data, and more — no internet connection
required.

Data is sourced from community wikis and, where possible, pulled directly from the game ROM:
stats, icons, item palettes, weapon sprites, and award art are all ROM-extracted rather than
scraped from third-party sites. The gathering drop rates in particular are believed to be the
**first publicly available per-node percentages for any PSP-era Monster Hunter title** — later
entries in the series had community tools that exposed this data, but the PSP games did not.
Cracking the encrypted gather tables in MHFU's ROM was only possible with the help of AI-assisted
reverse engineering.

Created by **Armored_Raven**.

## AI Assistance Disclosure

This project was built with substantial assistance from **Anthropic's Claude** (Claude Code /
Claude Sonnet / Claude Opus). AI was used throughout development to write code, parse and
organize data, cross-check sources, and generate documentation. All data was validated against
the primary sources listed in the Credits section below, but errors may remain — verify any
critical values against the originals before relying on them.

## Documentation

Full guides live in [`docs/`](docs/README.md):

- [Architecture & data flow](docs/architecture.md) — projects, pipeline, build/run.
- [Database schema](docs/database-schema.md) — every table in `mhfu.db`.
- [Core domain logic](docs/core-domain.md) — the ported game logic (incl. the Torso-Up trap).
- [App structure & "add a tab"](docs/app-structure.md) — MVVM layout + extension guide.
- [Deploying](docs/deploying.md) — publishing a portable build.
- [User guide](docs/user-guide.md) — what each tab does.

## Solution layout

| Project | Type | Purpose |
|---|---|---|
| `src/MhfuLookup.Core` | classlib (net8.0) | Domain models, ported game logic, SQLite schema + repository facade |
| `src/MhfuLookup.DataMigration` | console (net8.0) | One-time JSON → SQLite builder (`mhfu.db`) |
| `src/MhfuLookup.App` | WinUI 3 (net8.0-windows) | The desktop UI (17 tabs, MVVM) |
| `tests/MhfuLookup.Core.Tests` | xUnit (net8.0) | Ports the original pytest suite + DB end-to-end tests |

### Core domain logic (faithful ports of the Python `src/`)

- `SkillRegistry` — skill name → canonical id resolution, activation thresholds.
- `DecorationCatalog` — decoration catalog + efficiency indices.
- `ArmorLoader` — flattens the v2 armor schema into pieces (with class-split material fallback).
- `MaterialIndex` — quest/monster/gathering → material availability graph.
- `ProgressChecks` — material/piece availability gating.

These are covered by tests that validate parity against the original JSON data
(1900 armor pieces, 168 decorations, etc.).

## Prerequisites

- **.NET 8 SDK** (also builds with the .NET 10 SDK).
- **Visual Studio 2022** with the **".NET Desktop Development"** workload and the
  **Windows App SDK / WinUI** component — needed for the WinUI 3 designer/tooling.
  (The solution also builds from the `dotnet` CLI.)

## Build & run

```powershell
# 1. Generate the database from the data/ tree (run once, or after data changes).
dotnet run --project src/MhfuLookup.DataMigration
#    -> writes data/mhfu.db and prints validated row counts.

# 2. Run the tests.
dotnet test

# 3. Build / run the app.
#    In Visual Studio: open MhfuLookup.slnx, set MhfuLookup.App as startup, F5.
#    From the CLI:
dotnet build src/MhfuLookup.App -r win-x64
```

`mhfu.db` is copied next to the app on build; at runtime the app loads it from its own
folder (falling back to `data/mhfu.db` during development).

## Database

A **hybrid SQLite schema** (see `src/MhfuLookup.Core/Data/Schema.cs`):

- **Normalized tables** for queryable entities (skills, skill levels, decorations + effects +
  recipes, armor sets/variants/pieces/skill-points/materials, weapons).
- **JSON-document columns** for deeply-nested irregular data (monsters, quest categories,
  gathering areas, hunting-horn songs, monster order).
- **Writable tables** for user data: `weapon_notes`, `settings`.

To regenerate the database after editing source JSON or running a data-build script,
re-run `MhfuLookup.DataMigration`.

## Tabs

Monsters · Weapons · Armor Sets · Armor Skills · Decorations · Quests · Gathering · Items ·
Combo List · Treasures · Kitchen · Trenya · Pokke Farm · Peddling Granny · Veggie Elder · Felyne Comrades · Awards · Settings · Help · About.

See the [user guide](docs/user-guide.md) for what each tab does.

## Credits / data sources

- Game data (monsters, weapons, armor, skills, decorations, quests, gathering, Felyne
  Kitchen, Trenya, Pokke Farm) is sourced from the Monster Hunter community wikis (MHP2G @wiki
  and the Monster Hunter Fandom wiki, CC-BY-SA), via the Python project's `data/` tree. The
  Trenya, Pokke Farm and Account-Item values come from the corresponding Fandom wiki pages
  (parsed by `mhfu-lookup/scripts/parse_trenya.py` / `parse_pokke.py`).
- **Veggie Elder trades** come from the MHP2G @wiki (<https://w.atwiki.jp/mhp2g/>, page 61),
  imported by `build_veggie_elder.py`. ROM verification is in progress.
- **Felyne Comrades** (article sections, recommended weapons, trainable skills, temperaments) come
  from the Monster Hunter Wiki (Fandom) *MHFU: Felyne Comrade* page, imported by
  `build_felyne_comrades.py`. ROM verification is in progress.
- **Guild Card award data** (names, descriptions, conditions) comes from the Monster Hunter Wiki
  (monsterhunterwiki.org), used under **CC BY-SA 4.0**, parsed by
  `mhfu-lookup/scripts/parse_awards.py`. The **award icons** are extracted from the game ROM
  (the in-game Guild Card award screen); artwork is © Capcom.
- **Weapon-type icons** (`Assets/WeaponTypes/`, the rarity-coloured type icons shown on weapon
  bookmarks, plus the white base silhouettes) are extracted from the game ROM (the in-game
  weapon sprites, tinted per rarity); artwork is © Capcom.
- **Element/status value icons** (`Assets/Elements/`) come from the Monster Hunter Wiki
  (Fandom); the underlying artwork is © Capcom.
- **Gathering area structure**: the per-node gather drop rates are extracted from the ROM, but the
  gathering-map layout (which nodes belong to which area, and the Secret Area) was structured with the
  help of the MHFU *Guide and Walkthrough (PSP)* by **ryin77**, published on GameFAQs.
- **Armor-skill category groupings**: the skills and their data are the app's own (ROM-derived);
  only the way they're sorted into the Armor Skills tab's categories (Offense / Defense /
  Resistance / Blademaster / Bowgun / Bow / Treasure Hunting / Farming) follows **Athena's Armor
  Set Search** for MHFU — purely so users of both tools see familiar groupings.
- **Decoration/jewel and crafting-material icons**, and **weapon-data cross-referencing**, use
  [vallode/mhfu-blacksmith](https://github.com/vallode/mhfu-blacksmith) (MIT License,
  Copyright © 2022 vallode): its per-item palette colour + grayscale type sprites are used to
  bake the tinted icons under `Assets/Decorations/` (jewels) and `Assets/Materials/`
  (recipe ingredients), and its weapon data was used to cross-check upgrade trees, rarity,
  materials, and the MHP2G-exclusive "dummy" weapons. See `THIRD-PARTY-NOTICES.md`.

## License

This project is dual-licensed because it mixes original code with wiki-sourced data:

- **Source code** (the C# app + the data-build scripts) — **MIT License**, © 2026 Armored_Raven.
  See [`LICENSE`](LICENSE).
- **Game reference data** (`data/mhfu.db` and the JSON it's built from) — **CC BY-SA 4.0**, because it
  derives from CC BY-SA community wikis (share-alike). See [`LICENSE-DATA.md`](LICENSE-DATA.md).
- **Monster Hunter** names, icons, and other game assets are **© CAPCOM**, used as non-commercial fan
  content — not covered by either license above.
- Bundled third-party code/assets: [`THIRD-PARTY-NOTICES.md`](THIRD-PARTY-NOTICES.md).

*Not legal advice — this is the conventional setup for a fan project combining original code with
CC BY-SA wiki data.*
