using System.Collections.ObjectModel;
using CommunityToolkit.Mvvm.ComponentModel;
using MhfuLookup.App.Services;

namespace MhfuLookup.App.ViewModels;

/// <summary>One user note resolved for the Notes tab. <see cref="Note"/> is mutable so the in-tab
/// editor can write back to it; persistence is handled by the page on focus-out.</summary>
public sealed class NoteEntry
{
    public string EntityType { get; init; } = "";
    public string EntityId { get; init; } = "";
    public string Name { get; init; } = "";
    public string Category { get; init; } = "";   // monster/weapon type, armor rank, quest kind
    public string IconUri { get; init; } = "";
    public string Note { get; set; } = "";
}

/// <summary>A type group of notes for the grouped list (e.g. "Monsters").</summary>
public sealed class NoteGroup : List<NoteEntry>
{
    public string Header { get; }
    public NoteGroup(string header, IEnumerable<NoteEntry> items) : base(items) => Header = header;
}

public sealed partial class NotesViewModel : ObservableObject
{
    private static readonly (string Type, string Header)[] Sections =
    {
        ("monster", "Monsters"),
        ("weapon", "Weapons"),
        ("armorset", "Armor Sets"),
        ("quest", "Quests"),
    };

    public ObservableCollection<NoteGroup> Groups { get; } = new();

    [ObservableProperty] private bool isEmpty;

    public NotesViewModel() => Refresh();

    /// <summary>Rebuild the grouped list from the saved notes.</summary>
    public void Refresh()
    {
        Groups.Clear();
        var entries = new List<NoteEntry>();

        // Types with a normalised name column resolve via SQL (monster, weapon, armor set).
        foreach (var n in AppDb.Instance.GetUserNotes())
            entries.Add(new NoteEntry
            {
                EntityType = n.EntityType,
                EntityId = n.EntityId,
                Name = n.Name,
                Category = n.Category,
                IconUri = IconFor(n),
                Note = n.Note,
            });

        // Quests carry their name in the (slug-encoded) id, so resolve them here.
        foreach (var (id, note) in AppDb.Instance.GetUserNotesByType(Bookmarks.Quest))
        {
            var (_, name, training) = Bookmarks.DecodeQuest(id);
            entries.Add(new NoteEntry
            {
                EntityType = Bookmarks.Quest,
                EntityId = id,
                Name = name,
                Category = training ? "Training School" : "Quest",
                IconUri = TabIcons.IconUri("quest").ToString(),
                Note = note,
            });
        }

        foreach (var (type, header) in Sections)
        {
            var group = entries.Where(e => e.EntityType == type).ToList();
            if (group.Count > 0) Groups.Add(new NoteGroup(header, group));
        }
        IsEmpty = Groups.Count == 0;
    }

    private static string IconFor(Core.Data.UserNoteRow n) => n.EntityType switch
    {
        "monster" => $"ms-appx:///Assets/Monsters/{n.EntityId}.png",
        "weapon" => WeaponTypeIcons.Base(n.Category),       // Category = weapon type
        "armorset" => TabIcons.IconUri("armorset").ToString(),  // no per-set icon → the tab icon
        _ => "",
    };
}
