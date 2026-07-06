using System.Text.Json.Nodes;
using MhfuLookup.Core.Domain;
using MhfuLookup.Core.Models;
using Microsoft.Data.Sqlite;

namespace MhfuLookup.Core.Data;

/// <summary>
/// Read/write facade over mhfu.db. One long-lived connection (the app is
/// single-user desktop). All reference reads are read-only; saved sets, weapon
/// notes and settings are writable.
/// </summary>
public sealed class MhfuDatabase : IDisposable
{
    private readonly SqliteConnection _conn;

    public MhfuDatabase(string dbPath)
    {
        _conn = Db.Open(dbPath);
        // User notes live alongside settings in the same writable DB. Created on demand so a database
        // shipped before this table existed still works.
        using var c = _conn.CreateCommand();
        c.CommandText = "CREATE TABLE IF NOT EXISTS user_notes ("
            + "entity_type TEXT NOT NULL, entity_id TEXT NOT NULL, note TEXT NOT NULL, "
            + "PRIMARY KEY (entity_type, entity_id))";
        c.ExecuteNonQuery();
        // Bookmarks share the same writable DB; created on demand so a database shipped before this
        // table existed still works (mirrors user_notes).
        using var b = _conn.CreateCommand();
        b.CommandText = "CREATE TABLE IF NOT EXISTS bookmarks ("
            + "entity_type TEXT NOT NULL, entity_id TEXT NOT NULL, name TEXT NOT NULL, "
            + "icon TEXT NOT NULL DEFAULT '', sort_order INTEGER NOT NULL DEFAULT 0, "
            + "PRIMARY KEY (entity_type, entity_id))";
        b.ExecuteNonQuery();
        // Skill→category memberships (many-to-many) for the Armor Skills category filter. Reference
        // data populated by recategorize_skills script; created on demand so the app still runs if absent.
        using var sc = _conn.CreateCommand();
        sc.CommandText = "CREATE TABLE IF NOT EXISTS skill_categories ("
            + "skill_id TEXT NOT NULL, category TEXT NOT NULL, PRIMARY KEY (skill_id, category))";
        sc.ExecuteNonQuery();
        // Peddling Granny wares (reference data populated by build_peddling_granny script); created on
        // demand so the app still runs if a database predates the table.
        using var pg = _conn.CreateCommand();
        pg.CommandText = "CREATE TABLE IF NOT EXISTS peddling_granny ("
            + "id INTEGER PRIMARY KEY, inventory TEXT NOT NULL, item TEXT NOT NULL, "
            + "price TEXT NOT NULL, sort_order INTEGER NOT NULL DEFAULT 0)";
        pg.ExecuteNonQuery();
        // Veggie Elder trades (reference data populated by build_veggie_elder script); created on
        // demand so the app still runs if a database predates the table.
        using var ve = _conn.CreateCommand();
        ve.CommandText = "CREATE TABLE IF NOT EXISTS veggie_elder ("
            + "id INTEGER PRIMARY KEY, zone TEXT NOT NULL, item TEXT NOT NULL, "
            + "common_trade TEXT NOT NULL DEFAULT '', rare_trade TEXT NOT NULL DEFAULT '', "
            + "sort_order INTEGER NOT NULL DEFAULT 0)";
        ve.ExecuteNonQuery();
        // Felyne Comrades (reference data populated by build_felyne_comrades script); created on demand
        // so the app still runs if a database predates the tables.
        using var fc = _conn.CreateCommand();
        fc.CommandText =
            "CREATE TABLE IF NOT EXISTS felyne_comrade_sections (id INTEGER PRIMARY KEY, title TEXT NOT NULL, "
            + "body TEXT NOT NULL DEFAULT '', table_kind TEXT NOT NULL DEFAULT '', sort_order INTEGER NOT NULL DEFAULT 0);"
            + "CREATE TABLE IF NOT EXISTS felyne_comrade_weapons (id INTEGER PRIMARY KEY, attack_power TEXT NOT NULL, "
            + "slash TEXT NOT NULL DEFAULT '', impact TEXT NOT NULL DEFAULT '', divider TEXT NOT NULL DEFAULT '', sort_order INTEGER NOT NULL DEFAULT 0);"
            + "CREATE TABLE IF NOT EXISTS felyne_comrade_skills (id INTEGER PRIMARY KEY, skill TEXT NOT NULL, cost TEXT NOT NULL DEFAULT '', "
            + "description TEXT NOT NULL DEFAULT '', unlock TEXT NOT NULL DEFAULT '', sort_order INTEGER NOT NULL DEFAULT 0);"
            + "CREATE TABLE IF NOT EXISTS felyne_comrade_temperaments (id INTEGER PRIMARY KEY, character TEXT NOT NULL, "
            + "attack_pref TEXT NOT NULL DEFAULT '', healing TEXT NOT NULL DEFAULT '', target TEXT NOT NULL DEFAULT '', "
            + "sort_order INTEGER NOT NULL DEFAULT 0)";
        fc.ExecuteNonQuery();
        // The icon column was added after the table first shipped; add it to an existing table.
        try
        {
            using var ic = _conn.CreateCommand();
            ic.CommandText = "ALTER TABLE bookmarks ADD COLUMN icon TEXT NOT NULL DEFAULT ''";
            ic.ExecuteNonQuery();
        }
        catch (SqliteException) { /* column already exists */ }
    }

