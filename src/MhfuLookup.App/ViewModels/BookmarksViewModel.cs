using System.Collections.ObjectModel;
using CommunityToolkit.Mvvm.ComponentModel;
using MhfuLookup.App.Services;

namespace MhfuLookup.App.ViewModels;

/// <summary>One saved bookmark resolved for display: its type, stable id, name, and an icon uri.</summary>
public sealed record BookmarkEntry(string Type, string Id, string Name, string IconUri);

/// <summary>A type group of bookmarks for the grouped list (e.g. "Monsters").</summary>
public sealed class BookmarkGroup : List<BookmarkEntry>
{
    public string Header { get; }
    public BookmarkGroup(string header, IEnumerable<BookmarkEntry> items) : base(items) => Header = header;
}

public sealed partial class BookmarksViewModel : ObservableObject
{
    // Display order, header, and nav-tag (for the fallback icon) per entity type.
    private static readonly (string Type, string Header, string Tag)[] Sections =
    {
        (Bookmarks.Monster, "Monsters", "monster"),
        (Bookmarks.Weapon, "Weapons", "weapon"),
        (Bookmarks.Item, "Items", "items"),
        (Bookmarks.ArmorSet, "Armor Sets", "armorset"),
        (Bookmarks.Decoration, "Decorations", "decoration"),
        (Bookmarks.Quest, "Quests", "quest"),
        (Bookmarks.Treasure, "Treasures", "treasures"),
        (Bookmarks.ArmorSkill, "Armor Skills", "armorskill"),
        (Bookmarks.Gathering, "Gathering", "gathering"),
        (Bookmarks.Trenya, "Trenya", "trenya"),
    };

    private readonly Dictionary<string, string> _itemIcons = new(StringComparer.OrdinalIgnoreCase);
    private readonly Dictionary<string, string> _decoColors = new(StringComparer.OrdinalIgnoreCase);

    public ObservableCollection<BookmarkGroup> Groups { get; } = new();

    [ObservableProperty] private bool isEmpty;

    public BookmarksViewModel()
    {
        var db = AppDb.Instance;
        foreach (var i in db.GetItems()) if (i.Icon.Length > 0) _itemIcons.TryAdd(i.Name, i.Icon);
        foreach (var t in db.GetTreasures()) if (t.Icon.Length > 0) _itemIcons.TryAdd(t.Name, t.Icon);
        foreach (var d in db.GetDecorations()) if (d.Color.Length > 0) _decoColors.TryAdd(d.Name, d.Color);
        Refresh();
    }

    /// <summary>Rebuild the grouped list from the saved bookmarks.</summary>
    public void Refresh()
    {
        Groups.Clear();
        var all = Bookmarks.All();
        foreach (var (type, header, tag) in Sections)
        {
            var entries = all.Where(b => b.EntityType == type)
                .Select(b => new BookmarkEntry(b.EntityType, b.EntityId, DisplayName(b), IconFor(b, tag)))
                .ToList();
            if (entries.Count > 0) Groups.Add(new BookmarkGroup(header, entries));
        }
        IsEmpty = Groups.Count == 0;
    }

    // Quest names are stored already, but the id packs slug+name; the cached name is the display text.
    private static string DisplayName(Core.Data.BookmarkRow b) => b.Name;

    private string IconFor(Core.Data.BookmarkRow b, string tag)
    {
        if (b.Icon.Length > 0) return b.Icon;   // cached at bookmark time (quests)
        switch (b.EntityType)
        {
            case Bookmarks.Monster:
                return $"ms-appx:///Assets/Monsters/{b.EntityId}.png";
            case Bookmarks.Item:
            case Bookmarks.Treasure:
                if (_itemIcons.TryGetValue(b.Name, out var ic)) return $"ms-appx:///Assets/Items/{ic}.png";
                break;
            case Bookmarks.Decoration:
                if (_decoColors.TryGetValue(b.Name, out var col)) return $"ms-appx:///Assets/Decorations/{col}.png";
                break;
        }
        // Weapons / armor sets / quests (and any unresolved name) fall back to the tab's monster icon.
        return TabIcons.IconUri(tag).ToString();
    }
}
