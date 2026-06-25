using System.Collections.ObjectModel;
using CommunityToolkit.Mvvm.ComponentModel;
using MhfuLookup.App.Services;
using MhfuLookup.Core.Data;

namespace MhfuLookup.App.ViewModels;

/// <summary>An area group of treasures for the grouped list.</summary>
public sealed class TreasureAreaGroup : List<TreasureRow>
{
    public string Area { get; }
    public TreasureAreaGroup(string area, IEnumerable<TreasureRow> items) : base(items) => Area = area;
}

public sealed partial class TreasuresViewModel : ObservableObject
{
    private readonly List<TreasureRow> _all;

    public ObservableCollection<TreasureAreaGroup> Groups { get; } = new();

    [ObservableProperty] private string searchText = "";
    [ObservableProperty] private TreasureRow? selected;

    public TreasuresViewModel()
    {
        _all = AppDb.Instance.GetTreasures();
        Filter("");
    }

    /// <summary>Find a loaded treasure by its (unique) name — used for bookmark deep-linking.</summary>
    public TreasureRow? FindByName(string name) =>
        _all.FirstOrDefault(t => string.Equals(t.Name, name, StringComparison.Ordinal));

    partial void OnSearchTextChanged(string value) => Filter(value);

    private void Filter(string query)
    {
        Groups.Clear();
        var matching = _all.Where(t =>
            string.IsNullOrWhiteSpace(query) ||
            t.Name.Contains(query, StringComparison.OrdinalIgnoreCase) ||
            t.Description.Contains(query, StringComparison.OrdinalIgnoreCase) ||
            t.WhereToFind.Contains(query, StringComparison.OrdinalIgnoreCase));
        foreach (var g in matching.GroupBy(t => t.Area))
            Groups.Add(new TreasureAreaGroup(g.Key, g));
    }
}
