using System.Collections.ObjectModel;
using CommunityToolkit.Mvvm.ComponentModel;
using MhfuLookup.App.Services;

namespace MhfuLookup.App.ViewModels;

/// <summary>A Guild Card award: icon + name + flavour description + how-to-earn condition.</summary>
public sealed record AwardView(string Name, string Description, string Condition, string IconUri);

public sealed partial class AwardsViewModel : ObservableObject
{
    private readonly List<AwardView> _all;

    public ObservableCollection<AwardView> Awards { get; } = new();

    [ObservableProperty] private string searchText = "";

    public AwardsViewModel()
    {
        _all = AppDb.Instance.GetAwards()
            .Select(a => new AwardView(a.Name, a.Description, a.Condition,
                a.Icon.Length > 0 ? $"ms-appx:///Assets/Awards/{a.Icon}.png" : ""))
            .ToList();
        Filter("");
    }

    partial void OnSearchTextChanged(string value) => Filter(value);

    private void Filter(string query)
    {
        Awards.Clear();
        foreach (var a in _all.Where(a =>
            string.IsNullOrWhiteSpace(query) ||
            a.Name.Contains(query, StringComparison.OrdinalIgnoreCase) ||
            a.Description.Contains(query, StringComparison.OrdinalIgnoreCase) ||
            a.Condition.Contains(query, StringComparison.OrdinalIgnoreCase)))
            Awards.Add(a);
    }
}
