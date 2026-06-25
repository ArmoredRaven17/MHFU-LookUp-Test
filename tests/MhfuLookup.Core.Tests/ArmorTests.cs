using MhfuLookup.Core.Domain;
using MhfuLookup.Core.Models;
using Xunit;

namespace MhfuLookup.Core.Tests;

public class ArmorTests
{
    private static List<ArmorPiece> Pieces => TestData.Pieces;

    [Fact]
    public void LoadV2ArmorRunsClean() => Assert.Equal(1900, Pieces.Count);

    [Fact]
    public void EachSlotPopulated()
    {
        var grouped = ArmorLoader.GroupBySlot(Pieces);
        foreach (var slot in ArmorConstants.SlotNames)
            Assert.True(grouped[slot].Count > 100, $"slot {slot} only has {grouped[slot].Count}");
    }

    [Fact]
    public void ClassSplitProducesTwoPerSlot()
    {
        var headPieces = Pieces.Where(p => p.SetId == "hunter_s_armor_set" && p.Slot == "head").ToList();
        var classes = headPieces.Select(p => p.ClassType).ToHashSet();
        Assert.Equal(new HashSet<string> { "Blademaster", "Gunner" }, classes);
    }

    [Fact]
    public void ClassNeutralMarkedBoth()
    {
        var bothPieces = Pieces.Where(p => p.ClassType == "Both").ToList();
        Assert.NotEmpty(bothPieces);
    }

    [Fact]
    public void BlademasterFilterIncludesBoth()
    {
        var bm = ArmorLoader.FilterByClass(Pieces, "Blademaster");
        Assert.Contains(bm, p => p.ClassType == "Both");
        Assert.All(bm, p => Assert.Contains(p.ClassType, new[] { "Blademaster", "Both" }));
    }

    [Fact]
    public void GunnerFilterExcludesBlademaster()
    {
        var g = ArmorLoader.FilterByClass(Pieces, "Gunner");
        Assert.All(g, p => Assert.Contains(p.ClassType, new[] { "Gunner", "Both" }));
        Assert.DoesNotContain(g, p => p.ClassType == "Blademaster");
    }

    [Fact]
    public void FilterByGenderMaleExcludesFemaleExclusive()
    {
        var malePieces = ArmorLoader.FilterByGender(Pieces, "Male");
        Assert.All(malePieces, p => Assert.NotEqual("Female", p.GenderExclusive));
        Assert.Contains(Pieces, p => p.GenderExclusive == "Female");
    }

    [Fact]
    public void FilterByGenderFemaleIncludesFemaleExclusive()
    {
        var femalePieces = ArmorLoader.FilterByGender(Pieces, "Female");
        Assert.Contains(femalePieces, p => p.GenderExclusive == "Female");
    }

    [Fact]
    public void FilterByGenderFemaleSizeMatchesTotal()
    {
        var femalePieces = ArmorLoader.FilterByGender(Pieces, "Female");
        Assert.Equal(Pieces.Count, femalePieces.Count);
    }

    [Fact]
    public void FilterByGenderInvalidRaises()
    {
        Assert.Throws<ArgumentException>(() => ArmorLoader.FilterByGender(Pieces, null));
        Assert.Throws<ArgumentException>(() => ArmorLoader.FilterByGender(Pieces, "Other"));
    }

    [Fact]
    public void ArmorPieceSkillPointsAreCanonicalIds()
    {
        var v2Ids = TestData.Registry.ById.Keys.ToHashSet();
        foreach (var p in Pieces)
            foreach (var sp in p.SkillPoints)
                Assert.True(v2Ids.Contains(sp.Sid),
                    $"piece {p.NameMale} ({p.SetName}) has non-v2 id {sp.Sid}");
    }

    [Fact]
    public void DisplayNameDefaultIsMale()
    {
        var p = Pieces[0];
        Assert.Equal(p.NameMale, p.DisplayName());
    }

    [Fact]
    public void DisplayNameFemale()
    {
        var p = Pieces[0];
        Assert.Equal(p.NameFemale, p.DisplayName("Female"));
    }

    [Fact]
    public void InvalidClassRequestRaises() =>
        Assert.Throws<ArgumentException>(() => ArmorLoader.FilterByClass(Pieces, "InvalidClass"));
}
