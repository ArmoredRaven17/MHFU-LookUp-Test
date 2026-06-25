using System.Text.Json.Nodes;

namespace MhfuLookup.App.Models;

public sealed record Hitzone(string Part, string Cut, string Bash, string Shot,
    string Fire, string Water, string Thunder, string Ice, string Dragon, string Ko);

public sealed record StaggerRow(string Part, string Limit);

public sealed record AilmentRow(string Ailment, string Initial, string Increase,
    string Max, string Duration, string Damage, string Recovery);

public sealed record MonsterItemRow(string Item, string Effect, string Notes);

public sealed record LootRow(string Item, string Pct);

/// <summary>One tier column (e.g. "Guild 1★~2★") within a body part.</summary>
public sealed record LootTierColumn(string TierLabel, IReadOnlyList<LootRow> Rows);

/// <summary>One body part (e.g. "Body (3 carves)") with its tier columns.</summary>
public sealed record LootPart(string Label, string? Condition, IReadOnlyList<LootTierColumn> Tiers)
{
    public bool HasCondition => !string.IsNullOrWhiteSpace(Condition);
    public string ConditionDisplay => HasCondition ? $"Condition: {Condition}" : "";
}

/// <summary>A loot section: Carve, Capture, or Break.</summary>
public sealed record LootSectionGroup(string Header, IReadOnlyList<LootPart> Parts);

/// <summary>Parsed, display-ready view of a monster's doc_json.</summary>
public sealed class MonsterView
{
    public string Id { get; set; } = "";
    public string Name { get; init; } = "";
    public string Type { get; init; } = "";
    public IReadOnlyList<Hitzone> Hitzones { get; init; } = Array.Empty<Hitzone>();
    public IReadOnlyList<StaggerRow> Staggers { get; init; } = Array.Empty<StaggerRow>();
    public IReadOnlyList<AilmentRow> Ailments { get; init; } = Array.Empty<AilmentRow>();
    public IReadOnlyList<MonsterItemRow> Items { get; init; } = Array.Empty<MonsterItemRow>();
    public IReadOnlyList<LootSectionGroup> LootSections { get; init; } = Array.Empty<LootSectionGroup>();
    public string Notes { get; init; } = "";

    public bool HasHitzones => Hitzones.Count > 0;
    public bool HasStaggers => Staggers.Count > 0;
    public bool HasAilments => Ailments.Count > 0;
    public bool HasItems => Items.Count > 0;
    public bool HasNotes => Notes.Length > 0;

    // Carve/capture/break tiers, in the order and with the labels the Python app uses.
    private static readonly (string Key, string Label)[] TierOrder =
    {
        ("guild_low_12", "Guild 1★~2★"),
        ("elder_guild_low", "Elder/Guild Low"),
        ("nekoht_guild_high", "Nekoht/Guild High"),
        ("g_rank", "G Rank"),
        ("special", "Special"),
        ("treasure_hunt", "Treasure Hunt"),
    };

    private static string S(JsonNode? n) => n is null ? "" : n.ToString();
    private static string Dash(JsonNode? n) => n is null ? "—" : n.ToString();

    public static MonsterView Parse(JsonObject doc)
    {
        var hits = new List<Hitzone>();
        if (doc["hitzones"] is JsonArray ha)
            foreach (var h in ha.OfType<JsonObject>())
                hits.Add(new Hitzone(S(h["part"]), S(h["cut"]), S(h["bash"]), S(h["shot"]),
                    S(h["fire"]), S(h["water"]), S(h["thunder"]), S(h["ice"]), S(h["dragon"]), S(h["ko"])));

        var staggers = new List<StaggerRow>();
        if (doc["stagger_limits"] is JsonArray sa)
            foreach (var s in sa.OfType<JsonObject>())
                staggers.Add(new StaggerRow(S(s["part"]), S(s["limit"])));

        var ailments = new List<AilmentRow>();
        if (doc["ailment_tolerances"] is JsonArray aa)
            foreach (var a in aa.OfType<JsonObject>())
                ailments.Add(new AilmentRow(S(a["ailment"]), Dash(a["initial"]), Dash(a["increase"]),
                    Dash(a["max"]), Dash(a["duration"]), Dash(a["damage"]), Dash(a["recovery"])));

        var items = new List<MonsterItemRow>();
        if (doc["items"] is JsonArray ia)
            foreach (var i in ia.OfType<JsonObject>())
                items.Add(new MonsterItemRow(S(i["item"]), S(i["effect"]), S(i["notes"])));

        var sections = new List<LootSectionGroup>();
        AddListSection(sections, doc["carve"], "Carve");
        AddObjectSection(sections, doc["capture"], "Capture");
        AddListSection(sections, doc["break"], "Break");

        var notes = doc["quests"] is JsonObject q ? S(q["notes"]) : "";

        return new MonsterView
        {
            Name = S(doc["name"]),
            Type = S(doc["type"]),
            Hitzones = hits,
            Staggers = staggers,
            Ailments = ailments,
            Items = items,
            LootSections = sections,
            Notes = notes,
        };
    }

    private static void AddListSection(List<LootSectionGroup> outp, JsonNode? section, string header)
    {
        if (section is not JsonArray arr) return;
        var parts = arr.OfType<JsonObject>().Select(BuildPart).ToList();
        if (parts.Count > 0) outp.Add(new LootSectionGroup(header, parts));
    }

    private static void AddObjectSection(List<LootSectionGroup> outp, JsonNode? section, string header)
    {
        if (section is JsonObject o)
            outp.Add(new LootSectionGroup(header, new[] { BuildPart(o) }));
    }

    private static LootPart BuildPart(JsonObject part)
    {
        var label = S(part["label"]);
        var carveCount = part["carve_count"];
        if (carveCount is not null && carveCount.ToString() is { Length: > 0 } cc && cc != "0")
            label = string.IsNullOrEmpty(label) ? $"({cc} carves)" : $"{label} ({cc} carves)";

        var condition = part["condition"] is JsonNode c ? c.ToString() : null;

        var tiers = new List<LootTierColumn>();
        foreach (var (key, tierLabel) in TierOrder)
        {
            if (part[key] is not JsonArray entries) continue;
            var rows = entries.OfType<JsonObject>()
                .Select(e => new LootRow(S(e["item"]), FormatPct(e["pct"])))
                .ToList();
            tiers.Add(new LootTierColumn(tierLabel, rows));
        }
        return new LootPart(label, string.IsNullOrWhiteSpace(condition) ? null : condition, tiers);
    }

    private static string FormatPct(JsonNode? pct)
    {
        if (pct is null) return "";
        var s = pct.ToString();
        return s.Length == 0 || s == "-" ? "" : $"{s}%";
    }
}
