using System.Text.Json.Nodes;
using MhfuLookup.Core.Models;

namespace MhfuLookup.Core.Domain;

/// <summary>
/// Armor piece flattening: armor_sets v2 schema → list of ArmorPiece.
/// Mirrors src/armor.py.
/// </summary>
public static class ArmorLoader
{
    public static List<ArmorPiece> LoadFromFile(string path, SkillRegistry registry) =>
        LoadFromNode(JsonUtil.ParseFile(path), registry);

    public static List<ArmorPiece> LoadFromJson(string json, SkillRegistry registry) =>
        LoadFromNode(JsonUtil.Parse(json), registry);

    public static List<ArmorPiece> LoadFromNode(JsonNode raw, SkillRegistry registry)
    {
        JsonArray sets = raw is JsonObject obj && obj.TryGetPropertyValue("sets", out var s) && s is JsonArray a
            ? a
            : raw.AsArray();

        var pieces = new List<ArmorPiece>();
        foreach (var node in sets.OfType<JsonObject>())
        {
            if (node["class_split"].AsBool())
            {
                // Capture BM materials by slot so Gunner pieces with empty materials
                // can fall back to them — same set, same recipe in MHFU.
                var bmMatsBySlot = new Dictionary<string, List<string>>();
                if (node["blademaster"] is JsonObject bm && bm["pieces"] is JsonArray bmp)
                    foreach (var pd in bmp.OfType<JsonObject>())
                    {
                        var slot = pd["slot"].AsStringOr();
                        if (slot.Length > 0)
                            bmMatsBySlot[slot] = ReadMaterials(pd);
                    }

                foreach (var (classType, key) in new[] { ("Blademaster", "blademaster"), ("Gunner", "gunner") })
                {
                    if (node[key] is not JsonObject block || block["pieces"] is not JsonArray bpieces) continue;
                    foreach (var pieceData in bpieces.OfType<JsonObject>())
                    {
                        var fallback = classType == "Gunner" && ReadMaterials(pieceData).Count == 0
                            ? bmMatsBySlot.GetValueOrDefault(pieceData["slot"].AsStringOr())
                            : null;
                        var built = SafeBuild(node, pieceData, classType, registry, fallback);
                        if (built is not null) pieces.Add(built);
                    }
                }
            }
            else
            {
                if (node["shared"] is not JsonObject block || block["pieces"] is not JsonArray spieces) continue;
                var classType = SharedClass(node);
                foreach (var pieceData in spieces.OfType<JsonObject>())
                {
                    var built = SafeBuild(node, pieceData, classType, registry, null);
                    if (built is not null) pieces.Add(built);
                }
            }
        }
        return pieces;
    }

    /// <summary>
    /// Class allowed to wear a non-split set. Normally "Both"; a set may pin itself to a single
    /// class via a "class" field ("Blademaster"/"Gunner") — e.g. Steel, which the wiki lists only
    /// under Blademaster.
    /// </summary>
    public static string SharedClass(JsonObject set)
    {
        if (set["class"] is JsonNode c &&
            c.GetValueKind() == System.Text.Json.JsonValueKind.String)
        {
            var v = c.GetValue<string>();
            if (v is "Blademaster" or "Gunner") return v;
        }
        return "Both";
    }

    private static List<string> ReadMaterials(JsonObject pieceData)
    {
        var outp = new List<string>();
        if (pieceData["materials"] is JsonArray m)
            foreach (var x in m) outp.Add(x.AsStringOr());
        return outp;
    }

    private static ArmorPiece? SafeBuild(JsonObject setData, JsonObject pieceData, string classType,
        SkillRegistry registry, List<string>? materialsOverride)
    {
        try
        {
            return BuildPiece(setData, pieceData, classType, registry, materialsOverride);
        }
        catch (Exception ex) when (ex is KeyNotFoundException or FormatException or InvalidOperationException)
        {
            return null;  // mirror Python: drop malformed pieces
        }
    }

    private static ArmorPiece BuildPiece(JsonObject setData, JsonObject pieceData, string classType,
        SkillRegistry registry, List<string>? materialsOverride)
    {
        var slot = pieceData["slot"].AsStringOr();
        if (Array.IndexOf(ArmorConstants.SlotNames, slot) < 0)
            throw new InvalidOperationException($"unknown slot {slot}");

        var points = new List<SkillPoint>();
        if (pieceData["skill_points"] is JsonObject sp)
            foreach (var (k, v) in sp)
                points.Add(new SkillPoint(registry.CanonicalId(k), v.AsIntOr()));

        var materials = materialsOverride ?? ReadMaterials(pieceData);

        return new ArmorPiece
        {
            SetId = setData["id"].AsStringOr(),
            SetName = setData["name"].AsStringOr(),
            Slot = slot,
            ClassType = classType,
            Rank = setData["rank"].AsStringOr(),
            Rarity = setData["rarity"].AsIntOr(1),
            GenderExclusive = setData["gender_exclusive"] is JsonNode g
                && g.GetValueKind() == System.Text.Json.JsonValueKind.String
                ? g.GetValue<string>() : null,
            HasPairedNames = setData["has_paired_names"].AsBool(),
            NameMale = pieceData["name_male"].AsStringOr(),
            NameFemale = pieceData["name_female"].AsStringOr(),
            Defense = pieceData["defense"].AsIntOr(),
            MaxDefense = pieceData["max_defense"].AsIntOr(pieceData["defense"].AsIntOr()),
            FireRes = pieceData["fire_res"].AsIntOr(),
            WaterRes = pieceData["water_res"].AsIntOr(),
            ThunderRes = pieceData["thunder_res"].AsIntOr(),
            IceRes = pieceData["ice_res"].AsIntOr(),
            DragonRes = pieceData["dragon_res"].AsIntOr(),
            DecoSlots = pieceData["deco_slots"].AsIntOr(),
            SkillPoints = points,
            Materials = materials,
            Cost = pieceData["cost"].AsIntOr(),
        };
    }

    public static List<ArmorPiece> FilterByClass(IEnumerable<ArmorPiece> pieces, string requested)
    {
        if (requested is not ("Blademaster" or "Gunner"))
            throw new ArgumentException($"requested must be Blademaster or Gunner, got {requested}");
        return pieces.Where(p => p.ClassType == requested || p.ClassType == "Both").ToList();
    }

    public static List<ArmorPiece> FilterByGender(IEnumerable<ArmorPiece> pieces, string? gender)
    {
        if (gender is not ("Male" or "Female"))
            throw new ArgumentException($"gender must be 'Male' or 'Female'; got {gender}");
        var opposite = gender == "Male" ? "Female" : "Male";
        return pieces.Where(p => p.GenderExclusive != opposite).ToList();
    }

    public static Dictionary<string, List<ArmorPiece>> GroupBySlot(IEnumerable<ArmorPiece> pieces)
    {
        var outp = ArmorConstants.SlotNames.ToDictionary(s => s, _ => new List<ArmorPiece>());
        foreach (var p in pieces)
            if (outp.TryGetValue(p.Slot, out var lst)) lst.Add(p);
        return outp;
    }
}
