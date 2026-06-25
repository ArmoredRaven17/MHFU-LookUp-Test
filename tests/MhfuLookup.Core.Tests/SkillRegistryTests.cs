using MhfuLookup.Core.Domain;
using Xunit;

namespace MhfuLookup.Core.Tests;

public class SkillRegistryTests
{
    private static SkillRegistry Registry => TestData.Registry;

    [Fact]
    public void LoadsV2SchemaWrapper()
    {
        Assert.Equal("attack", Registry.CanonicalId("attack"));
        Assert.Equal("attack", Registry.CanonicalId("Attack"));
    }

    [Fact]
    public void TorsoIncThresholdFromData()
    {
        var thresh = Registry.Thresholds("torso_inc");
        Assert.Contains((10, "Torso Up"), thresh);
    }

    [Fact]
    public void IsSpecialSkill()
    {
        Assert.False(Registry.IsSpecialSkill("attack"));
        Assert.Contains(Registry.ById.Keys, sid => Registry.IsSpecialSkill(sid));
    }

    [Fact]
    public void CanonicalId_AcceptsAllThreeForms()
    {
        Assert.Equal("attack", Registry.CanonicalId("attack"));
        Assert.Equal("attack", Registry.CanonicalId("Attack"));
        Assert.Equal("attack", Registry.CanonicalId("Attack +1"));
    }

    [Fact]
    public void KnownAliasesResolve()
    {
        Assert.Equal("ice_res", Registry.CanonicalId("Ice Skill"));
        Assert.Equal("windpress", Registry.CanonicalId("WindPress"));
        Assert.Equal("crag_s_add", Registry.CanonicalId("Crag S Add"));
        Assert.Equal("clusts_add", Registry.CanonicalId("ClustS Add"));
    }

    [Fact]
    public void ActivationPicksHighestTier()
    {
        Assert.Equal("Attack Up (Medium)", Registry.ActivatedName("attack", 19));
        Assert.Equal("Attack Up (Large)", Registry.ActivatedName("attack", 20));
        Assert.Null(Registry.ActivatedName("attack", 9));
        Assert.Null(Registry.ActivatedName("attack", 0));
    }

    [Fact]
    public void NegativeActivation()
    {
        Assert.Equal("Attack Down (Small)", Registry.ActivatedName("attack", -10));
        Assert.Equal("Attack Down (Medium)", Registry.ActivatedName("attack", -19));
        Assert.Equal("Attack Down (Large)", Registry.ActivatedName("attack", -20));
        Assert.Null(Registry.ActivatedName("attack", -9));
    }

    [Fact]
    public void UnknownNameRaises() =>
        Assert.Throws<KeyNotFoundException>(() => Registry.CanonicalId("Definitely Not A Skill"));
}