    public void Dispose() => _conn.Dispose();

    private SqliteCommand Cmd(string sql)
    {
        var c = _conn.CreateCommand();
        c.CommandText = sql;
        return c;
    }

    private static void P(SqliteCommand c, string name, object? value)
    {
        var p = c.CreateParameter();
        p.ParameterName = name;
        p.Value = value ?? DBNull.Value;
        c.Parameters.Add(p);
    }

    // ── Monsters ──────────────────────────────────────────────────────────────
    public List<MonsterSummary> GetMonsters()
    {
        var outp = new List<MonsterSummary>();
        using var c = Cmd("SELECT id,name,type FROM monsters ORDER BY name");
        using var r = c.ExecuteReader();
        while (r.Read()) outp.Add(new MonsterSummary(r.GetString(0), r.GetString(1), r.GetString(2)));
        return outp;
    }

    public JsonObject? GetMonsterDoc(string id) => GetDoc("SELECT doc_json FROM monsters WHERE id=$k", id);

    /// <summary>Ordered (type → member ids) from order.json, for the grouped tree.</summary>
    public List<(string Type, List<string> Members)> GetMonsterOrder()
    {
        var meta = GetMeta("monster_order");
        var outp = new List<(string, List<string>)>();
        if (meta is null) return outp;
        if (JsonNode.Parse(meta) is not JsonObject o) return outp;
        foreach (var (type, arr) in o)
            outp.Add((type, (arr as JsonArray)?.Select(x => x?.ToString() ?? "").ToList() ?? new List<string>()));
        return outp;
    }

    // ── Weapons ───────────────────────────────────────────────────────────────
    public List<string> GetWeaponTypes()
    {
        var outp = new List<string>();
        // Canonical in-game order (GS→LS→SnS→DB→Hammer→HH→Lance→GL→LBG→HBG→Bow).
        // CASE gives each known type an explicit rank; unknown types fall to 99 (end).
        const string sql = """
            SELECT type FROM weapons GROUP BY type ORDER BY
            CASE type
                WHEN 'Great Sword'    THEN 0
                WHEN 'Long Sword'     THEN 1
                WHEN 'Sword & Shield' THEN 2
                WHEN 'Dual Blades'    THEN 3
                WHEN 'Hammer'         THEN 4
                WHEN 'Hunting Horn'   THEN 5
                WHEN 'Lance'          THEN 6
                WHEN 'Gunlance'       THEN 7
                WHEN 'Light Bowgun'   THEN 8
                WHEN 'Heavy Bowgun'   THEN 9
                WHEN 'Bow'            THEN 10
                ELSE 99
            END
            """;
        using var c = Cmd(sql);
        using var r = c.ExecuteReader();
        while (r.Read()) outp.Add(r.GetString(0));
        return outp;
    }

    public List<WeaponRow> GetWeaponsByType(string type)
    {
        var outp = new List<WeaponRow>();
        using var c = Cmd("SELECT weapon_pk,id,type,name,atk,affinity,slots,price,upgrades_from,doc_json " +
                          "FROM weapons WHERE type=$t ORDER BY sort_order");
        P(c, "$t", type);
        using var r = c.ExecuteReader();
        while (r.Read())
            outp.Add(new WeaponRow(
                r.GetInt64(0), r.GetString(1), r.GetString(2), r.GetString(3),
                r.GetInt32(4), r.GetInt32(5), r.GetInt32(6), r.GetInt32(7),
                r.IsDBNull(8) ? null : r.GetString(8),
                (JsonNode.Parse(r.GetString(9)) as JsonObject) ?? new JsonObject()));
        return outp;
    }

    /// <summary>The single weapon with this surrogate primary key, or null. Used for deep-linking.</summary>
    public WeaponRow? GetWeaponByPk(long pk)
    {
        using var c = Cmd("SELECT weapon_pk,id,type,name,atk,affinity,slots,price,upgrades_from,doc_json " +
                          "FROM weapons WHERE weapon_pk=$pk");
        P(c, "$pk", pk);
        using var r = c.ExecuteReader();
        if (!r.Read()) return null;
        return new WeaponRow(
            r.GetInt64(0), r.GetString(1), r.GetString(2), r.GetString(3),
            r.GetInt32(4), r.GetInt32(5), r.GetInt32(6), r.GetInt32(7),
            r.IsDBNull(8) ? null : r.GetString(8),
            (JsonNode.Parse(r.GetString(9)) as JsonObject) ?? new JsonObject());
    }

    public string? GetWeaponNote(string weaponId)
    {
        using var c = Cmd("SELECT note FROM weapon_notes WHERE weapon_id=$k");
        P(c, "$k", weaponId);
        return c.ExecuteScalar() as string;
    }

    public void SetWeaponNote(string weaponId, string note)
    {
        using var c = Cmd("INSERT OR REPLACE INTO weapon_notes(weapon_id,note) VALUES($k,$n)");
        P(c, "$k", weaponId); P(c, "$n", note);
        c.ExecuteNonQuery();
    }

