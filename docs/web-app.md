# Web App

A static, client-side **React 19 + TypeScript + Vite** port of the desktop reference tool, at
[`web/`](../web). This is now the **primary target** for the project — the intended audience wants
a link they can open in a browser, not a Windows install — so new feature work generally lands here
first. The WinUI desktop app (`src/MhfuLookup.App`) still exists and is kept in sync where practical,
but it is no longer the focus of active development.

Live deploys are published automatically to **GitHub Pages** on every push to `master` (see
[Deployment](#deployment) below).

## Tech stack

| Layer | Choice |
|---|---|
| UI | React 19 (function components + hooks, no class components) |
| Language | TypeScript, strict mode |
| Build tool | Vite 8 |
| Routing | `react-router-dom` v7 (client-side, one route per tab/entity) |
| Styling | Inline `style={{ ... }}` objects using CSS custom properties (`var(--text)`, `var(--surface)`, …) for theming, plus Tailwind v4 for a handful of utility cases |
| Persistence | Browser `localStorage` only — **no backend, no server, no accounts** |
| Data | Static JSON files under `web/public/data/`, fetched once and cached in memory |

There is no API server anywhere in this app. Every "write" (a note, a bookmark, a theme choice) is a
`localStorage` write on the visitor's own device; nothing is sent anywhere.

## Data pipeline

The web app does **not** read `mhfu.db` directly (SQLite has no place in a static site). Instead:

```
data/mhfu.db  →  export_to_json.py  →  web/public/data/*.json  →  web/src/data/loaders.ts
```

- [`export_to_json.py`](../export_to_json.py) (repo root) reads the same `mhfu.db` the desktop app
  builds from `MhfuLookup.DataMigration`, and dumps each table/JSON-document column to a flat file in
  `web/public/data/` (`monsters.json`, `weapons.json`, `armor_sets.json`, `quests.json`,
  `gathering.json`, etc.). Re-run it after regenerating `mhfu.db` from updated source data.
- [`web/src/data/loaders.ts`](../web/src/data/loaders.ts) exposes one `load*()` function per file
  (`loadMonsters`, `loadWeapons`, `loadArmorSets`, `loadQuests`, `loadGathering`, …), each backed by a
  module-level `Map` cache keyed by filename — the first call fetches, every subsequent call
  (including from a different hook/page) resolves instantly from cache.
- Game icons/textures live in `web/public/assets/`, mirrored from the desktop app's
  `src/MhfuLookup.App/Assets/` folders. If you add/change an icon on the desktop side, copy it into
  the web `public/assets/` tree too — there's no build step that syncs these automatically.

## Directory structure

```
web/src/
├─ pages/        one file per tab (MonstersPage.tsx, WeaponsPage.tsx, GatheringPage.tsx, …)
├─ components/   shared UI: Layout (nav shell), Dropdown, BookmarkButton, NotesBox, MaterialList, …
├─ hooks/        useBookmarks, useNotes, useMaterials, useItemSources — all localStorage-backed
├─ theme/        appearance.ts (surface/accent colour + app icon), tabIcons.ts (per-tab icon overrides)
├─ utils/        assets.ts (BASE path helper), location.ts (area icon/colour lookup), weaponFilter.ts,
│                noteOrder.ts / noteExport.ts (Notes tab sort order + export/import)
├─ data/         loaders.ts (the fetch+cache layer described above)
└─ types/        shared TS interfaces mirroring the JSON shapes
```

Routing (`react-router-dom`) gives every tab and every entity its own URL — e.g. `/monsters/tigrex`,
`/weapons/<id>`, `/gathering/old_volcano`, `/quests/<slug>::<name>` — so links are shareable and
back/forward navigation works as expected.

## Feature highlights

- **Full tab parity with desktop**: Monsters, Weapons, Armor Sets, Armor Skills, Decorations, Quests,
  Training School, Gathering, Items, Combo List, Treasures, Kitchen, Trenya, Pokke Farm, Peddling
  Granny, Veggie Elder, Felyne Comrades, Awards. Governed by a standing rule to match the desktop
  WPF/WinUI app's *content and behavior* exactly and remove any web-only additions that weren't
  explicitly requested — the web app follows the same section-by-section port, not a redesign.
- **Bookmarks** (`useBookmarks.ts`) — star any entity from its detail page; stored as
  `{ type, id, name, path, icon }` under the `mhfu-bookmarks` localStorage key.
- **Notes** (`useNotes.ts`, `NotesPage.tsx`) — a free-text note per entity (monster/weapon/armor
  set/quest), sorted to match each entity's own in-app ordering (`utils/noteOrder.ts` builds a
  per-type sort index from the same order sources the list pages use — monster_order.json, weapon
  type+sort_order, armor set array order, combined quest category order).
  - **Export** (`utils/noteExport.ts`) offers three detail levels **per note**: *Detailed* (full
    entity info — hitzones/rewards for a monster, stats/materials for a weapon, etc.), *Simple* (a
    reduced field set), or *Just the Notes* (only the user's own text). The file is plain, readable
    text: `## <Section>` headers, `### <Name> (<Category>)` per entry, then a `Notes: <text>` line.
  - **Import** re-parses that same structure — it reconstructs each note's entity id/route by
    reverse-looking-up the `### Name (Category)` line against the current data (scoped by the
    section header's type), so no hidden metadata or IDs need to round-trip in the file. This lets a
    user back up their notes by exporting and restore them later (or on another device) by
    importing; import **merges** (overwrites matching entities, leaves everything else untouched).
- **Personalization** (`theme/appearance.ts`, `theme/tabIcons.ts`, `SettingsPage.tsx`) — surface/accent
  colour presets and a per-tab monster icon override (including the browser tab favicon), all
  persisted to localStorage and applied via CSS custom properties.
- **Weapon Filter** (`WeaponFilterModal.tsx`, `utils/weaponFilter.ts`) — multi-criteria weapon search
  (element, slots, affinity, etc.) layered on top of the upgrade-tree browser.

## Build & run

```bash
cd web
npm install
npm run dev       # Vite dev server with HMR, http://localhost:5173
npm run build     # tsc -b && vite build → web/dist/
npm run preview   # serve the production build locally
npm run lint      # oxlint
```

The data files under `web/public/data/` are committed to the repo (they're small, static JSON), so a
fresh checkout builds and runs immediately without needing to touch `mhfu.db` or run
`export_to_json.py` — that script only needs to be re-run when the underlying game data changes.

## Deployment

[`.github/workflows/deploy-web.yml`](../.github/workflows/deploy-web.yml) builds and publishes the
app to **GitHub Pages** automatically on every push to `master` (or via manual `workflow_dispatch`):

1. `npm ci` in `web/`.
2. `npm run build`, with `VITE_BASE=/<repo-name>/` so asset URLs resolve correctly when the site is
   served from a GitHub Pages *project* page (`https://<user>.github.io/<repo>/`) rather than the
   domain root.
3. Copies `dist/index.html` → `dist/404.html`. GitHub Pages has no server-side rewrite rules, so a
   direct hit on a client-side route (e.g. `/monsters`, after a refresh or a shared link) would 404
   before React Router ever runs; serving the app shell as the 404 page lets the router read the real
   URL and render the right page instead.
4. Uploads and deploys the `dist/` folder via `actions/deploy-pages`.

No server, database, or environment secrets are involved — the entire deploy is "build static files,
host them."

## What's different from the desktop app

- No "UI scale" setting (the browser's own zoom covers this).
- Notes and Bookmarks are web-only tabs — the desktop app doesn't have an equivalent (per-weapon
  notes exist in the desktop DB schema but aren't wired to a UI yet).
- All persistence is per-browser `localStorage`; there's no cross-device sync (Notes export/import is
  the way to move data between devices/browsers).
