using System.Collections.ObjectModel;
using System.Text.RegularExpressions;
using CommunityToolkit.Mvvm.ComponentModel;
using MhfuLookup.App.Services;
using MhfuLookup.Core.Data;
using MhfuLookup.Core.Models;
using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Media;

namespace MhfuLookup.App.ViewModels;

/// <summary>A rarity group of armor sets for the separated list.</summary>
public sealed class ArmorRarityGroup : List<ArmorSetSummary>
{
    public int Rarity { get; }
    public string Header => $"Rarity {Rarity}";
    public ArmorRarityGroup(int rarity, IEnumerable<ArmorSetSummary> items) : base(items) => Rarity = rarity;
}

public sealed record PieceStatRow(
    string Slot, string Name, string Defense, string Slots,
    int Fire, int Water, int Thunder, int Ice, int Dragon, bool IsTotal,
    string Icon = "");

public sealed record SkillPointRow(
    string Skill, string Head, string Chest, string Arms, string Waist, string Legs, int Total);

public sealed record PieceMaterials(string Name, string Materials);

/// <summary>An activated skill with its colour (green = beneficial, red = detrimental).</summary>
public sealed record ActivatedSkill(string Name, Brush Color);

public sealed class VariantView
{
    public string ClassType { get; init; } = "";
    public bool ShowClassHeader { get; init; }
    public IReadOnlyList<PieceStatRow> Pieces { get; init; } = Array.Empty<PieceStatRow>();
    public IReadOnlyList<SkillPointRow> Skills { get; init; } = Array.Empty<SkillPointRow>();
    public IReadOnlyList<ActivatedSkill> Activated { get; init; } = Array.Empty<ActivatedSkill>();
    public IReadOnlyList<PieceMaterials> Materials { get; init; } = Array.Empty<PieceMaterials>();
    public bool HasSkills => Skills.Count > 0;
    public bool HasActivated => Activated.Count > 0;
    public bool HasMaterials => Materials.Count > 0;
}

public sealed class ArmorSetView
{
    public string Name { get; init; } = "";
    public int Rarity { get; init; }
    public IReadOnlyList<VariantView> Variants { get; init; } = Array.Empty<VariantView>();
}

public sealed partial class ArmorSetViewModel : ObservableObject
{
    private readonly List<ArmorSetSummary> _all;
    private readonly Dictionary<string, string> _skillNames;
    private readonly Dictionary<string, string> _searchTerms;   // set id → skill / activated-skill blob
    private readonly HashSet<string> _negativeSkillNorm;   // normalised negative-point skill-tier names

    public ObservableCollection<ArmorRarityGroup> Groups { get; } = new();

    [ObservableProperty] private string searchText = "";
    [ObservableProperty] private ArmorSetView? selected;
    [ObservableProperty] private bool isGunner;   // toggle: off = Blademaster, on = Gunner
    [ObservableProperty] private bool isFemale;   // toggle: off = Male, on = Female (set/piece names)

    private string? _currentSetId;
    public string SelectedClass => IsGunner ? "Gunner" : "Blademaster";

    public ArmorSetViewModel()
    {
        var db = AppDb.Instance;
        _all = db.GetArmorSets();
        var skills = db.GetSkills();
        _skillNames = skills.ToDictionary(s => s.Id, s => s.Name);
        _searchTerms = db.GetArmorSearchTerms();
        // Detrimental activations are the skill tiers granted by negative points. Normalised
        // (spacing/brackets removed, sign kept) so "Faint Duration [x2]" matches "Faint Duration[x2]"
        // while "Health +20" never collides with "Health -20".
        _negativeSkillNorm = skills.SelectMany(s => s.Levels)
            .Where(l => l.Points < 0)
            .Select(l => NormSkill(l.Name))
            .ToHashSet();
        Filter("");
    }

    partial void OnSearchTextChanged(string value) => Filter(value);

    // Toggles re-render the current set's detail; the list rebuild + scroll preservation is
    // driven from the page (so it can capture/restore scroll position around the rebuild).
    partial void OnIsGunnerChanged(bool value)
    {
        if (_currentSetId is not null) Select(_currentSetId);
    }

    partial void OnIsFemaleChanged(bool value)
    {
        if (_currentSetId is not null) Select(_currentSetId);
    }

    public string? CurrentSetId => _currentSetId;

    /// <summary>Rebuild the list for the current toggle/search state.</summary>
    public void Refilter() => Filter(SearchText);

    /// <summary>Find the summary for a set id in the current (filtered) groups.</summary>
    public ArmorSetSummary? FindSummary(string? id) =>
        id is null ? null : Groups.SelectMany(g => g).FirstOrDefault(s => s.Id == id);