    // ── Skills ────────────────────────────────────────────────────────────────
    public List<Skill> GetSkills()
    {
        var levels = new Dictionary<string, List<SkillLevel>>();
        using (var lc = Cmd("SELECT skill_id,points,name,description FROM skill_levels ORDER BY skill_id,sort_order"))
        using (var lr = lc.ExecuteReader())
            while (lr.Read())
            {
                var sid = lr.GetString(0);
                if (!levels.TryGetValue(sid, out var lst)) { lst = new(); levels[sid] = lst; }
                lst.Add(new SkillLevel(lr.GetInt32(1), lr.GetString(2), lr.GetString(3)));
            }

        var outp = new List<Skill>();
        using var c = Cmd("SELECT id,name,category,description,is_special,has_decoration FROM skills ORDER BY name");
        using var r = c.ExecuteReader();
        while (r.Read())
            outp.Add(new Skill(
                r.GetString(0), r.GetString(1), r.GetString(2), r.GetString(3),
                r.GetInt32(4) != 0, r.GetInt32(5) != 0,
                levels.GetValueOrDefault(r.GetString(0)) ?? new List<SkillLevel>()));
        return outp;
    }

    /// <summary>Peddling Granny's wares (every inventory), ordered for display.</summary>
    public List<PeddlingGrannyRow> GetPeddlingGranny()
    {
        var outp = new List<PeddlingGrannyRow>();
        using var c = Cmd("SELECT inventory,item,price,sort_order FROM peddling_granny ORDER BY sort_order");
        using var r = c.ExecuteReader();
        while (r.Read()) outp.Add(new PeddlingGrannyRow(r.GetString(0), r.GetString(1), r.GetString(2), r.GetInt32(3)));
        return outp;
    }

    /// <summary>Every Veggie Elder trade (all zones), ordered for display.</summary>
    public List<VeggieElderRow> GetVeggieElder()
    {
        var outp = new List<VeggieElderRow>();
        using var c = Cmd("SELECT zone,item,common_trade,rare_trade,sort_order FROM veggie_elder ORDER BY sort_order");
        using var r = c.ExecuteReader();
        while (r.Read()) outp.Add(new VeggieElderRow(r.GetString(0), r.GetString(1), r.GetString(2), r.GetString(3), r.GetInt32(4)));
        return outp;
    }

    /// <summary>Felyne Comrades article sections (prose + which table belongs under each), in reading order.</summary>
    public List<ComradeSectionRow> GetComradeSections()
    {
        var outp = new List<ComradeSectionRow>();
        using var c = Cmd("SELECT title,body,table_kind,sort_order FROM felyne_comrade_sections ORDER BY sort_order");
        using var r = c.ExecuteReader();
        while (r.Read()) outp.Add(new ComradeSectionRow(r.GetString(0), r.GetString(1), r.GetString(2), r.GetInt32(3)));
        return outp;
    }

    /// <summary>Recommended Felyne Comrade weapons by attack-power tier.</summary>
    public List<ComradeWeaponRow> GetComradeWeapons()
    {
        var outp = new List<ComradeWeaponRow>();
        using var c = Cmd("SELECT attack_power,slash,impact,divider,sort_order FROM felyne_comrade_weapons ORDER BY sort_order");
        using var r = c.ExecuteReader();
        while (r.Read()) outp.Add(new ComradeWeaponRow(r.GetString(0), r.GetString(1), r.GetString(2), r.GetString(3), r.GetInt32(4)));
        return outp;
    }

    /// <summary>Trainable Felyne Comrade skills, in display order.</summary>
    public List<ComradeSkillRow> GetComradeSkills()
    {
        var outp = new List<ComradeSkillRow>();
        using var c = Cmd("SELECT skill,cost,description,unlock,sort_order FROM felyne_comrade_skills ORDER BY sort_order");
        using var r = c.ExecuteReader();
        while (r.Read()) outp.Add(new ComradeSkillRow(r.GetString(0), r.GetString(1), r.GetString(2), r.GetString(3), r.GetInt32(4)));
        return outp;
    }

    /// <summary>Felyne Comrade temperaments (personalities), in display order.</summary>
    public List<ComradeTemperamentRow> GetComradeTemperaments()
    {
        var outp = new List<ComradeTemperamentRow>();
        using var c = Cmd("SELECT character,attack_pref,healing,target,sort_order FROM felyne_comrade_temperaments ORDER BY sort_order");
        using var r = c.ExecuteReader();
        while (r.Read()) outp.Add(new ComradeTemperamentRow(r.GetString(0), r.GetString(1), r.GetString(2), r.GetString(3), r.GetInt32(4)));
        return outp;
    }

    /// <summary>Skill→category memberships (many-to-many) for the Armor Skills category filter.</summary>
    public List<(string SkillId, string Category)> GetSkillCategories()
    {
        var outp = new List<(string, string)>();
        using var c = Cmd("SELECT skill_id, category FROM skill_categories ORDER BY category, skill_id");
        using var r = c.ExecuteReader();
        while (r.Read()) outp.Add((r.GetString(0), r.GetString(1)));
        return outp;
    }

