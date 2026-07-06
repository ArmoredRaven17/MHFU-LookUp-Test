using System.Collections.ObjectModel;
using System.Text.Json.Nodes;
using System.Text.RegularExpressions;
using CommunityToolkit.Mvvm.ComponentModel;
using MhfuLookup.App.Services;
using MhfuLookup.Core.Data;

namespace MhfuLookup.App.ViewModels;

/// <summary>A category group of items for the grouped list.</summary>
public sealed class ItemCategoryGroup : List<ItemRow>
{
    public string Category { get; }
    public ItemCategoryGroup(string category, IEnumerable<ItemRow> items) : base(items) => Category = category;
}

/// <summary>One place an item can be gathered: Location (the map, e.g. Jungle), Area (the in-map zone,
/// e.g. Base Camp / Area 1), rank, and drop rate — all from the Gathering data. Alt drives striping.</summary>
public sealed record GatherSource(string Location, string Area, string Rank, string Rate, bool Alt = false);

public sealed partial class ItemsViewModel : ObservableObject
{
    private readonly List<ItemRow> _all;

    // Icon-less item-master entries that are actually Treasure-Hunt items — they belong in the
    // Treasures tab, not the Items list. Each one has a confirmed matching row in the Treasures
    // table (names here are the in-game truncations stored in `items`; the Treasures entries hold
    // the full names). Hidden here rather than deleted so the underlying data is untouched.
    // NOTE: only entries verified against the Treasures table are listed. "Celeb Cicada" was a
    // candidate but has no Treasures row and no item references — left visible pending ROM decoding,
    // since it may be a genuine item rather than a treasure.
    private static readonly HashSet<string> TreasureItems = new(StringComparer.Ordinal)
    {
        "Eldr Drgn Fossil", "Century Walnut", "Congalala Stomch", "Congalala Innrds",
        "GarugaClavclMeat", "GldFlynJewelSwd", "Holed Shaka Mask", "Velociprey Lily",
        "Gravibiscus", "Shining Jellyfsh", "Cephalos Wtrmeln", "Nobunaga Bonito",
        "Plump Goldenfish", "Med Wyvernfish", "Lateobrium", "Marilyn Btterfly",
    };

    // Item (normalised name) → the areas/ranks/rates it can be gathered from (from the Gathering data).
    private readonly Dictionary<string, List<GatherSource>> _gathered = new();
    private static string Norm(string s) => Regex.Replace(s.ToLowerInvariant(), "[^a-z0-9]", "");

    // Normalised names of every gatherable item — static so the list rows can flag them with a marker.
    private static readonly HashSet<string> GatherableNorms = new();
    public static bool IsGatherable(string name) => GatherableNorms.Contains(Norm(name));

    public ObservableCollection<ItemCategoryGroup> Groups { get; } = new();

    [ObservableProperty] private string searchText = "";
    [ObservableProperty] private ItemRow? selected;

    public ItemsViewModel()
    {
        // Hide "Cut Content" (unobtainable items we lack info to explain) and Treasure-Hunt items
        // (which have their own tab).
        _all = AppDb.Instance.GetItems()
            .Where(i => !string.Equals(i.Category, "Cut Content", StringComparison.OrdinalIgnoreCase))
            .Where(i => !TreasureItems.Contains(i.Name))
            .ToList();
        BuildGatheringIndex();
        Filter("");
    }

    /// <summary>Where the selected item can be gathered (area / rank / rate rows); empty when it isn't.</summary>
    public IReadOnlyList<GatherSource> GatherSources =>
        Selected is { } s && _gathered.TryGetValue(Norm(s.Name), out var v) ? v : System.Array.Empty<GatherSource>();

    public bool HasGathering => GatherSources.Count > 0;

    /// <summary>Which monsters the selected item can be carved / broken / captured / shiny-dropped from,
    /// with the rank and rate for each; empty when the item has no monster source.</summary>
    public IReadOnlyList<MonsterSource> MonsterSources =>
        Selected is { } s ? MonsterSourceIndex.For(s.Name) : System.Array.Empty<MonsterSource>();

    public bool HasMonsterSources => MonsterSources.Count > 0;

