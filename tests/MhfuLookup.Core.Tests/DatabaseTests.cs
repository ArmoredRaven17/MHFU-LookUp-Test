using MhfuLookup.Core.Data;
using Xunit;

namespace MhfuLookup.Core.Tests;

/// <summary>
/// End-to-end test of the migration + repository facade: builds a temp DB from the
/// Python data tree, then validates the SQLite-backed reads (parity with the JSON loaders).
/// </summary>
public sealed class DatabaseTests : IDisposable
{
    private readonly string _dbPath;
    private readonly MhfuDatabase _db;

    public DatabaseTests()
    {
        _dbPath = Path.Combine(Path.GetTempPath(), $"mhfu_test_{Guid.NewGuid():N}.db");
        DatabaseBuilder.Build(TestData.DataDir, _dbPath);
        _db = new MhfuDatabase(_dbPath);
    }

    public void Dispose()
    {
        _db.Dispose();
        try { File.Delete(_dbPath); } catch { /* ignore */ }
    }

    [Fact]
    public void Monsters_Count()
    {
        var monsters = _db.GetMonsters();
        Assert.Equal(83, monsters.Count);
        Assert.Contains(monsters, m => m.Id == "rathian" && m.Name == "Rathian");
    }

    [Fact]
    public void MonsterDoc_HasHitzones()
    {
        var doc = _db.GetMonsterDoc("rathian");
        Assert.NotNull(doc);
        Assert.True(doc!["hitzones"] is System.Text.Json.Nodes.JsonArray a && a.Count > 0);
    }

    [Fact]
    public void Weapons_ElevenTypes()
    {
        var types = _db.GetWeaponTypes();
        Assert.Equal(11, types.Count);
        Assert.Contains("Great Sword", types);
        Assert.Contains("Heavy Bowgun", types);
    }

    [Fact]
    public void WeaponsByType_HasUpgradeLinksAndDoc()
    {
        var gs = _db.GetWeaponsByType("Great Sword");
        Assert.NotEmpty(gs);
        Assert.Contains(gs, w => w.UpgradesFrom is not null);       // tree links exist
        Assert.All(gs, w => Assert.True(w.Doc.Count > 0));          // raw doc preserved
    }

    [Fact]
    public void Decorations_168_WithEffectsAndRecipes()
    {
        var decos = _db.GetDecorations();
        Assert.Equal(168, decos.Count);
        var fierce = decos.First(d => d.Name == "Fierce Jewel");
        Assert.Equal(3, fierce.SkillEffects["attack"]);
        Assert.Equal(-1, fierce.SkillEffects["defense"]);
        Assert.Equal(2, fierce.SlotCost);
    }

    [Fact]
    public void Skills_LoadedWithLevels()
    {
        var skills = _db.GetSkills();
        Assert.NotEmpty(skills);
        var attack = skills.First(s => s.Id == "attack");
        Assert.Contains(attack.Levels, l => l.Name == "Attack Up (Large)");
    }

    [Fact]
    public void ClassSplitSet_HasTwoVariantsEachFivePieces()
    {
        var detail = _db.GetArmorSet("hunter_s_armor_set");
        Assert.NotNull(detail);
        Assert.True(detail!.ClassSplit);
        var classes = detail.Variants.Select(v => v.ClassType).ToHashSet();
        Assert.Equal(new HashSet<string> { "Blademaster", "Gunner" }, classes);
        foreach (var v in detail.Variants)
            Assert.Equal(5, v.Pieces.Count);
    }

    [Fact]
    public void GunnerVariant_InheritsBlademasterMaterials()
    {
        // Bone Armor is class_split; the Python loader gives Gunner pieces the BM
        // materials when their own are empty — verify that survived into the DB.
        var detail = _db.GetArmorSet("bone_armor_set");
        Assert.NotNull(detail);
        var gunner = detail!.Variants.FirstOrDefault(v => v.ClassType == "Gunner");
        Assert.NotNull(gunner);
        Assert.All(gunner!.Pieces, p => Assert.NotEmpty(p.Materials));
    }

    [Fact]
    public void MaterialIndex_BuildsFromDb()
    {
        var index = _db.BuildMaterialIndex();
        Assert.True(index.Materials.Count > 100);
        Assert.Contains("Honey", index.Materials.Keys);
    }

    [Fact]
    public void Settings_RoundTrip()
    {
        _db.SetSetting("ui_scale", "1.5");
        Assert.Equal("1.5", _db.GetSetting("ui_scale"));
    }
}