    /// <summary>All armor pieces contributing points to a skill, deduplicated across BM/Gunner
    /// variants of the same set, ordered by points descending then set name.</summary>
    public List<(string SetName, string PieceName, string Slot, int Points, int Rarity)> GetSkillPieces(string skillId)
    {
        var outp = new List<(string, string, string, int, int)>();
        using var c = Cmd(
            "SELECT a.name, COALESCE(NULLIF(ap.name_male,''),ap.name_female,ap.slot), ap.slot, sp.points, a.rarity " +
            "FROM armor_piece_skill_points sp " +
            "JOIN armor_pieces ap ON ap.piece_id = sp.piece_id " +
            "JOIN armor_sets a ON a.id = ap.set_id " +
            "WHERE sp.skill_id = $id " +
            "GROUP BY a.id, ap.slot " +
            "ORDER BY a.rarity, sp.points DESC, a.name, " +
            "CASE ap.slot WHEN 'head' THEN 0 WHEN 'chest' THEN 1 WHEN 'arms' THEN 2 WHEN 'waist' THEN 3 WHEN 'legs' THEN 4 ELSE 5 END");
        P(c, "$id", skillId);
        using var r = c.ExecuteReader();
        while (r.Read()) outp.Add((r.GetString(0), r.GetString(1), r.GetString(2), r.GetInt32(3), r.IsDBNull(4) ? 0 : r.GetInt32(4)));
        return outp;
    }

    // ── Decorations ───────────────────────────────────────────────────────────
    public List<Decoration> GetDecorations()
    {
        var effects = new Dictionary<string, Dictionary<string, int>>();
        using (var ec = Cmd("SELECT deco_id,skill_id,points FROM decoration_skill_effects"))
        using (var er = ec.ExecuteReader())
            while (er.Read())
            {
                var id = er.GetString(0);
                if (!effects.TryGetValue(id, out var d)) { d = new(); effects[id] = d; }
                d[er.GetString(1)] = er.GetInt32(2);
            }

        var recipes = new Dictionary<string, List<IReadOnlyList<string>>>();
        using (var rc = Cmd("SELECT deco_id,materials_json FROM decoration_recipes ORDER BY deco_id,recipe_index"))
        using (var rr = rc.ExecuteReader())
            while (rr.Read())
            {
                var id = rr.GetString(0);
                if (!recipes.TryGetValue(id, out var lst)) { lst = new(); recipes[id] = lst; }
                lst.Add((JsonNode.Parse(rr.GetString(1)) as JsonArray)?.Select(x => x?.ToString() ?? "").ToList()
                        ?? new List<string>());
            }

        var outp = new List<Decoration>();
        using var c = Cmd("SELECT id,name,slot_cost,cost,color FROM decorations ORDER BY name");
        using var r = c.ExecuteReader();
        while (r.Read())
        {
            var id = r.GetString(0);
            outp.Add(new Decoration
            {
                Id = id,
                Name = r.GetString(1),
                SlotCost = r.GetInt32(2),
                Cost = r.GetInt32(3),
                Color = r.GetString(4),
                SkillEffects = effects.GetValueOrDefault(id) ?? new Dictionary<string, int>(),
                Recipes = recipes.GetValueOrDefault(id) ?? new List<IReadOnlyList<string>>(),
            });
        }
        return outp;
    }

    // ── Armor ─────────────────────────────────────────────────────────────────
    public List<ArmorSetSummary> GetArmorSets()
    {
        var outp = new List<ArmorSetSummary>();
        using var c = Cmd("SELECT s.id,s.name,s.rarity,s.class_split,s.sort_order, " +
                          "(SELECT GROUP_CONCAT(DISTINCT v.class_type) FROM armor_variants v WHERE v.set_id=s.id) " +
                          "FROM armor_sets s ORDER BY s.sort_order");
        using var r = c.ExecuteReader();
        while (r.Read())
            outp.Add(new ArmorSetSummary(r.GetString(0), r.GetString(1),
                r.GetInt32(2), r.GetInt32(3) != 0, r.GetInt32(4), r.IsDBNull(5) ? "" : r.GetString(5)));
        return outp;
    }

    /// <summary>
    /// set id → a newline-joined blob of its skill-point names (e.g. "Sneak") and activated-skill
    /// names (e.g. "Stealth"), so the Armor Set search can match on skills as well as set names.
    /// Two bulk queries, built once.
    /// </summary>
    public Dictionary<string, string> GetArmorSearchTerms()
    {
        var terms = new Dictionary<string, HashSet<string>>();
        void Add(string setId, string t)
        {
            if (string.IsNullOrWhiteSpace(t)) return;
            if (!terms.TryGetValue(setId, out var set)) { set = new(StringComparer.OrdinalIgnoreCase); terms[setId] = set; }
            set.Add(t.Trim());
        }
        // Skill-point tree names (the skills a set has points in).
        using (var c = Cmd("SELECT DISTINCT p.set_id, sk.name FROM armor_piece_skill_points sp "
            + "JOIN armor_pieces p ON p.piece_id=sp.piece_id JOIN skills sk ON sk.id=sp.skill_id"))
        using (var r = c.ExecuteReader())
            while (r.Read()) Add(r.GetString(0), r.GetString(1));
        // Activated-skill names across all class variants.
        using (var c = Cmd("SELECT set_id, activated_skills_json FROM armor_variants"))
        using (var r = c.ExecuteReader())
            while (r.Read())
                if (JsonNode.Parse(r.GetString(1)) is JsonArray arr)
                    foreach (var a in arr) Add(r.GetString(0), a?.ToString() ?? "");
        return terms.ToDictionary(kv => kv.Key, kv => string.Join("\n", kv.Value));
    }

