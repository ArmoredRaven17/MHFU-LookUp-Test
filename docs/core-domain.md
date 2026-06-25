# Core Domain Logic

`MhfuLookup.Core` holds the game logic that a naïve rewrite gets wrong. Each class is a faithful port of a
Python `src/` module (the original is the reference); the docstrings say which. The
[parity tests](#tests--contracts) lock the behaviour.

> **Domain framing:** Monster Hunter has no RPG classes/levels — progression *is* gear. "Blademaster" vs
> "Gunner" is a property of a weapon/armor variant (Gunner = Bow / Light & Heavy Bowgun), not a character
> class. Keep that in mind when reading the armor and skills code.

## C# ↔ Python map

| C# (`Core/Domain`) | Python (`mhfu-lookup/src`) | Role |
|---|---|---|
| `SkillRegistry` | `skill_registry.py` | Skill name → canonical id; activation thresholds. |
| `ArmorLoader` | `armor.py` | Flatten the v2 armor schema into pieces; class-split material fallback. |
| `DecorationCatalog` | `decorations.py` | Decoration catalog + search indices. |
| `MaterialIndex` | `material_index.py` | material → set of (hub, stars) sources. |
| `ProgressChecks` | `progress.py` | Material / piece availability gating. |
| `MaterialNormalizer` | `material_normalizer.py` | Strip counts, extract item names, canonical form. |
| `JsonUtil` | — | JSON DOM helpers (`ParseFile`, `AsIntOr`, `AsBool`, …). |

Models in [`Core/Models`](../src/MhfuLookup.Core/Models): `Skill` (+ `SkillLevel`), `Decoration`,
`ArmorPiece`, `Progress` (hub/hunter progress). They're immutable `record`s mirroring the Python frozen
dataclasses.

> **Note:** the armor set's *activated skills* are precomputed in the source data and stored in
> `armor_variants.activated_skills_json` at migration time, so the app reads them directly. There is no
> runtime build-calculator (the Python "Set Creator"/set-finder was not ported).

## SkillRegistry

[`SkillRegistry.cs`](../src/MhfuLookup.Core/Domain/SkillRegistry.cs) resolves any skill reference —
canonical id, display name, or a decoration's skill label — to a **canonical id** (`CanonicalId`, throws
`KeyNotFoundException` if unmatched after aliases). It also exposes activation thresholds and
`ActivatedName(skillId, points)` (highest positive tier crossed, or the closest negative tier).
Canonicalizing at migration time means every `skill_id` stored in the DB is already canonical.

## ArmorLoader

[`ArmorLoader.cs`](../src/MhfuLookup.Core/Domain/ArmorLoader.cs) flattens the v2 `armor_sets` schema into
`ArmorPiece` rows (`LoadFromFile/Json/Node`). Key rules:

- **One row per (set × class × slot).** For `class_split` sets, a Gunner piece with empty materials falls
  back to the Blademaster materials for the same slot.
- **`SharedClass(set)`** — a non-split set is normally `Both`, but a set can pin itself to one class via a
  `"class"` field (e.g. Steel, which the wiki lists only under Blademaster).
- Helpers: `FilterByClass`, `FilterByGender`, `GroupBySlot`.

See [database-schema.md](database-schema.md#armor) for how this maps to `armor_variants.class_type` and
the `armor_pieces` columns.

## DecorationCatalog

[`DecorationCatalog.cs`](../src/MhfuLookup.Core/Domain/DecorationCatalog.cs) loads all decorations
(`FromFile/Json/Node`, `Build`) and exposes search-friendly indices (by slot size, by skill, ordered by
points-per-slot efficiency). The migration uses it to populate `decorations` + `decoration_skill_effects`
+ `decoration_recipes`.

## MaterialIndex & ProgressChecks

[`MaterialIndex.cs`](../src/MhfuLookup.Core/Domain/MaterialIndex.cs) builds `material → {(hub, stars)}` by
combining three sources in order — quest rewards, monster drops (with a cross-reference filter and alias
normalization), and gathering nodes (`BuildFromData` / `LoadFromPaths`). `Availability(material)` and
`UnsourcedMaterials(pieces)` query it.

[`ProgressChecks.cs`](../src/MhfuLookup.Core/Domain/ProgressChecks.cs) gates content against a
`HunterProgress`: `IsMaterialAvailable`, `IsPieceAvailable`, `FilterByProgress`, with a coarse rank check
as a fallback when material data is missing.

[`MaterialNormalizer.cs`](../src/MhfuLookup.Core/Domain/MaterialNormalizer.cs): `StripCount`
("3 Basarios Shell" → "Basarios Shell"), `ExtractItemName`, and `CanonicalMaterial` (trims whitespace
only — deliberately **not** fuzzy, to avoid merging distinct materials).

## Tests / contracts

The xUnit suite in [`tests/MhfuLookup.Core.Tests`](../tests/MhfuLookup.Core.Tests) ports the Python
`pytest` suite and is the behavioural contract:

| Test file | Guards |
|---|---|
| `SkillRegistryTests.cs` | Canonical id resolution + thresholds. |
| `ArmorTests.cs` | Flattening + class-split material fallback. |
| `DecorationsTests.cs` | Catalog build + indices. |
| `MaterialIndexTests.cs` / `MaterialNormalizerTests.cs` | Availability graph + name normalization. |
| `ProgressTests.cs` | Availability gating. |
| `DatabaseTests.cs` | End-to-end: build a DB and spot-check rows. |

Run them with `dotnet test tests/MhfuLookup.Core.Tests/MhfuLookup.Core.Tests.csproj` — keep them green
before/after any domain change.
