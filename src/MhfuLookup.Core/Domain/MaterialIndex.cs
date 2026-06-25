using System.Text.Json.Nodes;
using System.Text.RegularExpressions;
using MhfuLookup.Core.Models;

namespace MhfuLookup.Core.Domain;

/// <summary>
/// Material availability index: material → set of (hub, stars) sources.
/// Combines quest rewards, monster drops, and gathering nodes.
/// Mirrors src/material_index.py.
/// </summary>
public sealed partial class MaterialIndex
{
    private static readonly Dictionary<string, string> CategoryToHub = new()
    {
        ["Village Low Rank (Elder)"] = "Village",
        ["Village High Rank (Nekoht)"] = "Village",
        ["Guild Low Rank"] = "Guild",
        ["Guild High Rank"] = "Guild",
        ["Guild G Rank"] = "Guild G",
    };

    private static readonly Dictionary<string, string> MonsterRankToHub = new()
    {
        ["Elder"] = "Village",
        ["Nekoht"] = "Village",
        ["Low"] = "Guild",
        ["High"] = "Guild",
        ["G"] = "Guild G",
    };

    private static readonly Dictionary<string, HashSet<string>> TierRanks = new()
    {
        ["elder_guild_low"] = new() { "Elder", "Low" },
        ["guild_low_12"] = new() { "Low" },
        ["nekoht_guild_high"] = new() { "Nekoht", "High" },
        ["g_rank"] = new() { "G" },
    };

    private static readonly Dictionary<string, (string Hub, int Stars)[]> TierFallback = new()
    {
        ["elder_guild_low"] = new[] { ("Guild", 1) },
        ["guild_low_12"] = new[] { ("Guild", 1) },
        ["nekoht_guild_high"] = new[] { ("Guild", 6) },
        ["g_rank"] = new[] { ("Guild G", 1) },
    };

    private static readonly Dictionary<string, (string Hub, int Stars)[]> GatheringTierSources = new()
    {
        ["low"] = new[] { ("Village", 1), ("Guild", 1) },
        ["high"] = new[] { ("Village", 7), ("Guild", 6) },
        ["g_rank"] = new[] { ("Guild G", 1) },
        // "training" and "treasure" intentionally unmapped.
    };

    [GeneratedRegex(@"^(G)?(\d+)\s*★?$")]
    private static partial Regex LevelRegex();

    // Quest spelling → canonical monster file spelling.
    private static readonly Dictionary<string, string> MonsterAliases = new()
    {
        ["Ash Lao-Shan Lung"] = "Ashen Lao-Shan Lung",
        ["Ashen Lao-Shan Lung"] = "Ashen Lao-Shan Lung",
    };

    public IReadOnlyDictionary<string, MaterialAvailability> Materials { get; }
    public int FallbackCount { get; private set; }

    public MaterialIndex(IReadOnlyDictionary<string, MaterialAvailability> materials)
    {
        Materials = materials;
    }

    public MaterialAvailability? Availability(string material) =>
        Materials.GetValueOrDefault(MaterialNormalizer.CanonicalMaterial(material));

    public HashSet<string> UnsourcedMaterials(IEnumerable<ArmorPiece> armorPieces)
    {
        var outp = new HashSet<string>();
        foreach (var p in armorPieces)
            foreach (var raw in p.Materials)
            {
                var canon = MaterialNormalizer.CanonicalMaterial(MaterialNormalizer.StripCount(raw));
                if (canon.Length > 0 && !Materials.ContainsKey(canon)) outp.Add(canon);
            }
        return outp;
    }

    private static HashSet<string> AliasesOf(string monsterName)
    {
        var outp = new HashSet<string> { monsterName };
        foreach (var (src, dst) in MonsterAliases)
        {
            if (dst == monsterName) outp.Add(src);
            if (src == monsterName) outp.Add(dst);
        }
        return outp;
    }

    private static bool QuestFeaturesMonster(JsonObject quest, string monsterName)
    {
        var aliases = AliasesOf(monsterName);
        var listed = (quest["monsters"] as JsonArray)?.Select(x => x.AsStringOr()).ToList() ?? new List<string>();
        var normalized = new HashSet<string>(listed.Select(m => MonsterAliases.GetValueOrDefault(m, m)));
        normalized.UnionWith(listed);
        if (aliases.Overlaps(normalized)) return true;
        var objective = quest["objective"].AsStringOr().ToLowerInvariant();
        return aliases.Any(a => objective.Contains(a.ToLowerInvariant()));
    }

    private static int? ParseStars(string? level)
    {
        if (string.IsNullOrEmpty(level)) return null;
        var m = LevelRegex().Match(level);
        return m.Success ? int.Parse(m.Groups[2].Value) : null;
    }

