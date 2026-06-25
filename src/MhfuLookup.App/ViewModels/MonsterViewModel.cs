using System.Collections.ObjectModel;
using CommunityToolkit.Mvvm.ComponentModel;
using MhfuLookup.App.Models;
using MhfuLookup.App.Services;
using MhfuLookup.Core.Data;

namespace MhfuLookup.App.ViewModels;

/// <summary>A type group of monsters for the grouped list.</summary>
public sealed class MonsterGroup : List<MonsterSummary>
{
    public string Type { get; }
    public MonsterGroup(string type, IEnumerable<MonsterSummary> items) : base(items) => Type = type;
}

public sealed partial class MonsterViewModel : ObservableObject
{
    private readonly List<MonsterSummary> _all;
    private readonly Dictionary<string, MonsterSummary> _byId;
    private readonly List<(string Type, List<string> Members)> _order;

    public ObservableCollection<MonsterGroup> Groups { get; } = new();

    [ObservableProperty] private string searchText = "";
    [ObservableProperty] private MonsterView? detail;

    public MonsterViewModel()
    {
        var db = AppDb.Instance;
        _all = db.GetMonsters();
        _byId = _all.ToDictionary(m => m.Id);
        _order = db.GetMonsterOrder();
        BuildGroups("");
    }

    partial void OnSearchTextChanged(string value) => BuildGroups(value);

    public void Select(string monsterId)
    {
        var doc = AppDb.Instance.GetMonsterDoc(monsterId);
        if (doc is null) { Detail = null; return; }
        var view = MonsterView.Parse(doc);
        view.Id = monsterId;
        Detail = view;
    }

    private void BuildGroups(string query)
    {
        Groups.Clear();
        bool Match(MonsterSummary m) =>
            string.IsNullOrWhiteSpace(query) || m.Name.Contains(query, StringComparison.OrdinalIgnoreCase);

        var placed = new HashSet<string>();
        foreach (var (type, members) in _order)
        {
            var items = new List<MonsterSummary>();
            foreach (var id in members)
                if (_byId.TryGetValue(id, out var m))
                {
                    placed.Add(id);
                    if (Match(m)) items.Add(m);
                }
            if (items.Count > 0) Groups.Add(new MonsterGroup(type, items));
        }

        // Any monsters not covered by order.json, grouped by their own type.
        var leftovers = _all.Where(m => !placed.Contains(m.Id) && Match(m))
            .GroupBy(m => string.IsNullOrEmpty(m.Type) ? "Other" : m.Type)
            .OrderBy(g => g.Key);
        foreach (var g in leftovers)
            Groups.Add(new MonsterGroup(g.Key, g.OrderBy(m => m.Name)));
    }
}
