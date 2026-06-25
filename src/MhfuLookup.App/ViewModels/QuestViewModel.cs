using System.Collections.ObjectModel;
using System.Text.Json.Nodes;
using System.Text.RegularExpressions;
using CommunityToolkit.Mvvm.ComponentModel;
using MhfuLookup.App.Services;
using MhfuLookup.Core.Data;
using MhfuLookup.Core.Domain;
using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Media;

namespace MhfuLookup.App.ViewModels;

/// <summary>An activated set skill, coloured by whether it's beneficial or a negative skill to avoid.</summary>
public sealed record QuestSkill(string Name, bool Negative)
{
    private static readonly Brush Pos =
        (Application.Current.Resources["PositiveBrush"] as Brush) ?? new SolidColorBrush(Windows.UI.Color.FromArgb(255, 0x5F, 0xB8, 0x5F));
    private static readonly Brush Neg =
        (Application.Current.Resources["NegativeBrush"] as Brush) ?? new SolidColorBrush(Windows.UI.Color.FromArgb(255, 0xC0, 0x70, 0x70));
    public Brush Color => Negative ? Neg : Pos;
}

/// <summary>A quest reward item with its resolved icon basename (empty if unmatched).</summary>
public sealed record QuestReward(string Name, string Icon);

/// <summary>One loaner item-set line ("3 Whetstone") with its resolved item icon basename.</summary>
public sealed record QuestSupply(string Text, string Icon);

/// <summary>One loaner armor piece in a Training School set: its name, skills, and decoration.</summary>
public sealed record QuestArmorPiece(string Name, string Skills, string Decoration)
{
    public bool HasSkills => Skills.Length > 0;
    public bool HasDecoration => Decoration.Length > 0;
}

/// <summary>One of a training quest's weapon choices: the loaner weapon, armor set, item set,
/// the set's activated skills, and the instructor's weapon-specific description.</summary>
public sealed record QuestLoadout(
    string WeaponType, string Weapon, string Description,
    IReadOnlyList<QuestArmorPiece> Armor, IReadOnlyList<QuestSupply> Items,
    IReadOnlyList<QuestSkill> ActiveSkills)
{
    public string Header => Weapon.Length > 0 ? $"{WeaponType} — {Weapon}" : WeaponType;
    public bool HasItems => Items.Count > 0;
    public bool HasDescription => Description.Length > 0;
    public bool HasActiveSkills => ActiveSkills.Count > 0;
    // The loaner armor pieces (these are fixed sets, so skill points/decorations are omitted).
    public string SetText => string.Join(", ", Armor
        .Where(a => a.Name.Length > 0 && !a.Name.Equals("Nothing", StringComparison.OrdinalIgnoreCase))
        .Select(a => a.Name));
    public bool HasSet => SetText.Length > 0;
}

public sealed record QuestItem(
    string Name, string Objective, string Location, string TimeOfDay, string Time, string Fee,
    string Reward, string MonstersText, string Description, string Environment, string Notes,
    IReadOnlyList<QuestReward> Rewards, bool Key, bool Urgent, string Unlock,
    IReadOnlyList<string> TargetIds, IReadOnlyList<string> TargetItemIcons,
    IReadOnlyList<QuestLoadout> Loadouts, string Danger)
{
    public bool HasLoadouts => Loadouts.Count > 0;
    public bool HasDanger => Danger.Length > 0;   // training quest star rating, e.g. "★★★" / "G★★"
    public bool HasUnlock => !string.IsNullOrWhiteSpace(Unlock);
    public bool HasMonsters => !string.IsNullOrWhiteSpace(MonstersText);
    public bool HasTimeOfDay => !string.IsNullOrWhiteSpace(TimeOfDay);
    public bool HasDescription => !string.IsNullOrWhiteSpace(Description);
    public bool HasNotes => !string.IsNullOrWhiteSpace(Notes);
    public bool HasEnvironment => !string.IsNullOrWhiteSpace(Environment);
    public bool IsStable => Environment.Equals("Stable", StringComparison.OrdinalIgnoreCase);
    public bool IsUnstable => Environment.Equals("Unstable", StringComparison.OrdinalIgnoreCase);
    public bool HasRewards => Rewards.Count > 0;
    public string Badge => Urgent ? "URGENT" : Key ? "KEY" : "";
    public bool HasBadge => Urgent || Key;
    public bool HasTargets => TargetIds.Count > 0 || TargetItemIcons.Count > 0;
    public bool KeyOnly => Key && !Urgent;   // urgent quests render their own badge
}