    public ArmorSetDetail? GetArmorSet(string setId)
    {
        string name = ""; int rarity = 1; bool classSplit = false; bool found = false;
        using (var sc = Cmd("SELECT name,rarity,class_split FROM armor_sets WHERE id=$k"))
        {
            P(sc, "$k", setId);
            using var sr = sc.ExecuteReader();
            if (sr.Read()) { name = sr.GetString(0); rarity = sr.GetInt32(1); classSplit = sr.GetInt32(2) != 0; found = true; }
        }
        if (!found) return null;

        var activatedByClass = new Dictionary<string, List<string>>();
        using (var vc = Cmd("SELECT class_type,activated_skills_json FROM armor_variants WHERE set_id=$k"))
        {
            P(vc, "$k", setId);
            using var vr = vc.ExecuteReader();
            while (vr.Read())
                activatedByClass[vr.GetString(0)] =
                    (JsonNode.Parse(vr.GetString(1)) as JsonArray)?.Select(x => x?.ToString() ?? "").ToList()
                    ?? new List<string>();
        }

        var pieces = LoadPieces("WHERE p.set_id=$k", ("$k", setId));
        var byClass = pieces.GroupBy(p => p.ClassType).ToDictionary(g => g.Key, g => g.ToList());

        var variants = new List<ArmorVariant>();
        foreach (var ct in new[] { "Both", "Blademaster", "Gunner" })
            if (byClass.TryGetValue(ct, out var ps))
                variants.Add(new ArmorVariant(ct, activatedByClass.GetValueOrDefault(ct) ?? new List<string>(),
                    OrderBySlot(ps)));

        return new ArmorSetDetail(setId, name, rarity, classSplit, variants);
    }

    /// <summary>All pieces (used to rehydrate ArmorPiece models, e.g. for the engine).</summary>
    public List<ArmorPiece> GetAllPieces() => LoadPieces("");

    private List<ArmorPiece> LoadPieces(string where, params (string, object?)[] ps)
    {
        // Gather skill points and materials per piece first.
        var skills = new Dictionary<long, List<SkillPoint>>();
        using (var c = Cmd("SELECT sp.piece_id,sp.skill_id,sp.points FROM armor_piece_skill_points sp " +
                           "JOIN armor_pieces p ON p.piece_id=sp.piece_id " + where))
        {
            foreach (var (k, v) in ps) P(c, k, v);
            using var r = c.ExecuteReader();
            while (r.Read())
            {
                var id = r.GetInt64(0);
                if (!skills.TryGetValue(id, out var lst)) { lst = new(); skills[id] = lst; }
                lst.Add(new SkillPoint(r.GetString(1), r.GetInt32(2)));
            }
        }
        var mats = new Dictionary<long, List<string>>();
        using (var c = Cmd("SELECT m.piece_id,m.material FROM armor_piece_materials m " +
                           "JOIN armor_pieces p ON p.piece_id=m.piece_id " + where + " ORDER BY m.piece_id,m.idx"))
        {
            foreach (var (k, v) in ps) P(c, k, v);
            using var r = c.ExecuteReader();
            while (r.Read())
            {
                var id = r.GetInt64(0);
                if (!mats.TryGetValue(id, out var lst)) { lst = new(); mats[id] = lst; }
                lst.Add(r.GetString(1));
            }
        }

        var outp = new List<ArmorPiece>();
        using (var c = Cmd("SELECT p.piece_id,p.set_id,p.class_type,p.slot,p.name_male,p.name_female,p.defense," +
                           "p.fire_res,p.water_res,p.thunder_res,p.ice_res,p.dragon_res,p.deco_slots,p.cost," +
                           "s.name,s.rank,s.rarity,s.gender_exclusive,s.has_paired_names,p.max_defense " +
                           "FROM armor_pieces p JOIN armor_sets s ON s.id=p.set_id " + where))
        {
            foreach (var (k, v) in ps) P(c, k, v);
            using var r = c.ExecuteReader();
            while (r.Read())
            {
                var id = r.GetInt64(0);
                outp.Add(new ArmorPiece
                {
                    SetId = r.GetString(1),
                    ClassType = r.GetString(2),
                    Slot = r.GetString(3),
                    NameMale = r.GetString(4),
                    NameFemale = r.GetString(5),
                    Defense = r.GetInt32(6),
                    MaxDefense = r.GetInt32(19),
                    FireRes = r.GetInt32(7),
                    WaterRes = r.GetInt32(8),
                    ThunderRes = r.GetInt32(9),
                    IceRes = r.GetInt32(10),
                    DragonRes = r.GetInt32(11),
                    DecoSlots = r.GetInt32(12),
                    Cost = r.GetInt32(13),
                    SetName = r.GetString(14),
                    Rank = r.GetString(15),
                    Rarity = r.GetInt32(16),
                    GenderExclusive = r.IsDBNull(17) ? null : r.GetString(17),
                    HasPairedNames = r.GetInt32(18) != 0,
                    SkillPoints = skills.GetValueOrDefault(id) ?? new List<SkillPoint>(),
                    Materials = mats.GetValueOrDefault(id) ?? new List<string>(),
                });
            }
        }
        return outp;
    }