    partial void OnSelectedChanged(ItemRow? value)
    {
        OnPropertyChanged(nameof(GatherSources));
        OnPropertyChanged(nameof(HasGathering));
        OnPropertyChanged(nameof(MonsterSources));
        OnPropertyChanged(nameof(HasMonsterSources));
    }

    // Scan every gathering location's Low/High/G data once, mapping each item to the
    // (location, in-map area/zone, rank, rate) rows it drops from — same data as the Gathering tab.
    private void BuildGatheringIndex()
    {
        var ranks = new[] { ("low", "Low"), ("high", "High"), ("g_rank", "G") };
        var tmp = new Dictionary<string,
            List<(int LocOrder, string Location, int ZoneSeq, string Area, int RankOrder, string Rank, string Rate)>>();

        var locOrder = 0;
        var zoneSeq = 0;
        foreach (var loc in AppDb.Instance.GetGatheringAreas())
        {
            if (AppDb.Instance.GetGatheringDoc(loc.Slug) is { } doc && doc["zones"] is JsonArray zones)
                foreach (var zone in zones.OfType<JsonObject>())
                {
                    var zoneName = zone["zone"]?.ToString() ?? "";
                    var zs = zoneSeq++;
                    if (zone["nodes"] is not JsonArray nodes) continue;
                    foreach (var node in nodes.OfType<JsonObject>())
                        for (var ri = 0; ri < ranks.Length; ri++)
                            foreach (var (name, rate) in DropEntries(node[ranks[ri].Item1]))
                            {
                                var k = Norm(name);
                                if (!tmp.TryGetValue(k, out var rows)) { rows = new(); tmp[k] = rows; }
                                rows.Add((locOrder, loc.Title, zs, zoneName, ri, ranks[ri].Item2, rate));
                            }
                }
            locOrder++;
        }

        foreach (var (k, rows) in tmp)
        {
            var sorted = rows
                .GroupBy(r => (r.Location, r.Area, r.Rank, r.Rate))      // collapse identical rows
                .Select(g => g.First())
                .OrderBy(r => r.LocOrder).ThenBy(r => r.ZoneSeq).ThenBy(r => r.RankOrder).ThenByDescending(r => RatePct(r.Rate))
                .ToList();
            // Blank the Location on consecutive rows so each map reads as one group.
            var outp = new List<GatherSource>();
            string? prevLoc = null;
            for (var i = 0; i < sorted.Count; i++)
            {
                var r = sorted[i];
                outp.Add(new GatherSource(r.Location == prevLoc ? "" : r.Location, r.Area, r.Rank, r.Rate, i % 2 == 1));
                prevLoc = r.Location;
            }
            _gathered[k] = outp;
        }

        GatherableNorms.Clear();
        foreach (var key in _gathered.Keys) GatherableNorms.Add(key);
    }

    private static int RatePct(string rate) => int.TryParse(rate.TrimEnd('%'), out var v) ? v : -1;

    private static IEnumerable<(string Name, string Rate)> DropEntries(JsonNode? n)
    {
        if (n is not JsonArray a) yield break;
        foreach (var e in a)
        {
            if (e is JsonObject o)
            {
                if (o["item"]?.ToString() is not { Length: > 0 } item) continue;
                var rate = o["rate"] is JsonNode r && int.TryParse(r.ToString(), out var rv) ? $"{rv}%" : "";
                yield return (item, rate);
            }
            else if (e?.ToString() is { Length: > 0 } s) yield return (s, "");
        }
    }

    /// <summary>Find a loaded item by its (unique) name — used for bookmark deep-linking.</summary>
    public ItemRow? FindByName(string name) =>
        _all.FirstOrDefault(i => string.Equals(i.Name, name, StringComparison.Ordinal));

    partial void OnSearchTextChanged(string value) => Filter(value);

    private void Filter(string query)
    {
        Groups.Clear();
        var matching = _all.Where(i =>
            string.IsNullOrWhiteSpace(query) ||
            i.Name.Contains(query, StringComparison.OrdinalIgnoreCase) ||
            i.Description.Contains(query, StringComparison.OrdinalIgnoreCase));
        // Preserve source category order (first appearance).
        foreach (var g in matching.GroupBy(i => i.Category))
            Groups.Add(new ItemCategoryGroup(g.Key, g));
    }
}
