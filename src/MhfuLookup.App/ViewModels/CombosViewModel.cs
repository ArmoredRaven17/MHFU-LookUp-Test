using System.Collections.ObjectModel;
using System.Text.RegularExpressions;
using CommunityToolkit.Mvvm.ComponentModel;
using MhfuLookup.App.Services;

namespace MhfuLookup.App.ViewModels;

/// <summary>A combination recipe with resolved item icons (icon basenames).</summary>
public sealed record ComboView(
    string Section, string Product, string ProductIcon,
    string Item1, string Item1Icon, string Item2, string Item2Icon, string Pct, string Qty,
    bool Alt = false)
{
    public bool HasItem2 => Item2.Length > 0;
}

public sealed class ComboGroup : List<ComboView>
{
    public string Section { get; }
    public ComboGroup(string section, IEnumerable<ComboView> items) : base(items) => Section = section;
}

public sealed partial class CombosViewModel : ObservableObject
{
    private readonly List<ComboView> _all;

    public ObservableCollection<ComboGroup> Groups { get; } = new();

    [ObservableProperty] private string searchText = "";

    public CombosViewModel()
    {
        // Resolve icons against the item list and the treasure list (some combo products are
        // treasure-hunt-only items, e.g. Pokke Snowman). Exact match first, then a normalised
        // fallback (case/space/punctuation-insensitive) to absorb minor name differences.
        var named = AppDb.Instance.GetItems().Select(i => (i.Name, i.Icon))
            .Concat(AppDb.Instance.GetTreasures().Select(t => (t.Name, t.Icon)))
            .Where(x => x.Icon.Length > 0);

        // Combo-only materials that aren't standalone entries in the item/treasure lists.
        var exact = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
            ["Sm Lao-Shan Claw"] = "MH4G-Claw_Icon_Red",
        };
        var norm = new Dictionary<string, string>();
        var ammoBase = new Dictionary<string, string>();   // "Crag S" (level stripped) -> icon
        static string Norm(string s) => Regex.Replace(s.ToLowerInvariant(), "[^a-z0-9]", "");
        static string StripLv(string s) => Regex.Replace(s, @"\s*Lv\d+$", "");
        foreach (var (name, icon) in named)
        {
            exact.TryAdd(name, icon);
            norm.TryAdd(Norm(name), icon);
            if (name != StripLv(name)) ammoBase.TryAdd(Norm(StripLv(name)), icon);
        }
        string Ic(string name) =>
            string.IsNullOrEmpty(name) ? ""
            : exact.TryGetValue(name, out var v) ? v
            : norm.TryGetValue(Norm(name), out var n) ? n
            : ammoBase.TryGetValue(Norm(StripLv(name)), out var a) ? a : "";

        _all = AppDb.Instance.GetCombinations().Select(c => new ComboView(
            c.Section, c.Product, Ic(c.Product), c.Item1, Ic(c.Item1), c.Item2, Ic(c.Item2), c.Pct, c.Qty)).ToList();
        Filter("");
    }

    partial void OnSearchTextChanged(string value) => Filter(value);

    private void Filter(string query)
    {
        Groups.Clear();
        bool Match(ComboView c) =>
            string.IsNullOrWhiteSpace(query) ||
            c.Product.Contains(query, StringComparison.OrdinalIgnoreCase) ||
            c.Item1.Contains(query, StringComparison.OrdinalIgnoreCase) ||
            c.Item2.Contains(query, StringComparison.OrdinalIgnoreCase);
        foreach (var g in _all.Where(Match).GroupBy(c => c.Section))
        {
            // Zebra-stripe rows within each section so the eye can track a row across its many columns.
            var rows = g.Select((c, i) => c with { Alt = i % 2 == 1 });
            Groups.Add(new ComboGroup(g.Key, rows));
        }
    }
}