public sealed class QuestRankGroup : List<QuestItem>
{
    public string Label { get; }
    public QuestRankGroup(string label, IEnumerable<QuestItem> items) : base(items) => Label = label;
}

public sealed partial class QuestViewModel : ObservableObject
{
    public ObservableCollection<NamedDoc> Categories { get; } = new();
    public ObservableCollection<QuestRankGroup> Groups { get; } = new();

    [ObservableProperty] private NamedDoc? selectedCategory;
    [ObservableProperty] private QuestItem? selected;

    // Training School categories live in their own tab, so they're kept out of the main Quests picker.
    private static bool IsTraining(string slug) => slug.StartsWith("training_", StringComparison.Ordinal);

    // Display order + friendly labels for the main Quests category combo (default = Low Rank Village).
    private static readonly (string Slug, string Label)[] CategoryOrder =
    {
        ("village_low_rank_elder", "Low Rank Village"),
        ("guild_low_rank", "Low Rank Guild"),
        ("village_high_rank_nekoht", "High Rank Village"),
        ("guild_high_rank", "High Rank Guild"),
        ("guild_g_rank", "G Rank"),
    };

    // The six Training School categories, in dropdown order, for the Training tab.
    private static readonly (string Slug, string Label)[] TrainingOrder =
    {
        ("training_basic", "Basic Training"),
        ("training_weapon_mastery", "Weapon Mastery"),
        ("training_battle", "Battle Training"),
        ("training_special", "Special Training"),
        ("training_g_lv", "G Lv Training"),
        ("training_group", "Group Training"),
    };

    // monster display-name (lower) → id, for resolving quest target icons.
    private readonly Dictionary<string, string> _monsterIdByName;

    // item (name, icon) sorted longest-name-first, for matching delivery objectives.
    private readonly List<(string Name, string Icon)> _itemsByLen;

    // Reward-name → icon lookups (exact, then normalised) over items ∪ treasures.
    private readonly Dictionary<string, string> _iconExact = new(StringComparer.OrdinalIgnoreCase);
    private readonly Dictionary<string, string> _iconNorm = new();
    private static string NormName(string s) => Regex.Replace(s.ToLowerInvariant(), "[^a-z0-9]", "");

    // Quest objective spellings that differ from the monster DB names.
    private static readonly Dictionary<string, string> NameAliases = new(StringComparer.OrdinalIgnoreCase)
    {
        ["Ash Lao-Shan Lung"] = "ashen_lao-shan_lung",
    };

