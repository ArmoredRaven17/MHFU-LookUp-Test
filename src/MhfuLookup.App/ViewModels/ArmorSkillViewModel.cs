using System.Collections.ObjectModel;
using CommunityToolkit.Mvvm.ComponentModel;
using MhfuLookup.App.Services;
using MhfuLookup.Core.Models;

namespace MhfuLookup.App.ViewModels;

public sealed record SkillPieceRow(string PieceName, string SetName, string Slot, int Points, string Icon, bool Alt = false);

public sealed partial class ArmorSkillViewModel : ObservableObject
{
    public const string AllSkills = "All Skills";

    // Preferred display order for the category filter; any categories not listed are appended.
    private static readonly string[] CategoryOrder =
    {
        "Offense", "Defense", "Resistance", "Blademaster", "Bowgun", "Bow",
        "Treasure Hunting", "Farming", "Misc. (Untagged)",
    };

    private readonly List<Skill> _all;                              // every skill, alphabetical
    private readonly Dictionary<string, HashSet<string>> _byCategory = new();  // category -> skill ids
    private readonly Dictionary<string, List<string>> _catsBySkill = new();    // skill id -> categories

    public ObservableCollection<string> Categories { get; } = new();
    public ObservableCollection<Skill> Items { get; } = new();
    public ObservableCollection<SkillPieceRow> Pieces { get; } = new();

    [ObservableProperty] private string searchText = "";
    [ObservableProperty] private string selectedCategory = AllSkills;
    [ObservableProperty] private Skill? selected;
    [ObservableProperty] private bool hasPieces;

    public ArmorSkillViewModel()
    {
        _all = AppDb.Instance.GetSkills()
            .OrderBy(s => s.Name, StringComparer.OrdinalIgnoreCase).ToList();

        foreach (var (sid, cat) in AppDb.Instance.GetSkillCategories())
        {
            if (!_byCategory.TryGetValue(cat, out var set)) { set = new(); _byCategory[cat] = set; }
            set.Add(sid);
            if (!_catsBySkill.TryGetValue(sid, out var lst)) { lst = new(); _catsBySkill[sid] = lst; }
            lst.Add(cat);
        }

        Categories.Add(AllSkills);
        foreach (var cat in CategoryOrder)
            if (_byCategory.ContainsKey(cat)) Categories.Add(cat);
        foreach (var cat in _byCategory.Keys.OrderBy(x => x, StringComparer.OrdinalIgnoreCase))
            if (!Categories.Contains(cat)) Categories.Add(cat);

        Build();
    }

    partial void OnSearchTextChanged(string value) => Build();
    partial void OnSelectedCategoryChanged(string value) => Build();
    partial void OnSelectedChanged(Skill? value)
    {
        OnPropertyChanged(nameof(SelectedCategoriesText));
        Pieces.Clear();
        if (value is null) { HasPieces = false; return; }
        var rows = AppDb.Instance.GetSkillPieces(value.Id);
        for (int i = 0; i < rows.Count; i++)
        {
            var (setName, pieceName, slot, points, rarity) = rows[i];
            var tier = rarity >= 4 ? Math.Min(rarity, 10) : rarity > 0 ? 1 : 0;
            var icon = tier > 0 ? $"ms-appx:///Assets/Armor/{slot}_R{tier}.png" : "";
            Pieces.Add(new SkillPieceRow(pieceName, setName, slot, points, icon, i % 2 == 1));
        }
        HasPieces = Pieces.Count > 0;
    }

    /// <summary>The categories the selected skill belongs to (shown in the detail pane); "" if none.</summary>
    public string SelectedCategoriesText =>
        Selected is { } s && _catsBySkill.TryGetValue(s.Id, out var cats)
            ? string.Join(" · ", cats) : "";

    /// <summary>Find a skill by its stable id (for bookmark deep-links), across all categories.</summary>
    public Skill? FindById(string id) => _all.FirstOrDefault(s => s.Id == id);

    private void Build()
    {
        Items.Clear();
        IEnumerable<Skill> q = _all;
        if (SelectedCategory != AllSkills && _byCategory.TryGetValue(SelectedCategory, out var ids))
            q = q.Where(s => ids.Contains(s.Id));
        if (!string.IsNullOrWhiteSpace(SearchText))
            q = q.Where(s => s.Name.Contains(SearchText, StringComparison.OrdinalIgnoreCase));
        foreach (var s in q) Items.Add(s);
    }
}
