using System.Text.Json.Nodes;
using MhfuLookup.Core.Domain;
using Microsoft.Data.Sqlite;

namespace MhfuLookup.Core.Data;

/// <summary>
/// Builds mhfu.db from the Python project's data/ JSON tree. Reuses the ported
/// domain loaders so the DB stores clean, canonical data (flattened armor pieces
/// with class-split material fallback, canonical skill ids, etc.).
/// </summary>
public sealed class DatabaseBuilder
{
    private readonly SqliteConnection _conn;
    private readonly string _data;

    private DatabaseBuilder(SqliteConnection conn, string dataDir)
    {
        _conn = conn;
        _data = dataDir;
    }

    /// <summary>Create a fresh mhfu.db at <paramref name="dbPath"/> from <paramref name="dataDir"/>.</summary>
    public static void Build(string dataDir, string dbPath)
    {
        Directory.CreateDirectory(Path.GetDirectoryName(Path.GetFullPath(dbPath))!);
        if (File.Exists(dbPath)) File.Delete(dbPath);

        using var conn = Db.Open(dbPath);
        Db.CreateSchema(conn);
        var builder = new DatabaseBuilder(conn, dataDir);
        using var tx = conn.BeginTransaction();
        builder.Run(tx);
        tx.Commit();
    }

    private string V2(string name) => Path.Combine(_data, "v2", name);
    private static JsonObject Obj(JsonNode n) => n.AsObject();
    private static string S(JsonNode? n) => Clean(n.AsStringOr());
    private static int I(JsonNode? n, int d = 0) => n.AsIntOr(d);

    // Decode HTML entities left over from wiki scraping (e.g. "&amp;" → "&", "&lt;" → "<")
    // and normalise non-breaking spaces, so stored text is clean.
    private static string Clean(string s) =>
        System.Net.WebUtility.HtmlDecode(s).Replace((char)0xA0, ' ');

    private void Run(SqliteTransaction tx)
    {
        Skills(tx);
        Decorations(tx);
        Armor(tx);
        Weapons(tx);
        Monsters(tx);
        Quests(tx);
        Gathering(tx);
        Items(tx);
        Combinations(tx);
        Treasures(tx);
        FoodRecipes(tx);
        FelyneWhim(tx);
        Trenya(tx);
        Pokke(tx);
        Awards(tx);
        MaterialIcons(tx);
        AppMeta(tx);
        WeaponNotes(tx);
        Settings(tx);
    }

