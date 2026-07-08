# MHFU LookUp — Documentation

Reference docs for the Monster Hunter Freedom Unite lookup tool, which ships as two front ends
sharing one data pipeline: a **React/Vite web app** (the primary target — the intended audience wants
a browser link, not a Windows install) and a **C# / WinUI 3** desktop app (kept in sync where
practical, no longer the focus of active development). The top-level [`../README.md`](../README.md)
is the quick overview (build & run); the guides below go deeper.

## Web app

| Doc | What it covers |
|---|---|
| [web-app.md](web-app.md) | Tech stack, the `mhfu.db` → JSON export pipeline, directory structure, feature highlights (Notes export/import, Bookmarks, personalization), build/run, and the GitHub Pages deploy. |

## Desktop app (C# / WinUI 3)

| Doc | What it covers |
|---|---|
| [architecture.md](architecture.md) | The four projects, the data pipeline (wikis → scripts → JSON → SQLite → app), build/run, and why the schema is hybrid. |
| [database-schema.md](database-schema.md) | Every table in `mhfu.db`, its columns, and the normalized-vs-JSON-document design. |
| [core-domain.md](core-domain.md) | The ported game logic in `MhfuLookup.Core` — skills, the Torso-Up trap, armor flattening, material availability — with a C# ↔ Python map. |
| [app-structure.md](app-structure.md) | The WinUI app's MVVM layout, services, shared helpers, and a step-by-step **"add a new tab"** guide. |
| [deploying.md](deploying.md) | Publishing a portable (self-contained) build, target requirements, and gotchas. |

## ROM data extraction (how the ground-truth data was sourced)

| Doc | What it covers |
|---|---|
| [rom-data-extraction.md](rom-data-extraction.md) | Decrypting the `DATA.BIN` master archive; item/armor/reward tables; the Ghidra + PPSSPP toolchain. |
| [rom-map.md](rom-map.md) | Structural map of the ROM: containers → file indices → record field-maps → RAM calibration. |
| [gather-extraction.md](gather-extraction.md) | Per-node gather rate tables: format, the live PPSSPP method, and the **offline decryption** (round-robin Lehmer-LCG keystream) that yields every map/rank from disk. |
| [rom-armor-stats-re.md](rom-armor-stats-re.md) | Walkthrough of decoding the armor stat tables from `BOOT.BIN` (5,067 corrections across all 5 slots) — written for RE beginners. |
| [rom-armor-recipes.md](rom-armor-recipes.md) | Forge recipes for all 5 armor slots, extracted from `BOOT.BIN`'s static table. |
| [rom-farm.md](rom-farm.md) | Pokke Farm gather-rate tables, found as a plaintext config block in `BOOT.BIN`. |
| [rom-fishing.md](rom-fishing.md) | Fishing spawn mechanism and per-spot weights, decoded from the ROM. |
| [rom-damage.md](rom-damage.md) | Damage formula constants (sharpness/element/crit) extracted from the ROM. |

## For users

| Doc | What it covers |
|---|---|
| [user-guide.md](user-guide.md) | What each of the app's tabs does, plus usage tips. (The app also has in-app **Help** and **About** tabs.) |

## Start here

- **New to the codebase?** Read [web-app.md](web-app.md) — that's where active work happens. For the
  desktop side, read [architecture.md](architecture.md), then skim
  [database-schema.md](database-schema.md).
- **Changing game logic?** Read [core-domain.md](core-domain.md) first — especially the Torso-Up
  section (desktop `MhfuLookup.Core`; the web app re-derives the same logic in TypeScript per-page).
- **Adding a feature/tab to the web app?** See the directory structure and per-page conventions in
  [web-app.md](web-app.md).
- **Adding a feature/tab to the desktop app?** Jump to *"Add a new tab"* in
  [app-structure.md](app-structure.md).
- **Just using the app?** See [user-guide.md](user-guide.md).

## License

Dual-licensed: source code under the [MIT License](../LICENSE) (© 2026 Armored_Raven), game reference
data under [CC BY-SA 4.0](../LICENSE-DATA.md). Monster Hunter names/assets are © Capcom (fan content);
bundled third-party code/assets are in [THIRD-PARTY-NOTICES.md](../THIRD-PARTY-NOTICES.md).