    public QuestViewModel()
    {
        _monsterIdByName = AppDb.Instance.GetMonsters()
            .GroupBy(m => m.Name, StringComparer.OrdinalIgnoreCase)
            .ToDictionary(g => g.Key, g => g.First().Id, StringComparer.OrdinalIgnoreCase);

        _itemsByLen = AppDb.Instance.GetItems()
            .Where(i => i.Icon.Length > 0)
            .GroupBy(i => i.Name, StringComparer.OrdinalIgnoreCase)
            .Select(g => (g.Key, g.First().Icon))
            .OrderByDescending(x => x.Key.Length)
            .ToList();

        // Reward icons resolve against items and treasures (exact first, then normalised).
        var named = AppDb.Instance.GetItems().Select(i => (i.Name, i.Icon))
            .Concat(AppDb.Instance.GetTreasures().Select(t => (t.Name, t.Icon)))
            .Where(x => x.Icon.Length > 0);
        foreach (var (name, icon) in named)
        {
            _iconExact.TryAdd(name, icon);
            _iconNorm.TryAdd(NormName(name), icon);
        }

        var available = AppDb.Instance.GetQuestCategories().ToDictionary(c => c.Slug);
        foreach (var (slug, label) in CategoryOrder)
            if (available.ContainsKey(slug))
                Categories.Add(new NamedDoc(slug, label));
        // Append any categories not covered by the explicit order (safety), except Training
        // School categories which have their own tab.
        foreach (var c in available.Values)
            if (!IsTraining(c.Slug) && !CategoryOrder.Any(o => o.Slug == c.Slug))
                Categories.Add(c);

        SelectedCategory = Categories.FirstOrDefault();
    }

    partial void OnSelectedCategoryChanged(NamedDoc? value) => LoadCategory(value);

    /// <summary>Deep-link helper: switch to a category (training tab if needed) so its quests load.</summary>
    public void GoToCategory(string slug, bool training)
    {
        if (training) ShowTraining();   // rebuild the dropdown with the Training School categories
        var cat = Categories.FirstOrDefault(c => c.Slug == slug);
        if (cat is not null) SelectedCategory = cat;   // triggers LoadCategory → Groups
    }

    /// <summary>Find a quest by name within the currently loaded category — for bookmark deep-linking.</summary>
    public QuestItem? FindQuest(string name) =>
        Groups.SelectMany(g => g).FirstOrDefault(q => string.Equals(q.Name, name, StringComparison.Ordinal));

    /// <summary>Switch the page to the Training School categories, selectable in the same dropdown.</summary>
    public void ShowTraining()
    {
        var available = AppDb.Instance.GetQuestCategories().Select(c => c.Slug).ToHashSet();
        Categories.Clear();
        foreach (var (slug, label) in TrainingOrder)
            if (available.Contains(slug)) Categories.Add(new NamedDoc(slug, label));
        SelectedCategory = Categories.FirstOrDefault();   // triggers LoadCategory
    }

    private static string S(JsonNode? n) => n is null ? "" : n.ToString();

    private static string JoinArray(JsonNode? n) =>
        n is JsonArray a ? string.Join(", ", a.Select(x => x?.ToString() ?? "")) : "";

    // "Great Forest (Day)" → ("Great Forest", "Day"); no parenthetical → (area, "").
    private static (string Location, string TimeOfDay) SplitArea(string area)
    {
        var m = Regex.Match(area, @"^(?<loc>.*?)\s*\((?<t>[^)]*)\)\s*$");
        return m.Success ? (m.Groups["loc"].Value.Trim(), m.Groups["t"].Value.Trim()) : (area.Trim(), "");
    }

    // Quest reward items, each with its resolved icon (exact match, then normalised; "" if unmatched).
    private List<QuestReward> BuildRewards(JsonNode? n)
    {
        var outp = new List<QuestReward>();
        if (n is not JsonArray a) return outp;
        foreach (var node in a)
        {
            var name = node?.ToString() ?? "";
            if (name.Length == 0) continue;
            var icon = _iconExact.TryGetValue(name, out var v) ? v
                     : _iconNorm.TryGetValue(NormName(name), out var nv) ? nv : "";
            outp.Add(new QuestReward(name, icon));
        }
        return outp;
    }

