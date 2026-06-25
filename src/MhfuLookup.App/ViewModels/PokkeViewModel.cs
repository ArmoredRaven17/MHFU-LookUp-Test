using System.Collections.ObjectModel;
using System.Text.RegularExpressions;
using CommunityToolkit.Mvvm.ComponentModel;
using MhfuLookup.App.Services;
using MhfuLookup.Core.Data;

namespace MhfuLookup.App.ViewModels;

/// <summary>A Pokke Farm collection area (Mining Points, Fishing Pier, …) with a representative icon.</summary>
public sealed record PokkeArea(string Name, string IconUri);

/// <summary>One obtainable item: name, an optional note (qty / rate / "Exclusive"), and its icon URI.</summary>
public sealed record PokkeEntry(string Name, string Note, string Icon)
{
    /// <summary>Parenthesised note for display next to the name ("" when there's no note).</summary>
    public string NoteText => Note.Length > 0 ? $"({Note})" : "";
}

/// <summary>An upgrade tier / bomb type / hammer, with the items it yields.</summary>
public sealed record PokkeGroup(string Label, string Note, IReadOnlyList<PokkeEntry> Items)
{
    public bool HasNote => Note.Length > 0;
}

public sealed partial class PokkeViewModel : ObservableObject
{
    private readonly List<PokkeItemRow> _all;

    // Item-name → icon lookups (exact, then normalised) over items ∪ treasures — mirrors TrenyaViewModel.
    private readonly Dictionary<string, string> _iconExact = new(StringComparer.OrdinalIgnoreCase);
    private readonly Dictionary<string, string> _iconNorm = new();
    private readonly Dictionary<string, string> _jewelColor = new();
    private static string NormName(string s) => Regex.Replace(s.ToLowerInvariant(), "[^a-z0-9]", "");

    // A representative item per area, used for the area-list icon.
    private static readonly Dictionary<string, string> AreaRepItem = new()
    {
        ["Field Rows"] = "Giant Corn",
        ["Fishing Pier"] = "Springnight Carp",
        ["Casting Machine"] = "Net",
        ["Mining Points"] = "Mega Pickaxe",
        ["Bomb Mining"] = "Bounce Bomb",
        ["Insect Thicket"] = "Killer Beetle",
        ["Bug Tree"] = "Hornetaur Wing",
        ["Mushroom Tree"] = "Nitroshroom",
        ["Bee Hive"] = "Honey",
        ["Great Sword Cave"] = "Dark Piece",
    };

    public List<PokkeArea> Areas { get; }
    public ObservableCollection<PokkeGroup> Groups { get; } = new();

    [ObservableProperty] private PokkeArea? selectedArea;

    public PokkeViewModel()
    {
        _all = AppDb.Instance.GetPokkeItems();

        var named = AppDb.Instance.GetItems().Select(i => (i.Name, i.Icon))
            .Concat(AppDb.Instance.GetTreasures().Select(t => (t.Name, t.Icon)))
            .Where(x => x.Icon.Length > 0);
        foreach (var (name, icon) in named)
        {
            _iconExact.TryAdd(name, icon);
            _iconNorm.TryAdd(NormName(name), icon);
        }
        foreach (var d in AppDb.Instance.GetDecorations().Where(d => d.Color.Length > 0))
            _jewelColor.TryAdd(NormName(d.Name), d.Color);

        Areas = _all.Select(r => r.Area).Distinct()
            .Select(a => new PokkeArea(a,
                AreaRepItem.TryGetValue(a, out var rep) ? ResolveIconUri(rep) : ""))
            .ToList();
        SelectedArea = Areas.FirstOrDefault();
    }

    private string ResolveIconUri(string name)
    {
        // Bundled item/treasure icon first (incl. the "+ Jewel" form), then the tinted jewel sprite.
        var b = ResolveItemIcon(name);
        if (b.Length == 0) b = ResolveItemIcon(name + " Jewel");
        if (b.Length > 0) return $"ms-appx:///Assets/Items/{b}.png";

        foreach (var c in new[] { name, name + " Jewel" })
            if (_jewelColor.TryGetValue(NormName(c), out var color))
                return $"ms-appx:///Assets/Decorations/{color}.png";
        return "";
    }

    private string ResolveItemIcon(string name)
    {
        if (_iconExact.TryGetValue(name, out var v)) return v;
        if (_iconNorm.TryGetValue(NormName(name), out var nv)) return nv;
        return "";
    }

    partial void OnSelectedAreaChanged(PokkeArea? value)
    {
        Groups.Clear();
        if (value is null) return;
        foreach (var g in _all.Where(r => r.Area == value.Name).GroupBy(r => r.GroupLabel))
        {
            var items = g.Select(r => new PokkeEntry(r.Item, r.ItemNote, ResolveIconUri(r.Item))).ToList();
            Groups.Add(new PokkeGroup(g.Key, g.First().GroupNote, items));
        }
    }
}
