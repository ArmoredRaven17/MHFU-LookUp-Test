namespace MhfuLookup.App.Services;

/// <summary>
/// User bookmarks across the reference tabs. Thin facade over the writable <c>bookmarks</c> table
/// (via <see cref="AppDb"/>) plus a <see cref="Changed"/> event so the star buttons and the
/// Bookmarks page stay in sync. Mirrors the <see cref="TabIcons"/> static-service pattern.
/// </summary>
public static class Bookmarks
{
    // Entity-type keys (also the nav tag, except quests which route via quest/training).
    public const string Monster = "monster";
    public const string Weapon = "weapon";
    public const string Item = "item";
    public const string ArmorSet = "armorset";
    public const string Decoration = "decoration";
    public const string Quest = "quest";
    public const string Treasure = "treasure";
    public const string ArmorSkill = "armorskill";
    public const string Gathering = "gathering";
    public const string Trenya = "trenya";

    /// <summary>Raised whenever a bookmark is added or removed, so views can refresh live.</summary>
    public static event Action? Changed;

    public static bool Contains(string type, string id) =>
        !string.IsNullOrEmpty(id) && AppDb.Instance.IsBookmarked(type, id);

    /// <summary>Toggle a bookmark on/off; returns the new state (true = now bookmarked). An optional
    /// icon uri is cached for types whose icon can't be re-derived from the name alone (quests).</summary>
    public static bool Toggle(string type, string id, string name, string icon = "")
    {
        if (string.IsNullOrEmpty(id)) return false;
        bool now;
        if (AppDb.Instance.IsBookmarked(type, id)) { AppDb.Instance.RemoveBookmark(type, id); now = false; }
        else { AppDb.Instance.AddBookmark(type, id, name, icon); now = true; }
        Changed?.Invoke();
        return now;
    }

    public static void Remove(string type, string id)
    {
        AppDb.Instance.RemoveBookmark(type, id);
        Changed?.Invoke();
    }

    public static IReadOnlyList<Core.Data.BookmarkRow> All() => AppDb.Instance.GetBookmarks();

    // -- Quest id encoding -------------------------------------------------------
    // A quest isn't uniquely identified by name alone, so its bookmark id packs the category slug
    // and quest name (unit-separator delimited). Training categories (slug "training_*") deep-link
    // through the Training School tab.
    private const string Sep = "\u001f";

    public static string EncodeQuest(string slug, string name) => $"{slug}{Sep}{name}";

    public static (string Slug, string Name, bool Training) DecodeQuest(string id)
    {
        var i = id.IndexOf(Sep, System.StringComparison.Ordinal);
        var slug = i < 0 ? "" : id[..i];
        var name = i < 0 ? id : id[(i + 1)..];
        return (slug, name, slug.StartsWith("training_", System.StringComparison.Ordinal));
    }
}
