# Database Schema (`mhfu.db`)

The full DDL lives in one place: [`src/MhfuLookup.Core/Data/Schema.cs`](../src/MhfuLookup.Core/Data/Schema.cs)
(`Schema.Ddl`). It's executed verbatim when the database is created by
[`DatabaseBuilder`](../src/MhfuLookup.Core/Data/DatabaseBuilder.cs); reads/writes go through
[`MhfuDatabase`](../src/MhfuLookup.Core/Data/MhfuDatabase.cs). `PRAGMA foreign_keys = ON`.

This page summarizes the tables; **`Schema.cs` is authoritative** if anything here drifts.

## Design: normalized + JSON-document hybrid

- **Normalized tables** hold entities the app filters, joins, or aggregates on — typed columns with
  indexes (skills, decorations, armor, weapons, items, …).
- **Document tables** keep deeply-nested, irregular data whole in a `doc_json` TEXT column (monsters,
  quest categories, gathering areas, plus per-weapon detail). The app parses these back into a JSON DOM
  (`System.Text.Json.Nodes`) on read — see `MhfuDatabase.GetMonsterDoc`, `GetQuestDoc`, etc.
- **Writable tables** replace the files the Python app wrote at runtime (saved sets, weapon notes,
  settings).
- **Singletons** that are naturally one blob (monster ordering, hunting-horn song maps) live in
  `app_meta` as JSON keyed by name.

## Normalized entities

### Skills
- **`skills`** — `id` (PK, canonical), `name`, `category`, `description`, `is_special`, `has_decoration`.
- **`skill_levels`** — `skill_id` → `skills.id`, `sort_order`, `points`, `name` (tier name), `description`.
  One row per activation tier; ordered (v2 stores descending). Indexed by `skill_id`.

### Decorations
- **`decorations`** — `id` (PK), `name`, `slot_cost`, `cost`, `color` (jewel tint, blacksmith palette name).
- **`decoration_skill_effects`** — `deco_id`, `skill_id`, `points`. The skills (and points) a jewel grants.
- **`decoration_recipes`** — `deco_id`, `recipe_index`, `materials_json` (a JSON array of material strings).

### Armor
- **`armor_sets`** — `id` (PK), `name`, `rank`, `rarity`, `class_split`, `gender_exclusive` (nullable),
  `has_paired_names`, `sort_order`.
- **`armor_variants`** — `set_id`, `class_type` (`Blademaster` | `Gunner` | `Both`),
  `activated_skills_json`.
- **`armor_pieces`** — surrogate `piece_id` (PK), `set_id`, `class_type`, `slot`, `name_male`,
  `name_female`, `defense`/`max_defense`, the five resistances, `deco_slots`, `cost`. One row per
  (set × class × slot) after flattening.
- **`armor_piece_skill_points`** — `piece_id`, `skill_id` (canonical), `points`.
- **`armor_piece_materials`** — `piece_id`, `idx`, `material`.

### Weapons
- **`weapons`** — surrogate `weapon_pk` (PK), `id` (NOT unique — duplicates exist within Hammer and across
  types), `type` (display label), `name`, `atk`, `affinity`, `slots`, `price`, `upgrades_from` (nullable,
  builds the tree), `sort_order`, and **`doc_json`** for type-specific detail (sharpness, bow charges &
  coatings, bowgun ammo, gunlance shelling, hunting-horn notes). Indexed by `type` and `(type, id)`.

## Document tables (`doc_json`)

- **`monsters`** — `id` (PK), `name`, `type`, `doc_json` (hitzones, stagger/break thresholds, ailment
  tolerances, carve/capture/break loot tables, quest block).
- **`quest_categories`** — `slug` (PK), `category`, `sort_order`, `doc_json` (rank-grouped quests).
- **`gathering_areas`** — `slug` (PK), `area`, `sort_order`, `doc_json` (zone → node tables).

## Reference & feature tables

- **`items`** — `id` (PK), `category`, `name`, `icon`, `rarity`, `capacity`, `value` (zenny),
  **`pokke_value`** (Pokke points, Account Items only), `description`, `sort_order`.
- **`combinations`** — `id` (PK), `section`, `product`, `item1`, `item2`, `pct`, `qty`, `sort_order`
  (Product = Item 1 + Item 2).
- **`treasures`** — `id` (PK), `area`, `name`, `description`, `where_to_find`, `points`, `rarity`, `icon`,
  `is_award` (★ counts toward a Guild Card award), `sort_order`.
- **`food_recipes`** — `id` (PK), `chefs`, `ingredient1`, `ingredient2`, `effect`, `sort_order` (Felyne
  Kitchen).
- **`food_ingredients`** — `id` (PK), `chefs`, `category`, `items`, `sort_order` (what each ingredient
  category contains, per chef count).
- **`felyne_whim_skills`** — `id` (PK), `name`, `description`, `sort_order`.
- **`trenya_items`** — `id` (PK), `location`, `points`, `category`, `item`, `sort_order` (location × point
  tier × category → item).
- **`pokke_items`** — `id` (PK), `area`, `group_label`, `group_note`, `item`, `item_note`, `sort_order`
  (farm area → upgrade-tier group → obtainable item).
- **`awards`** — `id` (PK), `name`, `description`, `condition`, `icon`, `sort_order` (Guild Card awards).
- **`material_icons`** — `name` (PK), `sprite` (tinted type+colour basename, e.g. `claw_gray`); drives the
  colored material icons in decoration recipes.

## Singletons & writable tables

- **`app_meta`** — `key` (PK) ∈ {`monster_order`, `hh_songs`, `hh_songmap`}, `value` (JSON).
- **`weapon_notes`** — `weapon_id` (PK), `note` (was `data/weapon_notes.json`).
- **`settings`** — `key` (PK), `value` (e.g. `ui_scale`, `tab_icons`; was `settings.json`).

## How a `doc_json` column is consumed

`DatabaseBuilder` stores the original JSON node's text directly; `MhfuDatabase` reads it back with
`JsonNode.Parse` and the ViewModels walk the DOM. Example (monsters):

```
DB:   monsters.doc_json = "{ \"hitzones\": [...], \"items\": {...}, \"quests\": {...} }"
Read: MhfuDatabase.GetMonsterDoc(id) → JsonObject
VM:   MonsterViewModel pulls hitzones / loot / ailments out of that object
```

This keeps irregular, deeply-nested game data faithful to the source without forcing it into rigid columns.