    // A set is shown if the selected class can wear it: "Both" sets and class-split sets always
    // qualify; a single-class set (e.g. Steel = Blademaster only) shows only under its class.
    private bool WearableBySelectedClass(ArmorSetSummary s) =>
        s.Classes.Contains("Both", StringComparison.Ordinal) ||
        s.Classes.Contains(SelectedClass, StringComparison.Ordinal);

    private void Filter(string query)
    {
        Groups.Clear();
        // Match against the original (combined) name so both gendered names stay searchable,
        // but display the gender-specific name.
        // Match the set name OR any of its skill-point / activated-skill names, so a search like
        // "Sneak" (skill points) or "Stealth" (activated skill) finds the relevant sets.
        var matching = _all
            .Where(WearableBySelectedClass)
            .Where(s => string.IsNullOrWhiteSpace(query)
                || s.Name.Contains(query, StringComparison.OrdinalIgnoreCase)
                || (_searchTerms.TryGetValue(s.Id, out var terms) && terms.Contains(query, StringComparison.OrdinalIgnoreCase)))
            .Select(s => s with { Name = ResolveSetName(s.Name, IsFemale, IsGunner) });
        // Group by rarity (ascending); set order within a rarity is preserved.
        foreach (var g in matching.GroupBy(s => s.Rarity).OrderBy(g => g.Key))
            Groups.Add(new ArmorRarityGroup(g.Key, g));
    }

    public void Select(string setId)
    {
        _currentSetId = setId;
        var detail = AppDb.Instance.GetArmorSet(setId);
        Selected = detail is null ? null : BuildView(detail);
    }

    private ArmorSetView? BuildView(ArmorSetDetail detail)
    {
        // Show the variant for the chosen class; "Both" sets always qualify.
        var chosen = detail.Variants
            .Where(v => v.ClassType == SelectedClass || v.ClassType == "Both")
            .ToList();
        if (chosen.Count == 0) return null;   // not equippable by the selected class

        var variants = chosen.Select(v => BuildVariant(v, detail.ClassSplit, detail.Rarity)).ToList();
        return new ArmorSetView { Name = ResolveSetName(detail.Name, IsFemale, IsGunner), Rarity = detail.Rarity, Variants = variants };
    }

    private static string SlotCircles(int n) => SlotDisplay.Bar(n);
    private static string Cap(string s) => s.Length == 0 ? s : char.ToUpper(s[0]) + s[1..];
    private static string DefRange(int init, int max) => max > init ? $"{init}~{max}" : init.ToString();

    /// <summary>
    /// Paired-name sets are stored as "&lt;Male&gt; (Male) / &lt;Female&gt; (Female)";
    /// return just the half for the chosen gender. Other names are returned unchanged.
    /// </summary>
    private static readonly Regex GenderPair =
        new(@"^(?<m>.*?)\s*\(Male\)\s*/\s*(?<f>.*?)\s*\(Female\)$", RegexOptions.Compiled);

    /// <summary>
    /// Resolve a set's display name for the current gender/class toggles. Set names may encode
    /// gender as "&lt;male&gt; (Male) / &lt;female&gt; (Female)" and/or class as
    /// "&lt;Blademaster&gt; / &lt;Gunner&gt;" (first half = Blademaster, second = Gunner) —
    /// e.g. "Golden / Puppet Master Armor Set" → Golden (BM) / Puppet Master (Gunner).
    /// </summary>
    private static string ResolveSetName(string name, bool female, bool gunner)
    {
        bool hasMale = name.Contains("(Male)", StringComparison.Ordinal);
        bool hasFemale = name.Contains("(Female)", StringComparison.Ordinal);

        string side = name;
        if (hasMale && hasFemale)
        {
            var m = GenderPair.Match(name);
            if (m.Success)
            {
                var male = m.Groups["m"].Value.Trim();
                var fem = m.Groups["f"].Value.Trim();
                side = female ? fem : male;
                if (side.Length == 0) side = female ? male : fem;   // blank half → fall back
            }
        }
        else if (hasFemale) side = StripFrom(name, "(Female)");   // female-exclusive
        else if (hasMale) side = StripFrom(name, "(Male)");

        return ClassHalf(side, gunner);
    }

    private static string StripFrom(string s, string marker)
    {
        var i = s.IndexOf(marker, StringComparison.Ordinal);
        return i < 0 ? s : s[..i].TrimEnd();
    }

