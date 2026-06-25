namespace MhfuLookup.Core.Models;

/// <summary>One tier of a skill, e.g. (20, "Attack Up (Large)").</summary>
public sealed record SkillLevel(int Points, string Name, string Description = "");

/// <summary>A skill definition from armor_skills_v2.json.</summary>
public sealed record Skill(
    string Id,
    string Name,
    string Category,
    string Description,
    bool IsSpecial,
    bool HasDecoration,
    IReadOnlyList<SkillLevel> Levels);
