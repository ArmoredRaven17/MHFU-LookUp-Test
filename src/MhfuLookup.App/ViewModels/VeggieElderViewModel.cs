using System.Collections.ObjectModel;
using System.Text.RegularExpressions;
using CommunityToolkit.Mvvm.ComponentModel;
using MhfuLookup.App.Services;

namespace MhfuLookup.App.ViewModels;

/// <summary>One Veggie Elder trade: the item handed over and its Common / Rare returns, each with a
/// resolved icon uri ("" = no icon). Zone/ShowZone label which zone the trade is in — shown only in
/// cross-zone search results.</summary>
public sealed record VeggieTrade(
    string Item, string ItemIcon,
    string Common, string CommonIcon,
    string Rare, string RareIcon,
    bool Alt, string Zone = "", bool ShowZone = false)
{
    public bool HasRare => Rare.Length > 0;
}

public sealed partial class VeggieElderViewModel : ObservableObject
{
    private readonly List<Core.Data.VeggieElderRow> _all;
    private readonly Dictionary<string, string> _iconExact = new(StringComparer.OrdinalIgnoreCase);
    private readonly Dictionary<string, string> _iconNorm = new();
    private static string NormName(string s) => Regex.Replace(s.ToLowerInvariant(), "[^a-z0-9]", "");

    public ObservableCollection<string> Zones { get; } = new();
    public ObservableCollection<VeggieTrade> Trades { get; } = new();

    [ObservableProperty] private string? selectedZone;
    [ObservableProperty] private string searchText = "";

    /// <summary>True while a search is active — results span every zone.</summary>
    public bool IsSearching => !string.IsNullOrWhiteSpace(SearchText);

    /// <summary>Heading for the right pane: the zone name, or the active search query.</summary>
    public string ResultTitle => IsSearching ? $"Search: “{SearchText.Trim()}”" : SelectedZone ?? "";

    /// <summary>Shown when a search matches nothing.</summary>
    public bool NoResults => IsSearching && Trades.Count == 0;

    public VeggieElderViewModel()
    {
        _all = AppDb.Instance.GetVeggieElder();

        // Item-name → icon (exact, then normalised) over items ∪ treasures — mirrors Pokke/Trenya/Granny.
        var named = AppDb.Instance.GetItems().Select(i => (i.Name, i.Icon))
            .Concat(AppDb.Instance.GetTreasures().Select(t => (t.Name, t.Icon)))
            .Where(x => x.Icon.Length > 0);
        foreach (var (name, icon) in named)
        {
            _iconExact.TryAdd(name, icon);
            _iconNorm.TryAdd(NormName(name), icon);
        }

        foreach (var zone in _all.Select(r => r.Zone).Distinct())
            Zones.Add(zone);
        SelectedZone = Zones.FirstOrDefault();
    }

    partial void OnSelectedZoneChanged(string? value)
    {
        OnPropertyChanged(nameof(ResultTitle));
        Rebuild();
    }

    partial void OnSearchTextChanged(string value)
    {
        OnPropertyChanged(nameof(IsSearching));
        OnPropertyChanged(nameof(ResultTitle));
        Rebuild();
    }

    private void Rebuild()
    {
        Trades.Clear();
        // Empty search: show the selected zone. Active search: match across every zone, tagging each
        // result with its zone so the user knows where to find it.
        var searching = IsSearching;
        IEnumerable<Core.Data.VeggieElderRow> rows;
        if (searching)
        {
            var q = SearchText.Trim();
            rows = _all.Where(r =>
                r.Item.Contains(q, StringComparison.OrdinalIgnoreCase) ||
                r.Common.Contains(q, StringComparison.OrdinalIgnoreCase) ||
                r.Rare.Contains(q, StringComparison.OrdinalIgnoreCase));
        }
        else
        {
            if (SelectedZone is null) { OnPropertyChanged(nameof(NoResults)); return; }
            rows = _all.Where(r => r.Zone == SelectedZone);
        }

        var alt = false;
        foreach (var r in rows)
        {
            Trades.Add(new VeggieTrade(
                r.Item, ResolveIconUri(r.Item),
                r.Common, ResolveIconUri(r.Common),
                r.Rare, ResolveIconUri(r.Rare),
                alt, r.Zone, searching));
            alt = !alt;
        }
        OnPropertyChanged(nameof(NoResults));
    }

    private string ResolveIconUri(string name)
    {
        if (name.Length == 0) return "";
        var b = _iconExact.TryGetValue(name, out var v) ? v
              : _iconNorm.TryGetValue(NormName(name), out var nv) ? nv : "";
        return b.Length > 0 ? $"ms-appx:///Assets/Items/{b}.png" : "";
    }
}
