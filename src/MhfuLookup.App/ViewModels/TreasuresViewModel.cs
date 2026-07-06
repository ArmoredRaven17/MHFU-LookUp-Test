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

    /// <summary>Which monsters the selected treasure can be carved / broken / captured / shiny-dropped from
    /// (Treasure-Hunt quests), with the rank and rate for each; empty when it has no monster source.</summary>
    public IReadOnlyList<MonsterSource> MonsterSources =>
        Selected is { } s ? MonsterSourceIndex.For(s.Name) : System.Array.Empty<MonsterSource>();

    public bool HasMonsterSources => MonsterSources.Count > 0;

    partial void OnSelectedChanged(TreasureRow? value)
    {
        OnPropertyChanged(nameof(MonsterSources));
        OnPropertyChanged(nameof(HasMonsterSources));
    }

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