    /// <summary>Pick the Blademaster (first) or Gunner (second) half of "&lt;BM&gt; / &lt;Gunner&gt;".</summary>
    private static string ClassHalf(string side, bool gunner)
    {
        var i = side.IndexOf(" / ", StringComparison.Ordinal);
        if (i < 0) return side.Trim();
        var bm = side[..i].Trim();          // Blademaster core (no trailing suffix)
        var gn = side[(i + 3)..].Trim();    // Gunner name carries the shared "Armor Set" suffix
        if (gunner) return gn;
        foreach (var suf in new[] { " Armor Set", " Armor", " Suit" })
            if (gn.EndsWith(suf, StringComparison.Ordinal)) return bm + suf;
        return bm;
    }

    // Normalise a skill-tier name for matching: drop spacing and brackets, keep the +/- sign.
    private static string NormSkill(string s) => Regex.Replace(s.ToLowerInvariant(), @"[ ()\[\]]+", "");

    /// <summary>Green for beneficial activations, red for detrimental ones (negative-point tiers,
    /// or clear cues: a "-N" value, a hazard "Increase", or a doubled ailment duration "x2").</summary>
    private Brush ActivatedBrush(string name)
    {
        var negative = _negativeSkillNorm.Contains(NormSkill(name))
            || Regex.IsMatch(name, @"-\d")
            || name.Contains("increase", StringComparison.OrdinalIgnoreCase)
            || name.Contains("(x2)", StringComparison.OrdinalIgnoreCase)
            || name.Contains("[x2]", StringComparison.OrdinalIgnoreCase);
        return (Brush)Application.Current.Resources[negative ? "NegativeBrush" : "PositiveBrush"];
    }

    /// <summary>Gendered piece name, falling back to the other gender if one is blank.</summary>
    private string PieceName(ArmorPiece p)
    {
        var n = IsFemale ? p.NameFemale : p.NameMale;
        return string.IsNullOrEmpty(n) ? (IsFemale ? p.NameMale : p.NameFemale) : n;
    }

    private static string ArmorIcon(string slot, int rarity) =>
        $"ms-appx:///Assets/Armor/{slot.ToLowerInvariant()}_R{rarity}.png";

    private VariantView BuildVariant(ArmorVariant v, bool split, int rarity)
    {
        var rows = new List<PieceStatRow>();
        int dSum = 0, dMaxSum = 0, fSum = 0, wSum = 0, tSum = 0, iSum = 0, drSum = 0;
        foreach (var p in v.Pieces)
        {
            rows.Add(new PieceStatRow(Cap(p.Slot), PieceName(p), DefRange(p.Defense, p.MaxDefense), SlotCircles(p.DecoSlots),
                p.FireRes, p.WaterRes, p.ThunderRes, p.IceRes, p.DragonRes, false,
                ArmorIcon(p.Slot, rarity)));
            dSum += p.Defense; dMaxSum += p.MaxDefense; fSum += p.FireRes; wSum += p.WaterRes;
            tSum += p.ThunderRes; iSum += p.IceRes; drSum += p.DragonRes;
        }
        rows.Add(new PieceStatRow("Total", "", DefRange(dSum, dMaxSum), "", fSum, wSum, tSum, iSum, drSum, true));

        // Skill points grid: one row per skill id, columns per slot + total.
        var slots = new[] { "head", "chest", "arms", "waist", "legs" };
        var bySlot = v.Pieces.ToDictionary(p => p.Slot, p => p.SkillPointsDict());
        var allSids = v.Pieces.SelectMany(p => p.SkillPoints.Select(sp => sp.Sid)).Distinct().ToList();

        string Cell(string slot, string sid) =>
            bySlot.TryGetValue(slot, out var d) && d.TryGetValue(sid, out var pts) && pts != 0
                ? (pts > 0 ? $"+{pts}" : pts.ToString()) : "";

        var skillRows = new List<SkillPointRow>();
        foreach (var sid in allSids)
        {
            var total = slots.Sum(s => bySlot.TryGetValue(s, out var d) && d.TryGetValue(sid, out var pts) ? pts : 0);
            skillRows.Add(new SkillPointRow(
                _skillNames.GetValueOrDefault(sid, sid),
                Cell("head", sid), Cell("chest", sid), Cell("arms", sid),
                Cell("waist", sid), Cell("legs", sid), total));
        }
        skillRows = skillRows.OrderByDescending(r => r.Total).ThenBy(r => r.Skill).ToList();

        // Per-piece materials.
        var materials = v.Pieces
            .Where(p => p.Materials.Count > 0)
            .Select(p => new PieceMaterials(PieceName(p), string.Join(", ", p.Materials)))
            .ToList();

        return new VariantView
        {
            ClassType = v.ClassType,
            ShowClassHeader = split,
            Pieces = rows,
            Skills = skillRows,
            Activated = v.ActivatedSkills.Select(a => new ActivatedSkill(a, ActivatedBrush(a))).ToList(),
            Materials = materials,
        };
    }
}
