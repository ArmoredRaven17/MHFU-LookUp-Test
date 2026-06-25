using System.Text.Json.Nodes;
using System.Text.RegularExpressions;
using MhfuLookup.Core.Models;

namespace MhfuLookup.Core.Domain;

/// <summary>
/// Skill name → canonical id resolution and threshold lookup.
/// Mirrors src/skill_registry.py.
/// </summary>
public sealed partial class SkillRegistry
{
    // Decoration display labels that don't match a skill display name.
    private static readonly Dictionary<string, string> Aliases = new()
    {
        ["Ice Skill"] = "ice_res",
        ["WindPress"] = "windpress",
        ["Crag S Add"] = "crag_s_add",
        ["ClustS Add"] = "clusts_add",
        // v1 deco display labels for skills renamed in v2
        ["All Resist"] = "all_res",
        ["ThunderRes"] = "thunder_res",
    };

    [GeneratedRegex(@"^(.+?)\s*[+\-]\d+\s*$")]
    private static partial Regex DecoLabelRegex();

    private readonly Dictionary<string, Skill> _byId;
    private readonly Dictionary<string, string> _byName;

    public SkillRegistry(IReadOnlyDictionary<string, Skill> byId, IReadOnlyDictionary<string, string> byName)
    {
        _byId = new Dictionary<string, Skill>(byId);
        _byName = new Dictionary<string, string>(byName);
    }

    /// <summary>All skills keyed by canonical id.</summary>
    public IReadOnlyDictionary<string, Skill> ById => _byId;

    public static SkillRegistry FromFile(string path) => FromNode(JsonUtil.ParseFile(path));

    public static SkillRegistry FromJson(string json) => FromNode(JsonUtil.Parse(json));

    public static SkillRegistry FromNode(JsonNode raw)
    {
        // v2 schema wraps the list: {"skills": [...]}; v1 was a bare list.
        JsonArray list = raw is JsonObject obj && obj.TryGetPropertyValue("skills", out var sk) && sk is JsonArray a
            ? a
            : raw.AsArray();

        var byId = new Dictionary<string, Skill>();
        var byName = new Dictionary<string, string>();
        foreach (var node in list)
        {
            if (node is not JsonObject s) continue;
            var skill = ParseSkill(s);
            byId[skill.Id] = skill;
            byName[skill.Name] = skill.Id;
        }
        return new SkillRegistry(byId, byName);
    }

    private static Skill ParseSkill(JsonObject s)
    {
        var levels = new List<SkillLevel>();
        if (s.TryGetPropertyValue("levels", out var lv) && lv is JsonArray la)
            foreach (var l in la)
                if (l is JsonObject lo)
                    levels.Add(new SkillLevel(
                        lo["points"].AsIntOr(),
                        lo["name"].AsStringOr(),
                        lo["description"].AsStringOr()));

        return new Skill(
            Id: s["id"].AsStringOr(),
            Name: s["name"].AsStringOr(),
            Category: s["category"].AsStringOr(),
            Description: s["description"].AsStringOr(),
            IsSpecial: s["is_special"].AsBool(),
            HasDecoration: s["has_decoration"].AsBool(),
            Levels: levels);
    }

    /// <summary>
    /// Resolve a skill name (id, display name, or deco label) to its canonical id.
    /// Throws <see cref="KeyNotFoundException"/> if no match after applying aliases.
    /// </summary>
    public string CanonicalId(string name)
    {
        if (_byId.ContainsKey(name)) return name;
        if (_byName.TryGetValue(name, out var id)) return id;
        if (Aliases.TryGetValue(name, out var alias)) return alias;

        // Try stripping a trailing "+N" / "-N" (decoration label form).
        var m = DecoLabelRegex().Match(name);
        if (m.Success)
        {
            var stripped = m.Groups[1].Value.Trim();
            if (_byId.ContainsKey(stripped)) return stripped;
            if (_byName.TryGetValue(stripped, out var sid)) return sid;
            if (Aliases.TryGetValue(stripped, out var salias)) return salias;
        }
        throw new KeyNotFoundException(name);
    }

    /// <summary>Return (points, tier_name) in source order (v2 stores descending).</summary>
    public IReadOnlyList<(int Points, string Name)> Thresholds(string skillId)
    {
        if (!_byId.TryGetValue(skillId, out var entry))
            throw new KeyNotFoundException(skillId);
        return entry.Levels.Select(l => (l.Points, l.Name)).ToList();
    }

    /// <summary>Highest-tier activated name for a point total, or null.</summary>
    public string? ActivatedName(string skillId, int points)
    {
        var levels = Thresholds(skillId);
        if (points >= 0)
        {
            (int p, string n)? best = null;
            foreach (var (p, n) in levels)
                if (p > 0 && points >= p && (best is null || p > best.Value.p))
                    best = (p, n);
            return best?.n;
        }
        else
        {
            (int p, string n)? best = null;
            foreach (var (p, n) in levels)
                if (p < 0 && points <= p && (best is null || p < best.Value.p))
                    best = (p, n);
            return best?.n;
        }
    }

    public bool IsSpecialSkill(string skillId)
    {
        if (!_byId.TryGetValue(skillId, out var entry))
            throw new KeyNotFoundException(skillId);
        return entry.IsSpecial;
    }
}