    private static IReadOnlyList<ArmorPiece> OrderBySlot(IEnumerable<ArmorPiece> pieces)
    {
        var order = ArmorConstants.SlotNames;
        return pieces.OrderBy(p => Array.IndexOf(order, p.Slot)).ToList();
    }

    // ── Quests / Gathering ────────────────────────────────────────────────────
    public List<ItemRow> GetItems()
    {
        var outp = new List<ItemRow>();
        using var c = Cmd("SELECT category,name,icon,rarity,capacity,value,pokke_value,description FROM items ORDER BY sort_order");
        using var r = c.ExecuteReader();
        while (r.Read())
            outp.Add(new ItemRow(r.GetString(0), r.GetString(1), r.GetString(2),
                r.GetString(3), r.GetString(4), r.GetString(5), r.GetString(6), r.GetString(7)));
        return outp;
    }

    public List<CombinationRow> GetCombinations()
    {
        var outp = new List<CombinationRow>();
        using var c = Cmd("SELECT section,product,item1,item2,pct,qty FROM combinations ORDER BY sort_order");
        using var r = c.ExecuteReader();
        while (r.Read())
            outp.Add(new CombinationRow(r.GetString(0), r.GetString(1), r.GetString(2),
                r.GetString(3), r.GetString(4), r.GetString(5)));
        return outp;
    }

    public List<TreasureRow> GetTreasures()
    {
        var outp = new List<TreasureRow>();
        using var c = Cmd("SELECT area,name,description,where_to_find,points,rarity,icon,is_award FROM treasures ORDER BY sort_order");
        using var r = c.ExecuteReader();
        while (r.Read())
            outp.Add(new TreasureRow(r.GetString(0), r.GetString(1), r.GetString(2), r.GetString(3),
                r.GetString(4), r.GetString(5), r.GetString(6), r.GetInt32(7) != 0));
        return outp;
    }

    public List<FoodRecipeRow> GetFoodRecipes()
    {
        var outp = new List<FoodRecipeRow>();
        using var c = Cmd("SELECT chefs,ingredient1,ingredient2,effect FROM food_recipes ORDER BY sort_order");
        using var r = c.ExecuteReader();
        while (r.Read())
            outp.Add(new FoodRecipeRow(r.GetInt32(0), r.GetString(1), r.GetString(2), r.GetString(3)));
        return outp;
    }

    public List<FoodIngredientRow> GetFoodIngredients()
    {
        var outp = new List<FoodIngredientRow>();
        using var c = Cmd("SELECT chefs,category,items FROM food_ingredients ORDER BY sort_order");
        using var r = c.ExecuteReader();
        while (r.Read())
            outp.Add(new FoodIngredientRow(r.GetInt32(0), r.GetString(1), r.GetString(2)));
        return outp;
    }

    public List<FelyneWhimRow> GetFelyneWhimSkills()
    {
        var outp = new List<FelyneWhimRow>();
        using var c = Cmd("SELECT name,description FROM felyne_whim_skills ORDER BY sort_order");
        using var r = c.ExecuteReader();
        while (r.Read())
            outp.Add(new FelyneWhimRow(r.GetString(0), r.GetString(1)));
        return outp;
    }

    public List<TrenyaItemRow> GetTrenyaItems()
    {
        var outp = new List<TrenyaItemRow>();
        using var c = Cmd("SELECT location,points,category,item FROM trenya_items ORDER BY sort_order");
        using var r = c.ExecuteReader();
        while (r.Read())
            outp.Add(new TrenyaItemRow(r.GetString(0), r.GetInt32(1), r.GetString(2), r.GetString(3)));
        return outp;
    }

    public List<PokkeItemRow> GetPokkeItems()
    {
        var outp = new List<PokkeItemRow>();
        using var c = Cmd("SELECT area,group_label,group_note,item,item_note FROM pokke_items ORDER BY sort_order");
        using var r = c.ExecuteReader();
        while (r.Read())
            outp.Add(new PokkeItemRow(r.GetString(0), r.GetString(1), r.GetString(2),
                r.GetString(3), r.GetString(4)));
        return outp;
    }

    public List<AwardRow> GetAwards()
    {
        var outp = new List<AwardRow>();
        using var c = Cmd("SELECT name,description,condition,icon FROM awards ORDER BY sort_order");
        using var r = c.ExecuteReader();
        while (r.Read())
            outp.Add(new AwardRow(r.GetString(0), r.GetString(1), r.GetString(2), r.GetString(3)));
        return outp;
    }

