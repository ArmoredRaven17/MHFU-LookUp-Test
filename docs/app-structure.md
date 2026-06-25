# App Structure & Extending

The WinUI 3 app ([`MhfuLookup.App`](../src/MhfuLookup.App)) is MVVM with one page per tab. It reads only
`mhfu.db` (never JSON) through a single facade.

## Layout

```
src/MhfuLookup.App/
  MainWindow.xaml(.cs)   NavigationView shell; Tag → Page routing; per-tab icons; title bar/theme
  App.xaml(.cs)          App entry; merged resource dictionaries
  Views/                 one .xaml(.cs) per tab (MonsterPage, …, AwardsPage, Settings, Help, About)
  ViewModels/            one VM per page + shared bits (WeaponColors, WeaponFilter)
  Services/              AppDb, Appearance, AppScale, TabIcons
  Converters.cs          IValueConverter set (icons, visibility, brushes) registered in Themes/Theme.xaml
  ScrollForwarder.cs / HScrollSync.cs / ScrollBarFix.cs   scrollbar helpers
  Themes/                Theme.xaml (dark palette, brushes, converter + style registrations)
  Assets/                Monsters, Items, Locations, Decorations, Materials, Awards icons
```

**MVVM:** ViewModels use [CommunityToolkit.Mvvm](https://learn.microsoft.com/dotnet/communitytoolkit/mvvm/)
— `[ObservableProperty]` for bindable fields and `partial void On<Name>Changed` hooks to react to
selection/search changes. Pages are thin: a `ViewModel` property + `InitializeComponent()`, and a tiny
`TextChanged` handler that forwards search text.

## Services

- [`AppDb`](../src/MhfuLookup.App/Services/AppDb.cs) — `AppDb.Instance` is the singleton
  `MhfuDatabase`; it locates `mhfu.db` (output dir, then dev `data/`). All VMs read through it.
- [`TabIcons`](../src/MhfuLookup.App/Services/TabIcons.cs) — the `Tabs` array (tag + title, in nav order),
  default monster icon per tab, persisted overrides (settings key `tab_icons`), and `IconUri(tag)`. The
  nav and the Settings icon-picker are both driven by this.
- [`Appearance`](../src/MhfuLookup.App/Services/Appearance.cs) — theme color + window icon (persisted,
  with change events the window subscribes to).
- [`AppScale`](../src/MhfuLookup.App/Services/AppScale.cs) — UI zoom.

## Shared helpers worth reusing

- **Icon resolution:** items resolve to bundled icons via the `items ∪ treasures` name→icon map (exact,
  then normalized), with jewels falling back to the tinted decoration sprite. `TrenyaViewModel` /
  `PokkeViewModel` show the canonical implementation; the `ImageUri` converter turns a full
  `ms-appx:///…` string into a `BitmapImage`.
- **Scrollbars:** always-visible native bars via the AK.Toolkit `KeepVerticalExpanded` (implicit
  `ListView` style) and `ScrollBarFix.KeepVerticalExpandedOwn` for detail panes; `ScrollForwarder`
  (wheel = vertical only over inner horizontal tables) and `HScrollSync` (frozen-column sync in
  Gathering). Reuse these instead of hand-rolling.
- **Converters** (registered in `Themes/Theme.xaml`): `ItemIcon`, `ImageUri`, `LocationIcon`,
  `LocationBrush`, `BoolToVis`, `StringToVis`, `NullToVis`/`NullToVisible`, hitzone/sign brushes, etc.

---

## Data pipeline scripts

The Python scripts in [`mhfu-lookup/scripts`](../../mhfu-lookup/scripts) turn saved wiki HTML into the JSON
the migration consumes, and bake icon assets. Run by hand when a source changes.

| Script | Output |
|---|---|
| `parse_trenya.py` | `data/trenya.json` (Trenya sea-expedition items). |
| `parse_pokke.py` | `data/pokke_farm.json` + `data/account_items.json` (Pokke Farm + Account-Item values). |
| `parse_awards.py` | `data/awards.json` + converts award webp icons → `App/Assets/Awards/*.png`. |
| `gen_deco_icons.py` | Tinted jewel icons → `App/Assets/Decorations/*.png` + `data/decoration_colors.json`. |
| `gen_material_icons.py` | Tinted material icons → `App/Assets/Materials/*.png` + `data/material_icons.json`. |
| `mhfu_names.py` | **Shared** wiki→in-game name map (`RENAME`), imported by the parsers. |

---

## Add a new tab (step by step)

This is the exact chain used to add **Trenya**, **Pokke Farm**, and **Awards** — use one of those as a
worked reference (Awards is the simplest: a flat searchable list).

**1 — Data.** Write/extend a parser in `mhfu-lookup/scripts/` that emits `mhfu-lookup/data/<feature>.json`.
Reuse `mhfu_names.RENAME` so wiki spellings match in-game item names (and therefore resolve to icons). If
the feature has its own image assets, convert them into `src/MhfuLookup.App/Assets/<Feature>/`.

**2 — Schema.** Add a `CREATE TABLE <feature>(…)` to
[`Data/Schema.cs`](../src/MhfuLookup.Core/Data/Schema.cs) (`Schema.Ddl`).

**3 — Migration.** In [`Data/DatabaseBuilder.cs`](../src/MhfuLookup.Core/Data/DatabaseBuilder.cs) add a
`private void <Feature>(SqliteTransaction tx)` that reads the JSON and inserts rows (mirror `Awards(tx)` /
`Trenya(tx)`), and call it from `Run()`.

**4 — DTO + accessor.** Add a `record <Feature>Row(…)` to
[`Data/Dtos.cs`](../src/MhfuLookup.Core/Data/Dtos.cs) and a `Get<Feature>()` reader to
[`Data/MhfuDatabase.cs`](../src/MhfuLookup.Core/Data/MhfuDatabase.cs).

**5 — ViewModel.** Add `ViewModels/<Feature>ViewModel.cs`. Load via `AppDb.Instance.Get<Feature>()`,
expose `ObservableCollection`s + `[ObservableProperty]` selection/search, and reuse the item-icon
resolution if you show items (copy the `ResolveIconUri` helper from `PokkeViewModel`).

**6 — Page.** Add `Views/<Feature>Page.xaml` (+ trivial `.xaml.cs` exposing `ViewModel`). Follow an
existing layout — left list + detail (Items/Decorations), left list + stacked groups (Pokke), or a flat
searchable list (Awards). Bind icons through the `ImageUri` converter.

**7 — Register the tab** (three edits, all keyed by the same tag):
- `MainWindow.xaml` — add `<NavigationViewItem Content="…" Tag="<tag>" />`.
- `MainWindow.xaml.cs` — add `["<tag>"] = typeof(<Feature>Page)` to the `Pages` dictionary.
- `Services/TabIcons.cs` — add `("<tag>", "<Title>")` to `Tabs` **and** a default monster icon to
  `Defaults`. This also adds the tab to the Settings icon-picker and the Help list.

**8 — Bundle assets.** If you added an `Assets/<Feature>/` folder, add a
`<Content Include="Assets\<Feature>\*.png">` group to
[`MhfuLookup.App.csproj`](../src/MhfuLookup.App/MhfuLookup.App.csproj).

**9 — Help.** Add a section to [`Views/HelpPage.xaml`](../src/MhfuLookup.App/Views/HelpPage.xaml) describing
the tab (and a line to [user-guide.md](user-guide.md)).

**10 — Attribution (required).** New source → credit it **in the same change**, in all four homes: the
in-app **About** tab (`Views/AboutPage.xaml`, Data Sources section), `README.md` Credits,
`THIRD-PARTY-NOTICES.md` (for licensed code/assets, full license text), and the project's data-sources
notes. This is a standing rule for the project — never absorb a source silently.

**11 — Rebuild & verify.**

```powershell
dotnet run --project src/MhfuLookup.DataMigration -c Debug          # rebuild mhfu.db (new table populated)
dotnet build src/MhfuLookup.App/MhfuLookup.App.csproj -r win-x64    # 0 errors; assets copy to output
dotnet test  tests/MhfuLookup.Core.Tests/MhfuLookup.Core.Tests.csproj
```

Then launch the app: the tab appears in the nav with its icon, lists its data, and item icons resolve.
