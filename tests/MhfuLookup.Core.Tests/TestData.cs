using MhfuLookup.Core.Domain;
using MhfuLookup.Core.Models;

namespace MhfuLookup.Core.Tests;

/// <summary>
/// Locates the Python project's data/ tree (the source of truth) and lazily loads
/// shared fixtures, so the ported tests validate parity against the exact same JSON.
/// </summary>
public static class TestData
{
    public static readonly string DataDir = FindDataDir();

    private static string FindDataDir()
    {
        var dir = new DirectoryInfo(AppContext.BaseDirectory);
        while (dir is not null)
        {
            var candidate = Path.Combine(dir.FullName, "mhfu-lookup", "data");
            if (File.Exists(Path.Combine(candidate, "v2", "armor_skills_v2.json")))
                return candidate;
            dir = dir.Parent;
        }
        throw new DirectoryNotFoundException(
            "Could not locate the mhfu-lookup/data directory from " + AppContext.BaseDirectory);
    }

    public static string V2(string name) => Path.Combine(DataDir, "v2", name);

    private static SkillRegistry? _registry;
    public static SkillRegistry Registry =>
        _registry ??= SkillRegistry.FromFile(V2("armor_skills_v2.json"));

    private static List<ArmorPiece>? _pieces;
    public static List<ArmorPiece> Pieces =>
        _pieces ??= ArmorLoader.LoadFromFile(V2("armor_sets_v2.json"), Registry);

    private static DecorationCatalog? _catalog;
    public static DecorationCatalog Catalog =>
        _catalog ??= DecorationCatalog.FromFile(V2("decorations_v2.json"));

    private static MaterialIndex? _index;
    public static MaterialIndex Index => _index ??= MaterialIndex.LoadFromPaths(
        Path.Combine(DataDir, "quests"),
        Path.Combine(DataDir, "monsters"),
        Path.Combine(DataDir, "gathering"));
}
