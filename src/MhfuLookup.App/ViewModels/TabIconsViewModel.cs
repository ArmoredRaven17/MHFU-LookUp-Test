using System.Collections.ObjectModel;
using CommunityToolkit.Mvvm.ComponentModel;
using MhfuLookup.App.Services;

namespace MhfuLookup.App.ViewModels;

/// <summary>A selectable monster icon (id + display name) for the tab-icon pickers.</summary>
public sealed record MonsterOption(string Id, string Name);

/// <summary>One tab's icon picker row.</summary>
public sealed partial class TabIconRow : ObservableObject
{
    private readonly TabIconsViewModel _parent;

    public string Tag { get; }
    public string Title { get; }
    public ObservableCollection<MonsterOption> Options { get; } = new();

    [ObservableProperty] private MonsterOption? selected;

    public TabIconRow(string tag, string title, TabIconsViewModel parent)
    {
        Tag = tag; Title = title; _parent = parent;
    }

    partial void OnSelectedChanged(MonsterOption? value) => _parent.OnRowSelected(this, value);
}

/// <summary>
/// Backs the Settings "Tab Icons" section: one row per nav tab, each a monster picker.
/// A monster already chosen for another tab is filtered out, so no two tabs can repeat.
/// </summary>
public sealed class TabIconsViewModel
{
    private readonly List<MonsterOption> _all;
    private bool _suppress;

    public ObservableCollection<TabIconRow> Rows { get; } = new();

    public TabIconsViewModel()
    {
        _all = AppDb.Instance.GetMonsters()
            .Select(m => new MonsterOption(m.Id, m.Name))
            .OrderBy(m => m.Name, StringComparer.OrdinalIgnoreCase)
            .ToList();

        foreach (var (tag, title) in TabIcons.Tabs)
            Rows.Add(new TabIconRow(tag, title, this));

        Refilter();
    }

    public void OnRowSelected(TabIconRow row, MonsterOption? value)
    {
        if (_suppress || value is null) return;
        TabIcons.Set(row.Tag, value.Id);   // persists + refreshes the live nav
        Refilter();
    }

    /// <summary>Reset every tab to its default icon and resync the pickers.</summary>
    public void ResetToDefaults()
    {
        TabIcons.ResetToDefaults();
        Refilter();
    }

    /// <summary>Rebuild every row's option list to exclude monsters used by other tabs.</summary>
    private void Refilter()
    {
        _suppress = true;
        try
        {
            foreach (var row in Rows)
            {
                var currentId = TabIcons.Get(row.Tag);
                var usedByOthers = Rows.Where(r => r != row)
                    .Select(r => TabIcons.Get(r.Tag))
                    .ToHashSet();

                row.Options.Clear();
                foreach (var opt in _all)
                    if (opt.Id == currentId || !usedByOthers.Contains(opt.Id))
                        row.Options.Add(opt);

                row.Selected = row.Options.FirstOrDefault(o => o.Id == currentId);
            }
        }
        finally { _suppress = false; }
    }
}
