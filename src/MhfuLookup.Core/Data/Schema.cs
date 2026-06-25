namespace MhfuLookup.Core.Data;

/// <summary>
/// The SQLite schema (hybrid: normalized tables for queryable entities, JSON
/// document columns for deeply-nested irregular data).
/// </summary>
public static class Schema
{
    public const string Ddl = """
    PRAGMA foreign_keys = ON;

    -- ── Skills ────────────────────────────────────────────────────────────────
    CREATE TABLE skills (
        id            TEXT PRIMARY KEY,
        name          TEXT NOT NULL,
        category      TEXT NOT NULL DEFAULT '',
        description   TEXT NOT NULL DEFAULT '',
        is_special    INTEGER NOT NULL DEFAULT 0,
        has_decoration INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE skill_levels (
        skill_id      TEXT NOT NULL REFERENCES skills(id),
        sort_order    INTEGER NOT NULL,
        points        INTEGER NOT NULL,
        name          TEXT NOT NULL,
        description   TEXT NOT NULL DEFAULT ''
    );
    CREATE INDEX ix_skill_levels_skill ON skill_levels(skill_id);

    -- ── Decorations ───────────────────────────────────────────────────────────
    CREATE TABLE decorations (
        id            TEXT PRIMARY KEY,
        name          TEXT NOT NULL,
        slot_cost     INTEGER NOT NULL,
        cost          INTEGER NOT NULL DEFAULT 0,
        color         TEXT NOT NULL DEFAULT ''    -- jewel tint (blacksmith palette name)
    );
    CREATE TABLE decoration_skill_effects (
        deco_id       TEXT NOT NULL REFERENCES decorations(id),
        skill_id      TEXT NOT NULL,
        points        INTEGER NOT NULL
    );
    CREATE INDEX ix_deco_effects_deco ON decoration_skill_effects(deco_id);
    CREATE INDEX ix_deco_effects_skill ON decoration_skill_effects(skill_id);
    CREATE TABLE decoration_recipes (
        deco_id        TEXT NOT NULL REFERENCES decorations(id),
        recipe_index   INTEGER NOT NULL,
        materials_json TEXT NOT NULL
    );
    CREATE INDEX ix_deco_recipes_deco ON decoration_recipes(deco_id);

    -- ── Armor ─────────────────────────────────────────────────────────────────
    CREATE TABLE armor_sets (
        id               TEXT PRIMARY KEY,
        name             TEXT NOT NULL,
        rank             TEXT NOT NULL DEFAULT '',
        rarity           INTEGER NOT NULL DEFAULT 1,
        class_split      INTEGER NOT NULL DEFAULT 0,
        gender_exclusive TEXT,
        has_paired_names INTEGER NOT NULL DEFAULT 0,
        sort_order       INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE armor_variants (
        set_id                TEXT NOT NULL REFERENCES armor_sets(id),
        class_type            TEXT NOT NULL,    -- Blademaster | Gunner | Both
        activated_skills_json TEXT NOT NULL DEFAULT '[]'
    );
    CREATE INDEX ix_armor_variants_set ON armor_variants(set_id);
    CREATE TABLE armor_pieces (
        piece_id    INTEGER PRIMARY KEY,
        set_id      TEXT NOT NULL REFERENCES armor_sets(id),
        class_type  TEXT NOT NULL,
        slot        TEXT NOT NULL,
        name_male   TEXT NOT NULL DEFAULT '',
        name_female TEXT NOT NULL DEFAULT '',
        defense     INTEGER NOT NULL DEFAULT 0,
        max_defense INTEGER NOT NULL DEFAULT 0,
        fire_res    INTEGER NOT NULL DEFAULT 0,
        water_res   INTEGER NOT NULL DEFAULT 0,
        thunder_res INTEGER NOT NULL DEFAULT 0,
        ice_res     INTEGER NOT NULL DEFAULT 0,
        dragon_res  INTEGER NOT NULL DEFAULT 0,
        deco_slots  INTEGER NOT NULL DEFAULT 0,
        cost        INTEGER NOT NULL DEFAULT 0
    );
    CREATE INDEX ix_armor_pieces_set ON armor_pieces(set_id);
    CREATE INDEX ix_armor_pieces_slot ON armor_pieces(slot);
    CREATE TABLE armor_piece_skill_points (
        piece_id    INTEGER NOT NULL REFERENCES armor_pieces(piece_id),
        skill_id    TEXT NOT NULL,
        points      INTEGER NOT NULL
    );
    CREATE INDEX ix_piece_skills_piece ON armor_piece_skill_points(piece_id);
    CREATE INDEX ix_piece_skills_skill ON armor_piece_skill_points(skill_id);
    CREATE TABLE armor_piece_materials (
        piece_id    INTEGER NOT NULL REFERENCES armor_pieces(piece_id),
        idx         INTEGER NOT NULL,
        material    TEXT NOT NULL
    );
    CREATE INDEX ix_piece_materials_piece ON armor_piece_materials(piece_id);

    -- ── Weapons (indexed columns + full doc) ──────────────────────────────────
    -- Weapon ids are NOT unique (duplicates exist within Hammer and across types),
    -- so use a surrogate PK and keep (type, id) as a non-unique lookup index.
    CREATE TABLE weapons (
        weapon_pk     INTEGER PRIMARY KEY,
        id            TEXT NOT NULL,
        type          TEXT NOT NULL,       -- display label, e.g. "Great Sword"
        name          TEXT NOT NULL,
        atk           INTEGER NOT NULL DEFAULT 0,
        affinity      INTEGER NOT NULL DEFAULT 0,
        slots         INTEGER NOT NULL DEFAULT 0,
        price         INTEGER NOT NULL DEFAULT 0,
        upgrades_from TEXT,
        sort_order    INTEGER NOT NULL DEFAULT 0,
        doc_json      TEXT NOT NULL
    );
    CREATE INDEX ix_weapons_type ON weapons(type);
    CREATE INDEX ix_weapons_type_id ON weapons(type, id);

    -- ── Document tables (irregular nesting kept whole) ────────────────────────
    CREATE TABLE monsters (
        id         TEXT PRIMARY KEY,
        name       TEXT NOT NULL,
        type       TEXT NOT NULL DEFAULT '',
        doc_json   TEXT NOT NULL
    );
    CREATE TABLE quest_categories (
        slug       TEXT PRIMARY KEY,
        category   TEXT NOT NULL,
        sort_order INTEGER NOT NULL DEFAULT 0,
        doc_json   TEXT NOT NULL
    );
    CREATE TABLE gathering_areas (
        slug       TEXT PRIMARY KEY,
        area       TEXT NOT NULL,
        sort_order INTEGER NOT NULL DEFAULT 0,
        doc_json   TEXT NOT NULL
    );

    -- ── Items (consumables, materials, tools, etc.) ───────────────────────────
    CREATE TABLE items (
        id          INTEGER PRIMARY KEY,
        category    TEXT NOT NULL,
        name        TEXT NOT NULL,
        icon        TEXT NOT NULL DEFAULT '',
        rarity      TEXT NOT NULL DEFAULT '',
        capacity    TEXT NOT NULL DEFAULT '',
        value       TEXT NOT NULL DEFAULT '',
        pokke_value TEXT NOT NULL DEFAULT '',   -- Pokke-point value (Account Items only)
        description TEXT NOT NULL DEFAULT '',
        sort_order  INTEGER NOT NULL DEFAULT 0
    );

    -- ── Item combinations (Product = Item 1 + Item 2) ─────────────────────────
    CREATE TABLE combinations (
        id         INTEGER PRIMARY KEY,
        section    TEXT NOT NULL,
        product    TEXT NOT NULL,
        item1      TEXT NOT NULL DEFAULT '',
        item2      TEXT NOT NULL DEFAULT '',
        pct        TEXT NOT NULL DEFAULT '',
        qty        TEXT NOT NULL DEFAULT '',
        sort_order INTEGER NOT NULL DEFAULT 0
    );

    -- ── Treasures (Treasure Hunt items; awards highlighted on the Guild Card) ──
    CREATE TABLE treasures (
        id            INTEGER PRIMARY KEY,
        area          TEXT NOT NULL,
        name          TEXT NOT NULL,
        description   TEXT NOT NULL DEFAULT '',
        where_to_find TEXT NOT NULL DEFAULT '',
        points        TEXT NOT NULL DEFAULT '',
        rarity        TEXT NOT NULL DEFAULT '',
        icon          TEXT NOT NULL DEFAULT '',
        is_award      INTEGER NOT NULL DEFAULT 0,
        sort_order    INTEGER NOT NULL DEFAULT 0
    );

    -- ── Felyne Kitchen food recipes (Ingredient 1 + Ingredient 2 → effect) ────
    CREATE TABLE food_recipes (
        id          INTEGER PRIMARY KEY,
        chefs       INTEGER NOT NULL,
        ingredient1 TEXT NOT NULL,
        ingredient2 TEXT NOT NULL,
        effect      TEXT NOT NULL DEFAULT '',
        sort_order  INTEGER NOT NULL DEFAULT 0
    );

    -- ── Which specific items make up each ingredient category, per chef count ──
    CREATE TABLE food_ingredients (
        id         INTEGER PRIMARY KEY,
        chefs      INTEGER NOT NULL,
        category   TEXT NOT NULL,
        items      TEXT NOT NULL DEFAULT '',
        sort_order INTEGER NOT NULL DEFAULT 0
    );

    -- ── Felyne Whim skills (rare bonus skills from the kitchen) ────────────────
    CREATE TABLE felyne_whim_skills (
        id          INTEGER PRIMARY KEY,
        name        TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        sort_order  INTEGER NOT NULL DEFAULT 0
    );

    -- ── Trenya sea-expedition items (location × point tier × category → item) ──
    CREATE TABLE trenya_items (
        id         INTEGER PRIMARY KEY,
        location   TEXT NOT NULL,
        points     INTEGER NOT NULL,
        category   TEXT NOT NULL,
        item       TEXT NOT NULL,
        sort_order INTEGER NOT NULL DEFAULT 0
    );

    -- ── Crafting-material icon basenames (type+colour sprite, e.g. "claw_gray") ──
    CREATE TABLE material_icons (
        name   TEXT PRIMARY KEY,
        sprite TEXT NOT NULL
    );

    -- ── Pokke Farm obtainable items (area → upgrade-tier group → item) ─────────
    CREATE TABLE pokke_items (
        id          INTEGER PRIMARY KEY,
        area        TEXT NOT NULL,
        group_label TEXT NOT NULL,
        group_note  TEXT NOT NULL DEFAULT '',
        item        TEXT NOT NULL,
        item_note   TEXT NOT NULL DEFAULT '',
        sort_order  INTEGER NOT NULL DEFAULT 0
    );

    -- ── Peddling Granny wares (discount vendor with rotating inventories) ──────
    CREATE TABLE peddling_granny (
        id         INTEGER PRIMARY KEY,
        inventory  TEXT NOT NULL,          -- "Regular Inventory 1", "Discount Inventory 1", "DLC Inventory", …
        item       TEXT NOT NULL,
        price      TEXT NOT NULL,          -- as listed, e.g. "5000z"
        sort_order INTEGER NOT NULL DEFAULT 0
    );

    -- ── Veggie Elder trades (zone-specific item-for-item exchanges) ────────────
    CREATE TABLE veggie_elder (
        id           INTEGER PRIMARY KEY,
        zone         TEXT NOT NULL,          -- "All Zones", "Snowy Mountains (Area 4)", …
        item         TEXT NOT NULL,          -- the item handed over
        common_trade TEXT NOT NULL DEFAULT '', -- usual return
        rare_trade   TEXT NOT NULL DEFAULT '', -- rare return ('' when none)
        sort_order   INTEGER NOT NULL DEFAULT 0
    );

    -- ── Felyne Comrades (AI Felyne fighters: article sections + data tables) ────
    CREATE TABLE felyne_comrade_sections (
        id         INTEGER PRIMARY KEY,
        title      TEXT NOT NULL,
        body       TEXT NOT NULL DEFAULT '',   -- prose (paragraphs blank-line separated, lists as "• ")
        table_kind TEXT NOT NULL DEFAULT '',   -- '' | 'weapons' | 'skills' | 'temperaments'
        sort_order INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE felyne_comrade_weapons (
        id           INTEGER PRIMARY KEY,
        attack_power TEXT NOT NULL,            -- "0~150", "150~300", "301+"
        slash        TEXT NOT NULL DEFAULT '',
        impact       TEXT NOT NULL DEFAULT '',
        divider      TEXT NOT NULL DEFAULT '', -- Weapon Divider in (ATK x Hitzone x Def x Rage x Crit)/Divider
        sort_order   INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE felyne_comrade_skills (
        id          INTEGER PRIMARY KEY,
        skill       TEXT NOT NULL,
        cost        TEXT NOT NULL DEFAULT '',  -- point cost
        description TEXT NOT NULL DEFAULT '',
        unlock      TEXT NOT NULL DEFAULT '',  -- how to unlock
        sort_order  INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE felyne_comrade_temperaments (
        id          INTEGER PRIMARY KEY,
        character   TEXT NOT NULL,
        attack_pref TEXT NOT NULL DEFAULT '',
        healing     TEXT NOT NULL DEFAULT '',
        target      TEXT NOT NULL DEFAULT '',
        sort_order  INTEGER NOT NULL DEFAULT 0
    );

    -- ── Guild Card awards (achievements) ──────────────────────────────────────
    CREATE TABLE awards (
        id          INTEGER PRIMARY KEY,
        name        TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        condition   TEXT NOT NULL DEFAULT '',
        icon        TEXT NOT NULL DEFAULT '',
        sort_order  INTEGER NOT NULL DEFAULT 0
    );

    -- ── App metadata (singletons stored as JSON) ──────────────────────────────
    CREATE TABLE app_meta (
        key   TEXT PRIMARY KEY,           -- monster_order | hh_songs | hh_songmap
        value TEXT NOT NULL
    );

    -- ── Writable tables (replace the Python runtime-written files) ────────────
    CREATE TABLE weapon_notes (
        weapon_id TEXT PRIMARY KEY,
        note      TEXT NOT NULL
    );
    CREATE TABLE settings (
        key   TEXT PRIMARY KEY,
        value TEXT NOT NULL
    );
    CREATE TABLE user_notes (
        entity_type TEXT NOT NULL,
        entity_id   TEXT NOT NULL,
        note        TEXT NOT NULL,
        PRIMARY KEY (entity_type, entity_id)
    );
    CREATE TABLE skill_categories (
        skill_id TEXT NOT NULL,
        category TEXT NOT NULL,            -- user-facing Armor Skills filter category (skills may have several)
        PRIMARY KEY (skill_id, category)
    );
    CREATE TABLE bookmarks (
        entity_type TEXT NOT NULL,            -- monster | weapon | item | armorset | decoration | quest | treasure
        entity_id   TEXT NOT NULL,            -- type-specific stable id (see MhfuDatabase bookmark helpers)
        name        TEXT NOT NULL,            -- cached display name (so the list needs no extra lookups)
        icon        TEXT NOT NULL DEFAULT '', -- cached icon uri where it can't be re-derived from name (quests)
        sort_order  INTEGER NOT NULL DEFAULT 0,  -- insertion order (newest last)
        PRIMARY KEY (entity_type, entity_id)
    );
    """;
}
