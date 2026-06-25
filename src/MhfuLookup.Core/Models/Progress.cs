namespace MhfuLookup.Core.Models;

/// <summary>A specific point in one hub's star progression. Hashable (record struct).</summary>
public readonly record struct HubProgress(string Hub, int Stars);  // Hub: "Village" | "Guild" | "Guild G"

/// <summary>All known sources for one material. Mirrors src/material_index.py:MaterialAvailability.</summary>
public sealed class MaterialAvailability
{
    public string Material { get; }
    public HashSet<HubProgress> Sources { get; }

    public MaterialAvailability(string material, IEnumerable<HubProgress>? sources = null)
    {
        Material = material;
        Sources = sources is null ? new HashSet<HubProgress>() : new HashSet<HubProgress>(sources);
    }

    public int? EarliestInHub(string hub)
    {
        int? best = null;
        foreach (var s in Sources)
            if (s.Hub == hub && (best is null || s.Stars < best))
                best = s.Stars;
        return best;
    }
}

/// <summary>
/// The user's progression in each hub. Defaults are max (filter effectively off).
/// Mirrors src/progress.py:HunterProgress (a frozen, validated dataclass).
/// </summary>
public sealed record HunterProgress
{
    public int VillageStar { get; init; } = 9;   // 0..9
    public int GuildStar { get; init; } = 8;     // 0..8
    public int GuildGStar { get; init; } = 3;    // 0..3

    public HunterProgress(int villageStar = 9, int guildStar = 8, int guildGStar = 3)
    {
        VillageStar = villageStar;
        GuildStar = guildStar;
        GuildGStar = guildGStar;
        if (VillageStar is < 0 or > 9)
            throw new ArgumentOutOfRangeException(nameof(villageStar), VillageStar, "village_star must be 0..9");
        if (GuildStar is < 0 or > 8)
            throw new ArgumentOutOfRangeException(nameof(guildStar), GuildStar, "guild_star must be 0..8");
        if (GuildGStar is < 0 or > 3)
            throw new ArgumentOutOfRangeException(nameof(guildGStar), GuildGStar, "guild_g_star must be 0..3");
    }

    public bool IsAtOrPast(HubProgress source) => source.Hub switch
    {
        "Village" => VillageStar >= source.Stars,
        "Guild" => GuildStar >= source.Stars,
        "Guild G" => GuildGStar >= source.Stars,
        _ => false,  // unknown hub — never "reached"
    };
}