    private SqliteCommand Cmd(SqliteTransaction tx, string sql)
    {
        var c = _conn.CreateCommand();
        c.Transaction = tx;
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

    private void Skills(SqliteTransaction tx)
    {
        var registry = SkillRegistry.FromFile(V2("armor_skills_v2.json"));
        using var ins = Cmd(tx,
            "INSERT INTO skills(id,name,category,description,is_special,has_decoration) VALUES($id,$n,$c,$d,$s,$h)");
        using var insLv = Cmd(tx,
            "INSERT INTO skill_levels(skill_id,sort_order,points,name,description) VALUES($sid,$o,$p,$n,$d)");
        foreach (var (id, sk) in registry.ById)
        {
            ins.Parameters.Clear();
            P(ins, "$id", id); P(ins, "$n", sk.Name); P(ins, "$c", sk.Category);
            P(ins, "$d", sk.Description); P(ins, "$s", sk.IsSpecial ? 1 : 0); P(ins, "$h", sk.HasDecoration ? 1 : 0);
            ins.ExecuteNonQuery();
            for (var i = 0; i < sk.Levels.Count; i++)
            {
                var lv = sk.Levels[i];
                insLv.Parameters.Clear();
                P(insLv, "$sid", id); P(insLv, "$o", i); P(insLv, "$p", lv.Points);
                P(insLv, "$n", lv.Name); P(insLv, "$d", lv.Description);
                insLv.ExecuteNonQuery();
            }
        }
    }

    private void Decorations(SqliteTransaction tx)
    {
        var catalog = DecorationCatalog.FromFile(V2("decorations_v2.json"));

        // Per-jewel tint colour (blacksmith palette), keyed by exact decoration name.
        var colors = new Dictionary<string, string>(StringComparer.Ordinal);
        var colorPath = Path.Combine(_data, "decoration_colors.json");
        if (File.Exists(colorPath) && JsonUtil.ParseFile(colorPath) is JsonObject co)
            foreach (var kv in co)
                if (kv.Value is not null) colors[kv.Key] = kv.Value.ToString();

        using var ins = Cmd(tx, "INSERT INTO decorations(id,name,slot_cost,cost,color) VALUES($id,$n,$s,$c,$col)");
        using var insE = Cmd(tx, "INSERT INTO decoration_skill_effects(deco_id,skill_id,points) VALUES($id,$s,$p)");
        using var insR = Cmd(tx, "INSERT INTO decoration_recipes(deco_id,recipe_index,materials_json) VALUES($id,$i,$m)");
        foreach (var d in catalog.All)
        {
            ins.Parameters.Clear();
            P(ins, "$id", d.Id); P(ins, "$n", d.Name); P(ins, "$s", d.SlotCost); P(ins, "$c", d.Cost);
            P(ins, "$col", colors.GetValueOrDefault(d.Name, ""));
            ins.ExecuteNonQuery();
            foreach (var (sid, pts) in d.SkillEffects)
            {
                insE.Parameters.Clear();
                P(insE, "$id", d.Id); P(insE, "$s", sid); P(insE, "$p", pts);
                insE.ExecuteNonQuery();
            }
            for (var i = 0; i < d.Recipes.Count; i++)
            {
                insR.Parameters.Clear();
                P(insR, "$id", d.Id); P(insR, "$i", i);
                P(insR, "$m", new JsonArray(d.Recipes[i].Select(m => (JsonNode)m!).ToArray()).ToJsonString());
                insR.ExecuteNonQuery();
            }
        }
    }

    private void Armor(SqliteTransaction tx)
    {
        var registry = SkillRegistry.FromFile(V2("armor_skills_v2.json"));
        var rawNode = JsonUtil.ParseFile(V2("armor_sets_v2.json"));
        var sets = rawNode is JsonObject ro && ro["sets"] is JsonArray a ? a : rawNode.AsArray();

        using var insSet = Cmd(tx,
            "INSERT INTO armor_sets(id,name,rank,rarity,class_split,gender_exclusive,has_paired_names,sort_order) " +
            "VALUES($id,$n,$r,$ra,$cs,$g,$h,$o)");
        using var insVar = Cmd(tx,
            "INSERT INTO armor_variants(set_id,class_type,activated_skills_json) VALUES($id,$c,$a)");

        var sortOrder = 0;
        foreach (var node in sets)
        {
            if (node is not JsonObject s) continue;
            var classSplit = s["class_split"].AsBool();
            insSet.Parameters.Clear();
            P(insSet, "$id", S(s["id"])); P(insSet, "$n", S(s["name"])); P(insSet, "$r", S(s["rank"]));
            P(insSet, "$ra", I(s["rarity"], 1)); P(insSet, "$cs", classSplit ? 1 : 0);
            P(insSet, "$g", s["gender_exclusive"] is JsonNode g && g.GetValueKind() == System.Text.Json.JsonValueKind.String ? g.GetValue<string>() : null);
            P(insSet, "$h", s["has_paired_names"].AsBool() ? 1 : 0); P(insSet, "$o", sortOrder++);
            insSet.ExecuteNonQuery();

            void Variant(string classType, string blockKey)
            {
                if (s[blockKey] is not JsonObject block) return;
                var activated = new JsonArray();
                if (block["activated_skills"] is JsonArray rawAct)
                    foreach (var a in rawAct) activated.Add(Clean(a.AsStringOr()));
                insVar.Parameters.Clear();
                P(insVar, "$id", S(s["id"])); P(insVar, "$c", classType);
                P(insVar, "$a", activated.ToJsonString());
                insVar.ExecuteNonQuery();
            }
            if (classSplit) { Variant("Blademaster", "blademaster"); Variant("Gunner", "gunner"); }
            else Variant(ArmorLoader.SharedClass(s), "shared");
        }

        var pieces = ArmorLoader.LoadFromNode(rawNode, registry);
        using var insP = Cmd(tx,
            "INSERT INTO armor_pieces(piece_id,set_id,class_type,slot,name_male,name_female,defense,max_defense," +
            "fire_res,water_res,thunder_res,ice_res,dragon_res,deco_slots,cost) " +
            "VALUES($pid,$set,$ct,$slot,$nm,$nf,$def,$mdef,$fr,$wr,$tr,$ir,$dr,$ds,$cost)");
        using var insPS = Cmd(tx, "INSERT INTO armor_piece_skill_points(piece_id,skill_id,points) VALUES($pid,$s,$p)");
        using var insPM = Cmd(tx, "INSERT INTO armor_piece_materials(piece_id,idx,material) VALUES($pid,$i,$m)");
        var pieceId = 0;
        foreach (var p in pieces)
        {
            pieceId++;
            insP.Parameters.Clear();
            P(insP, "$pid", pieceId); P(insP, "$set", p.SetId); P(insP, "$ct", p.ClassType); P(insP, "$slot", p.Slot);
            P(insP, "$nm", p.NameMale); P(insP, "$nf", p.NameFemale); P(insP, "$def", p.Defense); P(insP, "$mdef", p.MaxDefense);
            P(insP, "$fr", p.FireRes); P(insP, "$wr", p.WaterRes); P(insP, "$tr", p.ThunderRes);
            P(insP, "$ir", p.IceRes); P(insP, "$dr", p.DragonRes); P(insP, "$ds", p.DecoSlots); P(insP, "$cost", p.Cost);
            insP.ExecuteNonQuery();
            foreach (var sp in p.SkillPoints)
            {
                insPS.Parameters.Clear();
                P(insPS, "$pid", pieceId); P(insPS, "$s", sp.Sid); P(insPS, "$p", sp.Points);
                insPS.ExecuteNonQuery();
            }
            for (var i = 0; i < p.Materials.Count; i++)
            {
                insPM.Parameters.Clear();
                P(insPM, "$pid", pieceId); P(insPM, "$i", i); P(insPM, "$m", p.Materials[i]);
                insPM.ExecuteNonQuery();
            }
        }
    }

    private static readonly (string File, string Label)[] WeaponFiles =
    {
        ("greatsword.json", "Great Sword"),
        ("sword_and_shield.json", "Sword & Shield"),
        ("dual_blades.json", "Dual Blades"),
        ("longsword.json", "Long Sword"),
        ("hammer.json", "Hammer"),
        ("hunting_horn.json", "Hunting Horn"),
        ("lance.json", "Lance"),
        ("gl.json", "Gunlance"),
        ("bow.json", "Bow"),
        ("lbg.json", "Light Bowgun"),
        ("hbg.json", "Heavy Bowgun"),
    };

    private void Weapons(SqliteTransaction tx)
    {
        using var ins = Cmd(tx,
            "INSERT INTO weapons(id,type,name,atk,affinity,slots,price,upgrades_from,sort_order,doc_json) " +
            "VALUES($id,$t,$n,$a,$af,$s,$p,$u,$o,$doc)");
        foreach (var (file, label) in WeaponFiles)
        {
            var path = Path.Combine(_data, "weapons", file);
            if (!File.Exists(path)) continue;
            var arr = JsonUtil.ParseFile(path).AsArray();
            var order = 0;
            foreach (var node in arr)
            {
                if (node is not JsonObject w) continue;
                ins.Parameters.Clear();
                P(ins, "$id", S(w["id"])); P(ins, "$t", label); P(ins, "$n", S(w["name"]));
                P(ins, "$a", I(w["atk"])); P(ins, "$af", I(w["affinity"])); P(ins, "$s", I(w["slots"]));
                P(ins, "$p", I(w["price"]));
                P(ins, "$u", w["upgrades_from"] is JsonNode u && u.GetValueKind() == System.Text.Json.JsonValueKind.String ? u.GetValue<string>() : null);
                P(ins, "$o", order++);
                P(ins, "$doc", w.ToJsonString());
                ins.ExecuteNonQuery();
            }
        }
    }

    private void Monsters(SqliteTransaction tx)
    {
        using var ins = Cmd(tx, "INSERT INTO monsters(id,name,type,doc_json) VALUES($id,$n,$t,$doc)");
        foreach (var path in Directory.GetFiles(Path.Combine(_data, "monsters"), "*.json").OrderBy(x => x, StringComparer.Ordinal))
        {
            var text = File.ReadAllText(path);
            var o = Obj(JsonUtil.Parse(text));
            ins.Parameters.Clear();
            P(ins, "$id", S(o["id"])); P(ins, "$n", S(o["name"])); P(ins, "$t", S(o["type"])); P(ins, "$doc", text);
            ins.ExecuteNonQuery();
        }
    }

    private void Quests(SqliteTransaction tx)
    {
        using var ins = Cmd(tx, "INSERT INTO quest_categories(slug,category,sort_order,doc_json) VALUES($s,$c,$o,$doc)");
        var order = 0;
        foreach (var path in Directory.GetFiles(Path.Combine(_data, "quests"), "*.json").OrderBy(x => x, StringComparer.Ordinal))
        {
            var text = File.ReadAllText(path);
            var o = Obj(JsonUtil.Parse(text));
            ins.Parameters.Clear();
            P(ins, "$s", Path.GetFileNameWithoutExtension(path)); P(ins, "$c", S(o["category"]));
            P(ins, "$o", order++); P(ins, "$doc", text);
            ins.ExecuteNonQuery();
        }
    }

    private void Gathering(SqliteTransaction tx)
    {
        using var ins = Cmd(tx, "INSERT INTO gathering_areas(slug,area,sort_order,doc_json) VALUES($s,$a,$o,$doc)");
        var order = 0;
        foreach (var path in Directory.GetFiles(Path.Combine(_data, "gathering"), "*.json").OrderBy(x => x, StringComparer.Ordinal))
        {
            var text = File.ReadAllText(path);
            var o = Obj(JsonUtil.Parse(text));
            ins.Parameters.Clear();
            P(ins, "$s", Path.GetFileNameWithoutExtension(path)); P(ins, "$a", S(o["area"]));
            P(ins, "$o", order++); P(ins, "$doc", text);
            ins.ExecuteNonQuery();
        }
    }

    private void Items(SqliteTransaction tx)
    {
        var path = Path.Combine(_data, "items.json");
        if (!File.Exists(path)) return;
        var node = JsonUtil.ParseFile(path);
        var arr = node is JsonObject o && o["items"] is JsonArray a ? a : node.AsArray();

        // Account-item Pokke-point values (keyed by exact item name). Items in this map that sit in
        // the catch-all "Supply & Account Items" category split out to "Account Items"; the rest of
        // that category become "Supply Items".
        var pokke = new Dictionary<string, string>(StringComparer.Ordinal);
        var pokkePath = Path.Combine(_data, "account_items.json");
        if (File.Exists(pokkePath) && JsonUtil.ParseFile(pokkePath) is JsonObject pm)
            foreach (var kv in pm)
                if (kv.Value is not null) pokke[kv.Key] = kv.Value.ToString();

        using var ins = Cmd(tx,
            "INSERT INTO items(id,category,name,icon,rarity,capacity,value,pokke_value,description,sort_order) " +
            "VALUES($id,$c,$n,$ic,$r,$cap,$v,$pv,$d,$o)");
        var id = 0;
        foreach (var it in arr.OfType<JsonObject>())
        {
            id++;
            var name = S(it["name"]);
            var category = S(it["category"]);
            var isAccount = pokke.TryGetValue(name, out var pv);
            if (category == "Supply & Account Items")
                category = isAccount ? "Account Items" : "Supply Items";

            ins.Parameters.Clear();
            P(ins, "$id", id); P(ins, "$c", category); P(ins, "$n", name);
            P(ins, "$ic", S(it["icon"])); P(ins, "$r", S(it["rarity"])); P(ins, "$cap", S(it["capacity"]));
            P(ins, "$v", S(it["value"])); P(ins, "$pv", isAccount ? pv : "");
            P(ins, "$d", S(it["description"])); P(ins, "$o", I(it["sort_order"]));
            ins.ExecuteNonQuery();
        }
    }

    private void Combinations(SqliteTransaction tx)
    {
        var path = Path.Combine(_data, "combos.json");
        if (!File.Exists(path)) return;
        var node = JsonUtil.ParseFile(path);
        var arr = node is JsonObject o && o["combos"] is JsonArray a ? a : node.AsArray();

        using var ins = Cmd(tx,
            "INSERT INTO combinations(id,section,product,item1,item2,pct,qty,sort_order) " +
            "VALUES($id,$s,$p,$i1,$i2,$pct,$q,$o)");
        var id = 0;
        foreach (var c in arr.OfType<JsonObject>())
        {
            id++;
            ins.Parameters.Clear();
            P(ins, "$id", id); P(ins, "$s", S(c["section"])); P(ins, "$p", S(c["product"]));
            P(ins, "$i1", S(c["item1"])); P(ins, "$i2", S(c["item2"]));
            P(ins, "$pct", S(c["pct"])); P(ins, "$q", S(c["qty"])); P(ins, "$o", I(c["sort_order"]));
            ins.ExecuteNonQuery();
        }
    }

    private void Treasures(SqliteTransaction tx)
    {
        var path = Path.Combine(_data, "treasures.json");
        if (!File.Exists(path)) return;
        var node = JsonUtil.ParseFile(path);
        var arr = node is JsonObject o && o["treasures"] is JsonArray a ? a : node.AsArray();

        using var ins = Cmd(tx,
            "INSERT INTO treasures(id,area,name,description,where_to_find,points,rarity,icon,is_award,sort_order) " +
            "VALUES($id,$a,$n,$d,$w,$p,$r,$ic,$aw,$o)");
        var id = 0;
        foreach (var t in arr.OfType<JsonObject>())
        {
            id++;
            ins.Parameters.Clear();
            P(ins, "$id", id); P(ins, "$a", S(t["area"])); P(ins, "$n", S(t["name"]));
            P(ins, "$d", S(t["description"])); P(ins, "$w", S(t["where_to_find"]));
            P(ins, "$p", S(t["points"])); P(ins, "$r", S(t["rarity"])); P(ins, "$ic", S(t["icon"]));
            P(ins, "$aw", I(t["is_award"])); P(ins, "$o", I(t["sort_order"]));
            ins.ExecuteNonQuery();
        }
    }

    private void FoodRecipes(SqliteTransaction tx)
    {
        var path = Path.Combine(_data, "food_recipes.json");
        if (!File.Exists(path)) return;
        var node = JsonUtil.ParseFile(path);
        var recipes = node is JsonObject o && o["recipes"] is JsonArray a ? a : node.AsArray();

        using (var ins = Cmd(tx,
            "INSERT INTO food_recipes(id,chefs,ingredient1,ingredient2,effect,sort_order) " +
            "VALUES($id,$c,$i1,$i2,$e,$o)"))
        {
            var id = 0;
            foreach (var f in recipes.OfType<JsonObject>())
            {
                id++;
                ins.Parameters.Clear();
                P(ins, "$id", id); P(ins, "$c", I(f["chefs"]));
                P(ins, "$i1", S(f["ingredient1"])); P(ins, "$i2", S(f["ingredient2"]));
                P(ins, "$e", S(f["effect"])); P(ins, "$o", I(f["sort_order"]));
                ins.ExecuteNonQuery();
            }
        }

        if (node is JsonObject obj && obj["ingredients"] is JsonArray ingredients)
        {
            using var ins = Cmd(tx,
                "INSERT INTO food_ingredients(id,chefs,category,items,sort_order) VALUES($id,$c,$cat,$it,$o)");
            var id = 0;
            foreach (var g in ingredients.OfType<JsonObject>())
            {
                id++;
                ins.Parameters.Clear();
                P(ins, "$id", id); P(ins, "$c", I(g["chefs"]));
                P(ins, "$cat", S(g["category"])); P(ins, "$it", S(g["items"])); P(ins, "$o", I(g["sort_order"]));
                ins.ExecuteNonQuery();
            }
        }
    }

    private void FelyneWhim(SqliteTransaction tx)
    {
        var path = Path.Combine(_data, "felyne_whim.json");
        if (!File.Exists(path)) return;
        var node = JsonUtil.ParseFile(path);
        var arr = node is JsonObject o && o["skills"] is JsonArray a ? a : node.AsArray();

        using var ins = Cmd(tx,
            "INSERT INTO felyne_whim_skills(id,name,description,sort_order) VALUES($id,$n,$d,$o)");
        var id = 0;
        foreach (var s in arr.OfType<JsonObject>())
        {
            id++;
            ins.Parameters.Clear();
            P(ins, "$id", id); P(ins, "$n", S(s["name"])); P(ins, "$d", S(s["description"])); P(ins, "$o", I(s["sort_order"]));
            ins.ExecuteNonQuery();
        }
    }

    private void Trenya(SqliteTransaction tx)
    {
        var path = Path.Combine(_data, "trenya.json");
        if (!File.Exists(path)) return;
        var node = JsonUtil.ParseFile(path);
        if (node is not JsonObject root || root["locations"] is not JsonArray locations) return;

        using var ins = Cmd(tx,
            "INSERT INTO trenya_items(id,location,points,category,item,sort_order) VALUES($id,$l,$p,$c,$i,$o)");
        var id = 0;
        foreach (var loc in locations.OfType<JsonObject>())
        {
            var location = S(loc["location"]);
            if (loc["tiers"] is not JsonArray tiers) continue;
            foreach (var tier in tiers.OfType<JsonObject>())
            {
                var points = I(tier["points"]);
                if (tier["categories"] is not JsonArray cats) continue;
                foreach (var cat in cats.OfType<JsonObject>())
                {
                    var category = S(cat["category"]);
                    if (cat["items"] is not JsonArray items) continue;
                    foreach (var it in items)
                    {
                        id++;
                        ins.Parameters.Clear();
                        P(ins, "$id", id); P(ins, "$l", location); P(ins, "$p", points);
                        P(ins, "$c", category); P(ins, "$i", Clean(it?.ToString() ?? "")); P(ins, "$o", id);
                        ins.ExecuteNonQuery();
                    }
                }
            }
        }
    }

    private void Pokke(SqliteTransaction tx)
    {
        var path = Path.Combine(_data, "pokke_farm.json");
        if (!File.Exists(path)) return;
        var node = JsonUtil.ParseFile(path);
        if (node is not JsonObject root || root["areas"] is not JsonArray areas) return;

        using var ins = Cmd(tx,
            "INSERT INTO pokke_items(id,area,group_label,group_note,item,item_note,sort_order) " +
            "VALUES($id,$a,$gl,$gn,$it,$inote,$o)");
        var id = 0;
        foreach (var area in areas.OfType<JsonObject>())
        {
            var areaName = S(area["area"]);
            if (area["groups"] is not JsonArray groups) continue;
            foreach (var g in groups.OfType<JsonObject>())
            {
                var label = S(g["label"]);
                var gnote = S(g["note"]);
                if (g["items"] is not JsonArray items) continue;
                foreach (var it in items.OfType<JsonObject>())
                {
                    id++;
                    ins.Parameters.Clear();
                    P(ins, "$id", id); P(ins, "$a", areaName); P(ins, "$gl", label); P(ins, "$gn", gnote);
                    P(ins, "$it", S(it["name"])); P(ins, "$inote", S(it["note"])); P(ins, "$o", id);
                    ins.ExecuteNonQuery();
                }
            }
        }
    }

    private void Awards(SqliteTransaction tx)
    {
        var path = Path.Combine(_data, "awards.json");
        if (!File.Exists(path)) return;
        var node = JsonUtil.ParseFile(path);
        var arr = node is JsonObject o && o["awards"] is JsonArray a ? a : node.AsArray();

        using var ins = Cmd(tx,
            "INSERT INTO awards(id,name,description,condition,icon,sort_order) VALUES($id,$n,$d,$c,$ic,$o)");
        var id = 0;
        foreach (var w in arr.OfType<JsonObject>())
        {
            id++;
            ins.Parameters.Clear();
            P(ins, "$id", id); P(ins, "$n", S(w["name"])); P(ins, "$d", S(w["description"]));
            P(ins, "$c", S(w["condition"])); P(ins, "$ic", S(w["icon"])); P(ins, "$o", id);
            ins.ExecuteNonQuery();
        }
    }

    private void MaterialIcons(SqliteTransaction tx)
    {
        var path = Path.Combine(_data, "material_icons.json");
        if (!File.Exists(path) || JsonUtil.ParseFile(path) is not JsonObject map) return;

        using var ins = Cmd(tx, "INSERT OR IGNORE INTO material_icons(name,sprite) VALUES($n,$s)");
        foreach (var kv in map)
        {
            if (kv.Value is null) continue;
            ins.Parameters.Clear();
            P(ins, "$n", kv.Key); P(ins, "$s", kv.Value.ToString());
            ins.ExecuteNonQuery();
        }
    }

    private void AppMeta(SqliteTransaction tx)
    {
        using var ins = Cmd(tx, "INSERT INTO app_meta(key,value) VALUES($k,$v)");
        void Put(string key, string file)
        {
            var path = Path.Combine(_data, file);
            if (!File.Exists(path)) return;
            ins.Parameters.Clear();
            P(ins, "$k", key); P(ins, "$v", File.ReadAllText(path));
            ins.ExecuteNonQuery();
        }
        Put("monster_order", "order.json");
        Put("hh_songs", "hunting_horn_songs.json");
        Put("hh_songmap", "hunting_horn_songmap.json");
    }

    private void WeaponNotes(SqliteTransaction tx)
    {
        var path = Path.Combine(_data, "weapon_notes.json");
        if (!File.Exists(path)) return;
        if (JsonUtil.ParseFile(path) is not JsonObject o) return;
        using var ins = Cmd(tx, "INSERT OR REPLACE INTO weapon_notes(weapon_id,note) VALUES($id,$n)");
        foreach (var (k, v) in o)
        {
            ins.Parameters.Clear();
            P(ins, "$id", k); P(ins, "$n", S(v));
            ins.ExecuteNonQuery();
        }
    }

    private void Settings(SqliteTransaction tx)
    {
        using var ins = Cmd(tx, "INSERT OR REPLACE INTO settings(key,value) VALUES($k,$v)");
        ins.Parameters.Clear();
        P(ins, "$k", "ui_scale"); P(ins, "$v", "1.0");
        ins.ExecuteNonQuery();
    }
}
