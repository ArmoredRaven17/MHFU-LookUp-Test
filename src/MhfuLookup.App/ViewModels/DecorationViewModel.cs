using System.Collections.ObjectModel;
using CommunityToolkit.Mvvm.ComponentModel;
using MhfuLookup.App.Services;
using MhfuLookup.Core.Models;

namespace MhfuLookup.App.ViewModels;

/// <summary>One ingredient line in a recipe: "2× Power Seed" + its tinted material icon ("" = none).</summary>
public sealed record DecoMaterial(string Text, string IconUri);

public sealed record DecoRecipe(string Label, IReadOnlyList<DecoMaterial> Materials);

public sealed class DecorationView
{
    public string Name { get; init; } = "";
    public string SkillName { get; init; } = "";   // "<skill> <slots> Jewel", e.g. "Capacity 3 Jewel"
    public string DisplayName { get; set; } = "";   // Name or SkillName, per the list toggle
    public string SkillsText { get; init; } = "";
    public int SlotCost { get; init; }
    public string SlotText { get; init; } = "";
    public int Cost { get; init; }
    public string Color { get; init; } = "";        // jewel tint (blacksmith palette name)
    public string IconUri => Color.Length > 0 ? $"ms-appx:///Assets/Decorations/{Color}.png" : "";
    public IReadOnlyList<DecoRecipe> Recipes { get; init; } = Array.Empty<DecoRecipe>();
    public bool HasRecipes => Recipes.Count > 0;
}

public sealed partial class DecorationViewModel : ObservableObject
{
    private readonly List<DecorationView> _all;

    public ObservableCollection<DecorationView> Items { get; } = new();

    [ObservableProperty] private string searchText = "";
    [ObservableProperty] private DecorationView? selected;
    [ObservableProperty] private bool bySkill;   // off = by decoration name, on = by skill name

    public DecorationViewModel()
    {
        var db = AppDb.Instance;
        var skillNames = db.GetSkills().ToDictionary(s => s.Id, s => s.Name);
        var matIcons = db.GetMaterialIcons();
        _all = db.GetDecorations().Select(d => Build(d, skillNames, matIcons)).ToList();
        Filter("");
    }

    // A recipe material string is "<amount> <name>" (e.g. "2 Power Seed"); split off the icon name.
    private static DecoMaterial BuildMaterial(string raw, IReadOnlyDictionary<string, string> matIcons)
    {
        var m = System.Text.RegularExpressions.Regex.Match(raw, @"^(\d+)\s+(.*)$");
        var (amount, name) = m.Success ? (m.Groups[1].Value, m.Groups[2].Value.Trim()) : ("", raw.Trim());
        var text = amount.Length > 0 ? $"{name} ×{amount}" : name;
        var uri = matIcons.TryGetValue(name, out var sprite) ? $"ms-appx:///Assets/Materials/{sprite}.png" : "";
        return new DecoMaterial(text, uri);
    }

    /// <summary>Find a loaded decoration by its (unique) name — used for bookmark deep-linking.</summary>
    public DecorationView? FindByName(string name) =>
        _all.FirstOrDefault(d => string.Equals(d.Name, name, StringComparison.Ordinal));

    partial void OnSearchTextChanged(string value) => Filter(value);

    // Switching mode relabels each entry and re-sorts the list.
    partial void OnBySkillChanged(bool value)
    {
        foreach (var d in _all) d.DisplayName = value ? d.SkillName : d.Name;
        Filter(SearchText);
    }

    private void Filter(string query)
    {
        Items.Clear();
        var matched = _all
            .Where(d => string.IsNullOrWhiteSpace(query)
                || d.Name.Contains(query, StringComparison.OrdinalIgnoreCase)
                || d.SkillName.Contains(query, StringComparison.OrdinalIgnoreCase)
                || d.SkillsText.Contains(query, StringComparison.OrdinalIgnoreCase))
            .OrderBy(d => d.DisplayName, StringComparer.OrdinalIgnoreCase);
        foreach (var d in matched) Items.Add(d);
    }

    private static DecorationView Build(Decoration d, IReadOnlyDictionary<string, string> names,
        IReadOnlyDictionary<string, string> matIcons)
    {
        var skills = string.Join(", ", d.SkillEffects.Select(kv =>
        {
            var nm = names.GetValueOrDefault(kv.Key, kv.Key);
            var sign = kv.Value > 0 ? "+" : "";
            return $"{nm} {sign}{kv.Value}";
        }));

        var recipes = d.Recipes.Select((r, i) =>
            new DecoRecipe($"Recipe {i + 1}",
                r.Select(m => BuildMaterial(m, matIcons)).ToList())).ToList();

        var circles = SlotDisplay.Bar(d.SlotCost);

        // Skill-name form: the (single) skill the jewel adds points for + its slot cost.
        var posKey = d.SkillEffects.Where(kv => kv.Value > 0).Select(kv => kv.Key).FirstOrDefault();
        var posName = posKey is null ? "" : names.GetValueOrDefault(posKey, posKey);
        var skillName = posName.Length > 0 ? $"{posName} {d.SlotCost} Jewel" : d.Name;

        return new DecorationView
        {
            Name = d.Name,
            SkillName = skillName,
            DisplayName = d.Name,
            SkillsText = skills,
            SlotCost = d.SlotCost,
            SlotText = $"{circles}  {d.SlotCost}-Slot Decoration",
            Cost = d.Cost,
            Color = d.Color,
            Recipes = recipes,
        };
    }
}
