using System.Collections.ObjectModel;
using System.Text.Json.Nodes;
using CommunityToolkit.Mvvm.ComponentModel;
using MhfuLookup.App.Services;
using MhfuLookup.Core.Data;

namespace MhfuLookup.App.ViewModels;

/// <summary>One drop line: item name + its rate (rate is "" for fixed Training / point-based Treasure).</summary>
public sealed record GatherDrop(string Name, string Rate);

/// <summary>One line in a node's drop cell: either a rank sub-header (IsHeader, shown in the
/// "All Ranks" view) or an item drop (name + rate).</summary>
public sealed record GatherLine(string Name, string Rate, bool IsHeader)
{
    public bool IsDrop => !IsHeader;
}

/// <summary>A node row: location columns + the lines shown in its drop cell (one rank, or all).</summary>
public sealed record GatherDisplayRow(string Zone, string Node, string Type, IReadOnlyList<GatherLine> Lines);

/// <summary>All ranks parsed for one node; the view shows one rank at a time (chosen via the dropdown).</summary>
public sealed record GatheringNodeRow(
    string Zone, string Node, string Type,
    IReadOnlyList<GatherDrop> Low, IReadOnlyList<GatherDrop> High, IReadOnlyList<GatherDrop> GRank,
    IReadOnlyList<GatherDrop> Training, IReadOnlyList<GatherDrop> Treasure)
{
    /// <summary>All of this node's items merged — used by rank-less areas (source never specified rank).</summary>
    public IReadOnlyList<GatherDrop> Items =>
        Low.Concat(High).Concat(GRank).Concat(Training).Concat(Treasure).ToList();
}

public sealed partial class GatheringViewModel : ObservableObject
{
    // Rank dropdown options → the matching per-node drop list. "Items" (rank-less) handled separately.
    private static readonly (string Label, Func<GatheringNodeRow, IReadOnlyList<GatherDrop>> Get)[] RankDefs =
    {
        ("Low Rank", r => r.Low), ("High Rank", r => r.High), ("G Rank", r => r.GRank),
        ("Training", r => r.Training), ("Treasure", r => r.Treasure),
    };
    private const string ItemsRank = "Items";
    private const string AllRanks = "All Ranks";

    public ObservableCollection<NamedDoc> Areas { get; } = new();
    public ObservableCollection<string> Ranks { get; } = new();
    public ObservableCollection<GatherDisplayRow> Rows { get; } = new();

    [ObservableProperty] private NamedDoc? selectedArea;
    [ObservableProperty] private string? selectedRank;
    [ObservableProperty] private string searchText = "";

    private readonly List<GatheringNodeRow> _current = new();

    public GatheringViewModel()
    {
        foreach (var a in AppDb.Instance.GetGatheringAreas().OrderBy(a => a.Title, StringComparer.OrdinalIgnoreCase))
            Areas.Add(a);
        SelectedArea = Areas.FirstOrDefault();
    }

    /// <summary>True when the area offers more than one rank/category — otherwise the dropdown is disabled.</summary>
    public bool HasMultipleRanks => Ranks.Count > 1;

    partial void OnSelectedAreaChanged(NamedDoc? value)
    {
        OnPropertyChanged(nameof(SelectedAreaTitle));
        LoadArea(value);
    }
    partial void OnSelectedRankChanged(string? value) => RebuildRows();
    partial void OnSearchTextChanged(string value) => RebuildRows();

    /// <summary>Title of the selected area (for the header / bookmark name).</summary>
    public string SelectedAreaTitle => SelectedArea?.Title ?? "";

    /// <summary>Find an area by its slug (for bookmark deep-links).</summary>
    public NamedDoc? FindArea(string slug) => Areas.FirstOrDefault(a => a.Slug == slug);

    private static IReadOnlyList<GatherDrop> ParseDrops(JsonNode? n)
    {
        if (n is not JsonArray a) return System.Array.Empty<GatherDrop>();
        var drops = new List<GatherDrop>();
        foreach (var e in a)
        {
            switch (e)
            {
                // Weighted gather entry: { "item": "Herb", "rate": 62 } — real ROM-decoded drop rate.
                case JsonObject o when o["rate"] is JsonNode r && int.TryParse(r.ToString(), out int rate):
                    if (o["item"]?.ToString() is { Length: > 0 } itm)
                        drops.Add(new GatherDrop(itm, $"{rate}%"));
                    break;
                // Treasure point entry: { "item": "...", "points": "..." } — name only (points live in Treasures).
                case JsonObject o when o["points"] is not null:
                    if (o["item"]?.ToString() is { Length: > 0 } ti)
                        drops.Add(new GatherDrop(ti, ""));
                    break;
                case JsonObject o:
                    if (o["item"]?.ToString() is { Length: > 0 } oi) drops.Add(new GatherDrop(oi, ""));
                    break;
                // Plain string (Training fixed rewards, or nodes with no ROM match yet) — name only.
                case not null when e.ToString() is { Length: > 0 } s:
                    drops.Add(new GatherDrop(s, ""));
                    break;
            }
        }
        return drops;
    }