    public static MaterialIndex BuildFromData(
        IReadOnlyList<JsonObject> questData,
        IReadOnlyList<JsonObject> monsterData,
        IReadOnlyList<JsonObject> gatheringData)
    {
        var materials = new Dictionary<string, MaterialAvailability>();
        var fallbackCount = 0;

        void Add(string name, string hub, int stars)
        {
            var canon = MaterialNormalizer.CanonicalMaterial(name);
            if (canon.Length == 0) return;
            if (!materials.TryGetValue(canon, out var avail))
            {
                avail = new MaterialAvailability(canon);
                materials[canon] = avail;
            }
            avail.Sources.Add(new HubProgress(hub, stars));
        }

        // A. Quest reward materials + (hub, stars, quest_name) → quest dict for cross-ref.
        var questLookup = new Dictionary<(string, int, string), JsonObject>();
        foreach (var qfile in questData)
        {
            if (!CategoryToHub.TryGetValue(qfile["category"].AsStringOr(), out var hub)) continue;
            if (qfile["ranks"] is not JsonArray ranks) continue;
            foreach (var rank in ranks.OfType<JsonObject>())
            {
                if (rank["stars"] is not JsonNode starsNode) continue;
                var stars = starsNode.AsIntOr(int.MinValue);
                if (stars == int.MinValue) continue;
                if (rank["quests"] is not JsonArray quests) continue;
                foreach (var q in quests.OfType<JsonObject>())
                {
                    if (q["rewards"] is JsonArray rewards)
                        foreach (var r in rewards)
                        {
                            var item = MaterialNormalizer.ExtractItemName(r);
                            if (item.Length > 0) Add(item, hub, stars);
                        }
                    var qname = q["name"].AsStringOr();
                    if (qname.Length > 0) questLookup[(hub, stars, qname)] = q;
                }
            }
        }

        // B. Monster drop materials, filtered against scripted appearances.
        foreach (var monster in monsterData)
        {
            var monsterName = monster["name"].AsStringOr();
            var entries = (monster["quests"] as JsonObject)?["entries"] as JsonArray;
            var questsByRank = new Dictionary<string, List<int>>();
            if (entries is not null)
                foreach (var e in entries.OfType<JsonObject>())
                {
                    var rk = e["rank"].AsStringOr();
                    var stars = ParseStars(e["level"].AsStringOr());
                    if (rk.Length == 0 || stars is null) continue;
                    if (MonsterRankToHub.TryGetValue(rk, out var hub))
                    {
                        var qname = e["quest"].AsStringOr();
                        if (qname.Length > 0 &&
                            questLookup.TryGetValue((hub, stars.Value, qname), out var quest) &&
                            !QuestFeaturesMonster(quest, monsterName))
                            continue;
                    }
                    if (!questsByRank.TryGetValue(rk, out var lst)) { lst = new(); questsByRank[rk] = lst; }
                    lst.Add(stars.Value);
                }

            foreach (var (tierKey, validRanks) in TierRanks)
            {
                var dropItems = GatherTierItems(monster, tierKey);
                if (dropItems.Count == 0) continue;

                var sources = new List<(string Hub, int Stars)>();
                foreach (var rk in validRanks)
                    if (MonsterRankToHub.TryGetValue(rk, out var hub) && questsByRank.TryGetValue(rk, out var starsList))
                        foreach (var stars in starsList)
                            sources.Add((hub, stars));

                if (sources.Count == 0 && TierFallback.TryGetValue(tierKey, out var fb))
                {
                    sources.AddRange(fb);
                    if (fb.Length > 0) fallbackCount++;
                }

                foreach (var item in dropItems)
                    foreach (var (hub, stars) in sources)
                        Add(item, hub, stars);
            }
        }

        // C. Gathering materials.
        foreach (var area in gatheringData)
        {
            if (area["zones"] is not JsonArray zones) continue;
            foreach (var zone in zones.OfType<JsonObject>())
            {
                if (zone["nodes"] is not JsonArray nodes) continue;
                foreach (var node in nodes.OfType<JsonObject>())
                    foreach (var (tierKey, sources) in GatheringTierSources)
                    {
                        if (node[tierKey] is not JsonArray items) continue;
                        foreach (var raw in items)
                        {
                            var item = MaterialNormalizer.ExtractItemName(raw);
                            if (item.Length == 0) continue;
                            foreach (var (hub, stars) in sources)
                                Add(item, hub, stars);
                        }
                    }
            }
        }

        return new MaterialIndex(materials) { FallbackCount = fallbackCount };
    }

    /// <summary>Collect item names from carve/capture/break/items sections at a tier.</summary>
    private static List<string> GatherTierItems(JsonObject monster, string tierKey)
    {
        var outp = new List<string>();
        foreach (var sectionKey in new[] { "carve", "capture", "break", "items" })
        {
            if (monster[sectionKey] is not JsonNode section) continue;
            if (section is JsonArray arr)
            {
                foreach (var part in arr.OfType<JsonObject>())
                    if (part[tierKey] is JsonArray entries)
                        foreach (var e in entries)
                        {
                            var n = MaterialNormalizer.ExtractItemName(e);
                            if (n.Length > 0) outp.Add(n);
                        }
            }
            else if (section is JsonObject so && so[tierKey] is JsonArray entries2)
            {
                foreach (var e in entries2)
                {
                    var n = MaterialNormalizer.ExtractItemName(e);
                    if (n.Length > 0) outp.Add(n);
                }
            }
        }
        return outp;
    }

    public static MaterialIndex LoadFromPaths(string questsDir, string monstersDir, string gatheringDir)
    {
        var quest = ReadDir(questsDir);
        var monster = ReadDir(monstersDir);
        var gathering = ReadDir(gatheringDir);
        return BuildFromData(quest, monster, gathering);
    }

    private static List<JsonObject> ReadDir(string dir)
    {
        var outp = new List<JsonObject>();
        if (!Directory.Exists(dir)) return outp;
        foreach (var p in Directory.GetFiles(dir, "*.json").OrderBy(x => x, StringComparer.Ordinal))
        {
            try
            {
                if (JsonNode.Parse(File.ReadAllText(p)) is JsonObject o) outp.Add(o);
            }
            catch { /* skip unreadable file, mirror Python warning */ }
        }
        return outp;
    }
}
