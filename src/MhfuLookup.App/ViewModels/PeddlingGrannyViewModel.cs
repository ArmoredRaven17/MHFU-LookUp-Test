using System.Collections.ObjectModel;
using System.Text.RegularExpressions;
using CommunityToolkit.Mvvm.ComponentModel;
using MhfuLookup.App.Services;

namespace MhfuLookup.App.ViewModels;

/// <summary>One ware: item name, price, and its resolved icon uri.</summary>
public sealed record GrannyEntry(string Name, string Price, string Icon);

public sealed partial class PeddlingGrannyViewModel : ObservableObject
{
    private readonly List<Core.Data.PeddlingGrannyRow> _all;
    private readonly Dictionary<string, string> _iconExact = new(StringComparer.OrdinalIgnoreCase);
    private readonly Dictionary<string, string> _iconNorm = new();
    private static string NormName(string s) => Regex.Replace(s.ToLowerInvariant(), "[^a-z0-9]", "");

    public ObservableCollection<string> Inventories { get; } = new();
    public ObservableCollection<GrannyEntry> Items { get; } = new();

    [ObservableProperty] private string? selectedInventory;

    public PeddlingGrannyViewModel()
    {
        _all = AppDb.Instance.GetPeddlingGranny();

        // Item-name → icon (exact, then normalised) over items ∪ treasures — mirrors Pokke/Trenya.
        var named = AppDb.Instance.GetItems().Select(i => (i.Name, i.Icon))
            .Concat(AppDb.Instance.GetTreasures().Select(t => (t.Name, t.Icon)))
            .Where(x => x.Icon.Length > 0);
        foreach (var (name, icon) in named)
        {
            _iconExact.TryAdd(name, icon);
            _iconNorm.TryAdd(NormName(name), icon);
        }

        foreach (var inv in _all.Select(r => r.Inventory).Distinct())
            Inventories.Add(inv);
        SelectedInventory = Inventories.FirstOrDefault();
    }

    /// <summary>True when a discounted inventory is selected (cheaper rotating stock).</summary>
    public bool IsDiscount => SelectedInventory?.StartsWith("Discount", StringComparison.OrdinalIgnoreCase) == true;

    partial void OnSelectedInventoryChanged(string? value)
    {
        Items.Clear();
        OnPropertyChanged(nameof(IsDiscount));
        if (value is null) return;
        foreach (var r in _all.Where(r => r.Inventory == value))
            Items.Add(new GrannyEntry(r.Item, r.Price, ResolveIconUri(r.Item)));
    }

    private string ResolveIconUri(string name)
    {
        var b = _iconExact.TryGetValue(name, out var v) ? v
              : _iconNorm.TryGetValue(NormName(name), out var nv) ? nv : "";
        return b.Length > 0 ? $"ms-appx:///Assets/Items/{b}.png" : "";
    }
}