    private void LoadArea(NamedDoc? area)
    {
        _current.Clear();
        if (area is not null && AppDb.Instance.GetGatheringDoc(area.Slug) is { } doc &&
            doc["zones"] is JsonArray zones)
        {
            foreach (var zone in zones.OfType<JsonObject>())
            {
                var zoneName = zone["zone"]?.ToString() ?? "";
                if (zone["nodes"] is not JsonArray nodes) continue;
                foreach (var node in nodes.OfType<JsonObject>())
                    _current.Add(new GatheringNodeRow(
                        Zone: zoneName,
                        Node: node["node"]?.ToString() ?? "",
                        Type: node["type"]?.ToString() ?? "",
                        Low: ParseDrops(node["low"]),
                        High: ParseDrops(node["high"]),
                        GRank: ParseDrops(node["g_rank"]),
                        Training: ParseDrops(node["training"]),
                        Treasure: ParseDrops(node["treasure"])));
            }
        }

        // Build the rank dropdown: rank-less areas (no Low and no G data anywhere) get a single
        // "Items" option; otherwise list only the ranks that actually have data in this area.
        Ranks.Clear();
        var rankless = _current.Count > 0
                       && _current.All(r => r.Low.Count == 0)
                       && _current.All(r => r.GRank.Count == 0);
        var real = new List<string>();
        if (rankless)
            real.Add(ItemsRank);
        else
            foreach (var (label, get) in RankDefs)
                if (_current.Any(r => get(r).Count > 0)) real.Add(label);

        // Offer "All Ranks" (combined view) when the area has more than one rank.
        if (real.Count > 1) Ranks.Add(AllRanks);
        foreach (var r in real) Ranks.Add(r);

        OnPropertyChanged(nameof(HasMultipleRanks));

        // Keep the current selection if still valid; else default to the first actual rank (not All).
        SelectedRank = SelectedRank is { } keep && Ranks.Contains(keep) ? keep : real.FirstOrDefault();
        RebuildRows();   // explicit: covers the case where SelectedRank didn't change value
    }

    private void RebuildRows()
    {
        Rows.Clear();
        if (SelectedRank is null) return;
        var q = SearchText;
        bool Match(GatherDrop d) => string.IsNullOrWhiteSpace(q) || d.Name.Contains(q, StringComparison.OrdinalIgnoreCase);

        // "All Ranks": each node lists every rank it has, each under a rank sub-header.
        if (SelectedRank == AllRanks)
        {
            foreach (var r in _current)
            {
                var lines = new List<GatherLine>();
                foreach (var (label, get) in RankDefs)
                {
                    if (!Ranks.Contains(label)) continue;          // rank not present in this area
                    var drops = get(r).Where(Match).ToList();
                    if (drops.Count == 0) continue;
                    lines.Add(new GatherLine(label, "", true));     // rank sub-header
                    lines.AddRange(drops.Select(d => new GatherLine(d.Name, d.Rate, false)));
                }
                if (lines.Count > 0) Rows.Add(new GatherDisplayRow(r.Zone, r.Node, r.Type, lines));
            }
            return;
        }

        // A single rank (or the rank-less "Items" merge).
        Func<GatheringNodeRow, IReadOnlyList<GatherDrop>> sel =
            SelectedRank == ItemsRank
                ? r => r.Items
                : RankDefs.FirstOrDefault(d => d.Label == SelectedRank).Get ?? (_ => System.Array.Empty<GatherDrop>());
        foreach (var r in _current)
        {
            var drops = sel(r);
            if (drops.Count == 0 || !drops.Any(Match)) continue;
            Rows.Add(new GatherDisplayRow(r.Zone, r.Node, r.Type,
                drops.Select(d => new GatherLine(d.Name, d.Rate, false)).ToList()));
        }
    }
}