    /// <summary>Crafting-material name → tinted sprite basename (e.g. "Akantor Claw" → "claw_gray").</summary>
    public Dictionary<string, string> GetMaterialIcons()
    {
        var outp = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        using var c = Cmd("SELECT name,sprite FROM material_icons");
        using var r = c.ExecuteReader();
        while (r.Read()) outp[r.GetString(0)] = r.GetString(1);
        return outp;
    }

    public List<NamedDoc> GetQuestCategories() => GetNamedDocs("quest_categories", "category");
    public JsonObject? GetQuestDoc(string slug) => GetDoc("SELECT doc_json FROM quest_categories WHERE slug=$k", slug);

    public List<NamedDoc> GetGatheringAreas() => GetNamedDocs("gathering_areas", "area");
    public JsonObject? GetGatheringDoc(string slug) => GetDoc("SELECT doc_json FROM gathering_areas WHERE slug=$k", slug);

    private List<NamedDoc> GetNamedDocs(string table, string titleCol)
    {
        var outp = new List<NamedDoc>();
        using var c = Cmd($"SELECT slug,{titleCol} FROM {table} ORDER BY sort_order");
        using var r = c.ExecuteReader();
        while (r.Read()) outp.Add(new NamedDoc(r.GetString(0), r.GetString(1)));
        return outp;
    }

    // ── App meta / settings / saved sets ──────────────────────────────────────
    public string? GetMeta(string key)
    {
        using var c = Cmd("SELECT value FROM app_meta WHERE key=$k");
        P(c, "$k", key);
        return c.ExecuteScalar() as string;
    }

    /// <summary>The Hunting Horn song catalogue + note-set map, parsed from app_meta. Null if absent.</summary>
    public Domain.HuntingHornSongs? GetHuntingHornSongs()
    {
        var songs = GetMeta("hh_songs");
        var map = GetMeta("hh_songmap");
        return songs is null || map is null ? null : Domain.HuntingHornSongs.Parse(songs, map);
    }

    public string? GetSetting(string key)
    {
        using var c = Cmd("SELECT value FROM settings WHERE key=$k");
        P(c, "$k", key);
        return c.ExecuteScalar() as string;
    }

    public void SetSetting(string key, string value)
    {
        using var c = Cmd("INSERT OR REPLACE INTO settings(key,value) VALUES($k,$v)");
        P(c, "$k", key); P(c, "$v", value);
        c.ExecuteNonQuery();
    }

    // ── User notes (per weapon / monster) ─────────────────────────────────────
    /// <summary>The user's note for an entity ("weapon"/"monster" + its id), or "" if none.</summary>
    public string GetUserNote(string type, string id)
    {
        using var c = Cmd("SELECT note FROM user_notes WHERE entity_type=$t AND entity_id=$i");
        P(c, "$t", type); P(c, "$i", id);
        return c.ExecuteScalar() as string ?? "";
    }

    /// <summary>Save (or, if blank, clear) the user's note for an entity.</summary>
    public void SetUserNote(string type, string id, string note)
    {
        note = (note ?? "").Trim();
        if (note.Length == 0)
        {
            using var d = Cmd("DELETE FROM user_notes WHERE entity_type=$t AND entity_id=$i");
            P(d, "$t", type); P(d, "$i", id); d.ExecuteNonQuery();
            return;
        }
        using var c = Cmd("INSERT OR REPLACE INTO user_notes(entity_type,entity_id,note) VALUES($t,$i,$n)");
        P(c, "$t", type); P(c, "$i", id); P(c, "$n", note); c.ExecuteNonQuery();
    }

    /// <summary>Notes for entity types with a normalised name column (monster, weapon, armor set),
    /// resolved to name + category, for the Notes tab. Quest notes carry their name in the id, so they
    /// are read separately via <see cref="GetUserNotesByType"/> and resolved in the app layer.</summary>
    public List<UserNoteRow> GetUserNotes()
    {
        var outp = new List<UserNoteRow>();
        using (var c = Cmd("SELECT n.entity_id, m.name, m.type, n.note FROM user_notes n "
            + "JOIN monsters m ON m.id = n.entity_id WHERE n.entity_type='monster' ORDER BY m.name"))
        using (var r = c.ExecuteReader())
            while (r.Read()) outp.Add(new UserNoteRow("monster", r.GetString(0), r.GetString(1), r.GetString(2), r.GetString(3)));
        using (var c = Cmd("SELECT n.entity_id, w.name, w.type, n.note, "
            + "CAST(json_extract(w.doc_json, '$.rarity') AS INTEGER) FROM user_notes n "
            + "JOIN weapons w ON w.weapon_pk = CAST(n.entity_id AS INTEGER) WHERE n.entity_type='weapon' "
            + "ORDER BY w.type, w.name"))
        using (var r = c.ExecuteReader())
            while (r.Read()) outp.Add(new UserNoteRow("weapon", r.GetString(0), r.GetString(1), r.GetString(2), r.GetString(3), r.IsDBNull(4) ? 0 : r.GetInt32(4)));
        using (var c = Cmd("SELECT n.entity_id, a.name, a.rank, n.note, a.rarity FROM user_notes n "
            + "JOIN armor_sets a ON a.id = n.entity_id WHERE n.entity_type='armorset' ORDER BY a.name"))
        using (var r = c.ExecuteReader())
            while (r.Read()) outp.Add(new UserNoteRow("armorset", r.GetString(0), r.GetString(1), r.GetString(2), r.GetString(3), r.IsDBNull(4) ? 0 : r.GetInt32(4)));
        return outp;
    }

