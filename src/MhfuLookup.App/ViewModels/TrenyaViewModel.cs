using System.Collections.ObjectModel;
using System.Text.RegularExpressions;
using CommunityToolkit.Mvvm.ComponentModel;
using MhfuLookup.App.Services;

namespace MhfuLookup.App.ViewModels;

/// <summary>A Trenya destination (its name feeds the LocationIcon / LocationBrush converters).</summary>
public sealed record TrenyaLocation(string Name);

/// <summary>One fundable point amount for the selected destination.</summary>
public sealed record TierOption(int Points, string Label);

/// <summary>One item Trenya can bring back, with its resolved icon URI ("" = no icon).</summary>
public sealed record TrenyaItem(string Name, string Icon);

/// <summary>A category (General/Mineral/…) and the items it yields at the selected tier.</summary>
public sealed record CategoryGroup(string Category, IReadOnlyList<TrenyaItem> Items);

public sealed partial class TrenyaViewModel : ObservableObject
{
    // location → points → category → item names (source order preserved).
    private readonly List<(string Location, int Points, string Category, string Item)> _all;

    // Item-name → icon lookups (exact, then normalised) over items ∪ treasures — mirrors QuestViewModel.
    private readonly Dictionary<string, string> _iconExact = new(StringComparer.OrdinalIgnoreCase);
    private readonly Dictionary<string, string> _iconNorm = new();
    // Jewel-name → tint colour, for the Jewel category (those are decorations, not items).
    private readonly Dictionary<string, string> _jewelColor = new();
    private static string NormName(string s) => Regex.Replace(s.ToLowerInvariant(), "[^a-z0-9]", "");

    // Trenya jewel spellings whose in-app name differs by more than the "Jewel" suffix.
    private static readonly Dictionary<string, string> JewelAliases = new(StringComparer.OrdinalIgnoreCase)
    {
        ["Sharpshooter"] = "SharpshootrJewel",
        ["Anti Venom"] = "Antivenin Jewel",
        ["Staying Power"] = "StayingPwr Jewel",
        ["Heavenly Shield"] = "HvnlyShieldJewel",
    };

    public List<TrenyaLocation> Locations { get; }
    public ObservableCollection<TierOption> Tiers { get; } = new();
    public ObservableCollection<CategoryGroup> Categories { get; } = new();

    [ObservableProperty] private TrenyaLocation? selectedLocation;
    [ObservableProperty] private TierOption? selectedTier;

    public TrenyaViewModel()
    {
        _all = AppDb.Instance.GetTrenyaItems()
            .Select(r => (r.Location, r.Points, r.Category, r.Item))
            .ToList();

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

        Locations = _all.Select(r => r.Location).Distinct()
            .Select(n => new TrenyaLocation(n)).ToList();
        SelectedLocation = Locations.FirstOrDefault();
    }

    // Resolve an item to a full image URI. Jewels (decorations) use the tinted jewel sprite;
    // everything else uses the bundled item/treasure icon.
    private string ResolveIconUri(string name, string category)
    {
        if (category == "Jewel")
        {
            // The wiki often drops the "Jewel" suffix (e.g. "Cool Breeze" = "Cool Breeze Jewel").
            // Try the bare name, the "+ Jewel" form, and any alias.
            var cands = new List<string> { name, name + " Jewel" };
            if (JewelAliases.TryGetValue(name, out var alias)) cands.Add(alias);

            // Prefer the tinted decoration icon; fall back to a bundled item icon
            // (a few jewels — Suiko, Akito, Battlefield, Lapislazuli — live in the items table).
            foreach (var c in cands)
                if (_jewelColor.TryGetValue(NormName(c), out var color))
                    return $"ms-appx:///Assets/Decorations/{color}.png";
            foreach (var c in cands)
                if (ResolveItemIcon(c) is { Length: > 0 } b)
                    return $"ms-appx:///Assets/Items/{b}.png";
            return "";
        }

        var basename = ResolveItemIcon(name);
        return basename.Length > 0 ? $"ms-appx:///Assets/Items/{basename}.png" : "";
    }

    private string ResolveItemIcon(string name)
    {
        if (_iconExact.TryGetValue(name, out var v)) return v;
        if (_iconNorm.TryGetValue(NormName(name), out var nv)) return nv;
        // Retry without a trailing note like "(less than 20% chance to receive)".
        var bare = Regex.Replace(name, @"\s*\(.*?\)\s*$", "").Trim();
        if (bare.Length > 0 && bare != name && _iconNorm.TryGetValue(NormName(bare), out var bv)) return bv;
        return "";
    }

    /// <summary>Name of the selected destination (for the header / bookmark name).</summary>
    public string SelectedLocationName => SelectedLocation?.Name ?? "";

    /// <summary>Find a destination by name (for bookmark deep-links).</summary>
    public TrenyaLocation? FindLocation(string name) =>
        Locations.FirstOrDefault(l => l.Name == name);

    partial void OnSelectedLocationChanged(TrenyaLocation? value)
    {
        OnPropertyChanged(nameof(SelectedLocationName));
        Tiers.Clear();
        if (value is not null)
            foreach (var pts in _all.Where(r => r.Location == value.Name).Select(r => r.Points)
                                    .Distinct().OrderBy(p => p))
                Tiers.Add(new TierOption(pts, $"{pts} Pokke Points"));
        SelectedTier = Tiers.FirstOrDefault();
        Rebuild();
    }

    partial void OnSelectedTierChanged(TierOption? value) => Rebuild();

    private void Rebuild()
    {
        Categories.Clear();
        if (SelectedLocation is null || SelectedTier is null) return;

        var rows = _all.Where(r => r.Location == SelectedLocation.Name && r.Points == SelectedTier.Points);
        foreach (var g in rows.GroupBy(r => r.Category))
        {
            var items = g.Select(r => new TrenyaItem(r.Item, ResolveIconUri(r.Item, g.Key))).ToList();
            if (items.Count > 0) Categories.Add(new CategoryGroup(g.Key, items));
        }
    }
}
