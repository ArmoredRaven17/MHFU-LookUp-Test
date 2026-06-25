namespace MhfuLookup.Core.Models;

/// <summary>
/// A decoration (jewel). Mirrors src/decorations.py:Decoration.
/// </summary>
public sealed record Decoration
{
    public required string Id { get; init; }
    public required string Name { get; init; }
    public int SlotCost { get; init; }                  // 1, 2, or 3
    public int Cost { get; init; }
    public string Color { get; init; } = "";            // jewel tint (blacksmith palette name)
    public IReadOnlyDictionary<string, int> SkillEffects { get; init; }
        = new Dictionary<string, int>();                // canonical_skill_id → points (can be negative)
    public IReadOnlyList<IReadOnlyList<string>> Recipes { get; init; }
        = Array.Empty<IReadOnlyList<string>>();
}
