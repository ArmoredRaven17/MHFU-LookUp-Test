using System.Text.Json.Nodes;
using MhfuLookup.Core.Models;

namespace MhfuLookup.Core.Domain;

/// <summary>
/// All decorations with helpful search indices. Mirrors src/decorations.py:DecorationCatalog.
/// </summary>
public sealed class DecorationCatalog
{
    public IReadOnlyList<Decoration> All { get; }
    public IReadOnlyList<Decoration> PurePositive { get; }
    public IReadOnlyDictionary<int, List<Decoration>> BySlotSize { get; }
    public IReadOnlyDictionary<string, List<Decoration>> BySkillPositive { get; }

    public DecorationCatalog(IReadOnlyList<Decoration> decorations)
    {
        All = decorations;

        PurePositive = decorations.Where(d => d.SkillEffects.Values.All(v => v > 0)).ToList();

        var bySlot = new Dictionary<int, List<Decoration>> { [1] = new(), [2] = new(), [3] = new() };
        foreach (var d in decorations)
        {
            if (!bySlot.TryGetValue(d.SlotCost, out var lst)) { lst = new(); bySlot[d.SlotCost] = lst; }
            lst.Add(d);
        }
        BySlotSize = bySlot;

        var positive = new Dictionary<string, List<Decoration>>();
        foreach (var d in decorations)
            foreach (var (sid, pts) in d.SkillEffects)
                if (pts > 0)
                {
                    if (!positive.TryGetValue(sid, out var lst)) { lst = new(); positive[sid] = lst; }
                    lst.Add(d);
                }
        foreach (var (sid, decos) in positive)
            decos.Sort((a, b) => PointsPerSlot(b, sid).CompareTo(PointsPerSlot(a, sid)));  // descending efficiency
        BySkillPositive = positive;
    }

    private static double PointsPerSlot(Decoration deco, string sid) =>
        (deco.SkillEffects.TryGetValue(sid, out var p) ? p : 0) / (double)Math.Max(1, deco.SlotCost);

    public static DecorationCatalog FromFile(string path) => FromNode(JsonUtil.ParseFile(path));

    public static DecorationCatalog FromJson(string json) => FromNode(JsonUtil.Parse(json));

    public static DecorationCatalog FromNode(JsonNode raw)
    {
        JsonArray items = raw is JsonObject obj && obj.TryGetPropertyValue("decorations", out var d) && d is JsonArray a
            ? a
            : raw.AsArray();
        var decorations = items.OfType<JsonObject>().Select(Build).ToList();
        return new DecorationCatalog(decorations);
    }

    public static Decoration Build(JsonObject entry)
    {
        var recipes = new List<IReadOnlyList<string>>();
        if (entry.TryGetPropertyValue("recipes", out var rs) && rs is JsonArray ra)
            foreach (var r in ra)
                if (r is JsonArray rarr)
                    recipes.Add(rarr.Select(x => x.AsStringOr()).ToList());

        var effects = new Dictionary<string, int>();
        if (entry.TryGetPropertyValue("skill_effects", out var se) && se is JsonObject seo)
            foreach (var (k, v) in seo)
                effects[k] = v.AsIntOr();

        return new Decoration
        {
            Id = entry["id"].AsStringOr(),
            Name = entry["name"].AsStringOr(),
            SlotCost = entry["slot_cost"].AsIntOr(1),
            Cost = entry["cost"].AsIntOr(),
            SkillEffects = effects,
            Recipes = recipes,
        };
    }
}