    // Target monsters = those from the quest's monster list that the objective actually names
    // (whole-word, plural-aware). A base name that only appears inside a longer target name is
    // excluded — e.g. "Blango" in "Blangonga", "Vespoid" in "Vespoid Queen".
    private List<string> DetectTargets(string objective, JsonNode? monsters)
    {
        var ids = new List<string>();
        if (string.IsNullOrEmpty(objective)) return ids;

        // Cleaned names from the quest's own list (drop annotation marks like the intentional
        // "?" on "Yian Kut-Ku?"); the displayed Monsters text keeps the original spelling.
        var arrayNames = new List<string>();
        if (monsters is JsonArray arr)
            foreach (var node in arr)
            {
                var n = (node?.ToString() ?? "").TrimEnd('?', '!', '*', ' ');
                if (n.Length > 0 && !arrayNames.Contains(n)) arrayNames.Add(n);
            }

        // "Hunt all of the Large Monsters" names no specific target — every listed monster is one.
        if (objective.Contains("Hunt all", StringComparison.OrdinalIgnoreCase))
        {
            foreach (var n in arrayNames) AddTargetId(ids, n);
            return ids;
        }

        // Candidates: the quest's own monster list, plus — for non-delivery objectives — the full
        // roster + aliases, so quests with an empty or mismatched monster list still resolve to the
        // monster the objective actually names (e.g. "…from Ashen Lao-Shan Lung" with no list).
        var candidates = new List<string>(arrayNames);
        if (!objective.Contains("Deliver", StringComparison.OrdinalIgnoreCase))
        {
            foreach (var nm in _monsterIdByName.Keys) if (!candidates.Contains(nm)) candidates.Add(nm);
            foreach (var nm in NameAliases.Keys) if (!candidates.Contains(nm)) candidates.Add(nm);
        }

        var spans = new Dictionary<string, List<(int Start, int End)>>();
        foreach (var n in candidates)
        {
            var list = WordMatchSpans(objective, n);
            if (list.Count > 0) spans[n] = list;
        }

        foreach (var name in candidates)
        {
            if (!spans.TryGetValue(name, out var list)) continue;
            // Keep only if some occurrence isn't wholly inside a longer matched name.
            var real = list.Any(span => !spans.Any(other =>
                other.Key != name &&
                other.Value.Any(o => o.Start <= span.Start && span.End <= o.End &&
                                     (o.End - o.Start) > (span.End - span.Start))));
            if (real) AddTargetId(ids, name);
        }
        return ids;
    }

    private void AddTargetId(List<string> ids, string name)
    {
        if (NameAliases.TryGetValue(name, out var aliasId)) { if (!ids.Contains(aliasId)) ids.Add(aliasId); }
        else if (_monsterIdByName.TryGetValue(name, out var id) && !ids.Contains(id)) ids.Add(id);
    }

    /// <summary>Whole-word occurrences of <paramref name="name"/> in the objective, allowing a
    /// trailing plural "s"/"es". Returned spans cover the base name only.</summary>
    private static List<(int Start, int End)> WordMatchSpans(string objective, string name)
    {
        var spans = new List<(int, int)>();
        var i = 0;
        while ((i = objective.IndexOf(name, i, StringComparison.OrdinalIgnoreCase)) >= 0)
        {
            var leftOk = i == 0 || !char.IsLetter(objective[i - 1]);
            var end = i + name.Length;
            var run = end;
            while (run < objective.Length && char.IsLetter(objective[run])) run++;
            var suffix = objective[end..run].ToLowerInvariant();
            if (leftOk && suffix is "" or "s" or "es") spans.Add((i, end));
            i += name.Length;
        }
        return spans;
    }

    // Delivery objectives name an item; show that item's icon. Items are matched longest-first
    // so e.g. "Mountain Herb" wins over "Herb" in "Deliver 20 Mountain Herbs".
    private List<string> DetectDeliveryItems(string objective)
    {
        var icons = new List<string>();
        if (!objective.Contains("Deliver", StringComparison.OrdinalIgnoreCase)) return icons;
        foreach (var (name, icon) in _itemsByLen)
            if (name.Length >= 4 && objective.Contains(name, StringComparison.OrdinalIgnoreCase))
            {
                icons.Add(icon);
                break;   // single delivery target
            }
        return icons;
    }