    /// <summary>Raw (entity_id, note) pairs for a note type that isn't resolvable via a SQL join
    /// (e.g. quests, whose display name is encoded in the id and decoded in the app layer).</summary>
    public List<(string EntityId, string Note)> GetUserNotesByType(string type)
    {
        var outp = new List<(string, string)>();
        using var c = Cmd("SELECT entity_id, note FROM user_notes WHERE entity_type=$t ORDER BY entity_id");
        P(c, "$t", type);
        using var r = c.ExecuteReader();
        while (r.Read()) outp.Add((r.GetString(0), r.GetString(1)));
        return outp;
    }

    /// <summary>Returns the id of the first target monster for a quest (category slug + quest name),
    /// or "" if the quest has no monsters array or the name isn't in the monsters table.</summary>
    public string GetQuestFirstMonsterId(string slug, string questName)
    {
        string? json = null;
        using (var c = Cmd("SELECT doc_json FROM quest_categories WHERE slug=$s"))
        {
            P(c, "$s", slug);
            using var r = c.ExecuteReader();
            if (r.Read() && !r.IsDBNull(0)) json = r.GetString(0);
        }
        if (json is null) return "";
        try
        {
            var doc = JsonNode.Parse(json);
            foreach (var rank in doc?["ranks"]?.AsArray() ?? new JsonArray())
            foreach (var quest in rank?["quests"]?.AsArray() ?? new JsonArray())
            {
                if (quest?["name"]?.ToString() != questName) continue;
                var firstName = quest["monsters"]?.AsArray().FirstOrDefault()?.ToString();
                if (string.IsNullOrEmpty(firstName)) return "";
                using var c2 = Cmd("SELECT id FROM monsters WHERE name=$n LIMIT 1");
                P(c2, "$n", firstName);
                using var r2 = c2.ExecuteReader();
                return r2.Read() ? r2.GetString(0) : "";
            }
        }
        catch { }
        return "";
    }

    // ── Bookmarks (per monster / weapon / item / armor set / decoration / quest / treasure) ────
    /// <summary>Whether the user has bookmarked this entity ("type" + its id).</summary>
    public bool IsBookmarked(string type, string id)
    {
        using var c = Cmd("SELECT 1 FROM bookmarks WHERE entity_type=$t AND entity_id=$i");
        P(c, "$t", type); P(c, "$i", id);
        return c.ExecuteScalar() is not null;
    }

    /// <summary>Add a bookmark (appended after existing ones); no-op if already present.</summary>
    public void AddBookmark(string type, string id, string name, string icon = "")
    {
        using var c = Cmd("INSERT OR IGNORE INTO bookmarks(entity_type,entity_id,name,icon,sort_order) "
            + "VALUES($t,$i,$n,$ic,(SELECT COALESCE(MAX(sort_order),0)+1 FROM bookmarks))");
        P(c, "$t", type); P(c, "$i", id); P(c, "$n", name); P(c, "$ic", icon);
        c.ExecuteNonQuery();
    }

    public void RemoveBookmark(string type, string id)
    {
        using var c = Cmd("DELETE FROM bookmarks WHERE entity_type=$t AND entity_id=$i");
        P(c, "$t", type); P(c, "$i", id);
        c.ExecuteNonQuery();
    }

    /// <summary>All bookmarks in the order they were added (newest last).</summary>
    public List<BookmarkRow> GetBookmarks()
    {
        var outp = new List<BookmarkRow>();
        using var c = Cmd("SELECT entity_type,entity_id,name,icon FROM bookmarks ORDER BY sort_order");
        using var r = c.ExecuteReader();
        while (r.Read()) outp.Add(new BookmarkRow(r.GetString(0), r.GetString(1), r.GetString(2), r.GetString(3)));
        return outp;
    }

    private JsonObject? GetDoc(string sql, string key)
    {
        using var c = Cmd(sql);
        P(c, "$k", key);
        return c.ExecuteScalar() is string s ? JsonNode.Parse(s) as JsonObject : null;
    }

    // ── Material index (built from the document blobs) ────────────────────────
    public MaterialIndex BuildMaterialIndex()
    {
        List<JsonObject> Docs(string table)
        {
            var outp = new List<JsonObject>();
            using var c = Cmd($"SELECT doc_json FROM {table}");
            using var r = c.ExecuteReader();
            while (r.Read())
                if (JsonNode.Parse(r.GetString(0)) is JsonObject o) outp.Add(o);
            return outp;
        }
        return MaterialIndex.BuildFromData(Docs("quest_categories"), Docs("monsters"), Docs("gathering_areas"));
    }
}
