namespace MhfuLookup.Core.Models;

/// <summary>A (canonical skill id, points) contribution. Hashable for set/dict use.</summary>
public readonly record struct SkillPoint(string Sid, int Points);

/// <summary>
/// One armor piece, flattened from the v2 schema as (set × class × slot).
/// Mirrors src/armor.py:ArmorPiece (a frozen dataclass).
/// </summary>
public sealed record ArmorPiece
{
    public required string SetId { get; init; }
    public required string SetName { get; init; }
    public required string Slot { get; init; }          // head | chest | arms | waist | legs
    public required string ClassType { get; init; }     // Blademaster | Gunner | Both
    public string Rank { get; init; } = "";             // Low | High | G
    public int Rarity { get; init; } = 1;
    public string? GenderExclusive { get; init; }       // Male | Female | null
    public bool HasPairedNames { get; init; }
    public string NameMale { get; init; } = "";
    public string NameFemale { get; init; } = "";
    public int Defense { get; init; }       // initial defense
    public int MaxDefense { get; init; }    // fully-upgraded defense (== Defense when no range)
    public int FireRes { get; init; }
    public int WaterRes { get; init; }
    public int ThunderRes { get; init; }
    public int IceRes { get; init; }
    public int DragonRes { get; init; }
    public int DecoSlots { get; init; }                 // 0–3
    public IReadOnlyList<SkillPoint> SkillPoints { get; init; } = Array.Empty<SkillPoint>();
    public IReadOnlyList<string> Materials { get; init; } = Array.Empty<string>();  // raw "N Material" strings
    public int Cost { get; init; }

    public string DisplayName(string? gender = null) => gender == "Female" ? NameFemale : NameMale;

    public Dictionary<string, int> SkillPointsDict()
    {
        var d = new Dictionary<string, int>();
        foreach (var sp in SkillPoints) d[sp.Sid] = sp.Points;
        return d;
    }

    /// <summary>Convenience: legacy callers that just want a single display name.</summary>
    public string Name => NameMale;
}

public static class ArmorConstants
{
    public static readonly string[] SlotNames = { "head", "chest", "arms", "waist", "legs" };
    public static readonly string[] ClassTypes = { "Blademaster", "Gunner", "Both" };
}