    // An item-set line's icon: "3 Whetstone" → the Whetstone icon. Resolves the name part against
    // items (exact, then normalised); missing ammo levels (e.g. Crag S Lv3) fall back to Lv1's icon.
    private string SupplyIcon(string line)
    {
        var name = Regex.Replace(line, @"^\d+\s+", "");   // drop the leading quantity
        if (_iconExact.TryGetValue(name, out var ic)) return ic;
        if (_iconNorm.TryGetValue(NormName(name), out var nic)) return nic;
        var m = Regex.Match(name, @"^(.*) Lv\d+$");
        if (m.Success && _iconExact.TryGetValue(m.Groups[1].Value + " Lv1", out var aic)) return aic;
        return "";
    }

    // Training School loaner loadouts: weapon choice → loaner weapon + armor set + item set.
    private List<QuestLoadout> BuildLoadouts(JsonNode? n)
    {
        var outp = new List<QuestLoadout>();
        if (n is not JsonArray a) return outp;
        foreach (var lo in a.OfType<JsonObject>())
        {
            var armor = new List<QuestArmorPiece>();
            if (lo["armor"] is JsonArray ar)
                foreach (var p in ar.OfType<JsonObject>())
                    armor.Add(new QuestArmorPiece(S(p["name"]), S(p["skills"]), S(p["decoration"])));
            var items = lo["items"] is JsonArray it
                ? it.Select(x => x?.ToString() ?? "").Where(s => s.Length > 0)
                     .Select(s => new QuestSupply(s, SupplyIcon(s))).ToList()
                : new List<QuestSupply>();
            var active = new List<QuestSkill>();
            if (lo["active_skills"] is JsonArray sk)
                foreach (var s in sk)
                    if (s is JsonObject so)
                        active.Add(new QuestSkill(S(so["name"]), so["negative"].AsBool()));
                    else if (s is not null && s.ToString().Length > 0)
                        active.Add(new QuestSkill(s.ToString(), false));   // legacy plain-string form
            outp.Add(new QuestLoadout(
                S(lo["weapon_type"]), S(lo["weapon"]), S(lo["description"]), armor, items, active));
        }
        return outp;
    }

    private void LoadCategory(NamedDoc? cat)
    {
        Groups.Clear();
        Selected = null;
        if (cat is null) return;
        var doc = AppDb.Instance.GetQuestDoc(cat.Slug);
        if (doc is null || doc["ranks"] is not JsonArray ranks) return;

        foreach (var rank in ranks.OfType<JsonObject>())
        {
            // Training categories use a single unlabelled rank (flat list, no section header);
            // the main quest categories carry their star-tier labels.
            var label = S(rank["label"]);
            var items = new List<QuestItem>();
            if (rank["quests"] is JsonArray quests)
                foreach (var q in quests.OfType<JsonObject>())
                    items.Add(new QuestItem(
                        Name: S(q["name"]),
                        Objective: S(q["objective"]),
                        Location: SplitArea(S(q["area"])).Location,
                        TimeOfDay: SplitArea(S(q["area"])).TimeOfDay,
                        Time: S(q["time"]),
                        Fee: S(q["fee"]),
                        Reward: S(q["reward"]),
                        MonstersText: JoinArray(q["monsters"]),
                        Description: S(q["description"]),
                        Environment: S(q["environment"]),
                        Notes: S(q["notes"]),
                        Rewards: BuildRewards(q["rewards"]),
                        Key: q["key"].AsBool(),
                        Urgent: q["urgent"].AsBool(),
                        Unlock: S(q["unlock"]),
                        TargetIds: DetectTargets(S(q["objective"]), q["monsters"]),
                        TargetItemIcons: DetectDeliveryItems(S(q["objective"])),
                        Loadouts: BuildLoadouts(q["loadouts"]),
                        Danger: S(q["danger"])));
            if (items.Count > 0) Groups.Add(new QuestRankGroup(label, items));
        }
    }
}
