using MhfuLookup.Core.Domain;
using Xunit;

namespace MhfuLookup.Core.Tests;

public class DecorationsTests
{
    private static DecorationCatalog Catalog => TestData.Catalog;

    [Fact]
    public void LoadsV2Schema() => Assert.Equal(168, Catalog.All.Count);

    [Fact]
    public void FierceJewelStructured()
    {
        var fierce = Catalog.All.First(d => d.Name == "Fierce Jewel");
        Assert.Equal(new Dictionary<string, int> { ["attack"] = 3, ["defense"] = -1 },
            new Dictionary<string, int>(fierce.SkillEffects));
        Assert.Equal(2, fierce.SlotCost);
        Assert.Equal(375, fierce.Cost);
        Assert.Equal("fierce_jewel", fierce.Id);
    }

    [Fact]
    public void HealthJewelHasRecipes()
    {
        var health = Catalog.All.First(d => d.Name == "Health Jewel");
        Assert.True(health.Recipes.Count >= 1);
    }

    [Fact]
    public void PurePositiveExcludesFierce()
    {
        var names = Catalog.PurePositive.Select(d => d.Name).ToHashSet();
        Assert.DoesNotContain("Fierce Jewel", names);
    }

    [Fact]
    public void PurePositiveIncludesAttackJewel()
    {
        var aj = Catalog.All.First(d => d.Name == "Attack Jewel");
        Assert.Contains(aj, Catalog.PurePositive);
    }

    [Fact]
    public void BySkillPositiveSortedByEfficiency()
    {
        var decos = Catalog.BySkillPositive.GetValueOrDefault("attack") ?? new();
        Assert.NotEmpty(decos);
        var pps = decos.Select(d => d.SkillEffects["attack"] / (double)Math.Max(1, d.SlotCost)).ToList();
        var sorted = pps.OrderByDescending(x => x).ToList();
        Assert.Equal(sorted, pps);
    }

    [Fact]
    public void BySlotSizePartitionsCorrectly()
    {
        var total = Catalog.BySlotSize.Values.Sum(v => v.Count);
        Assert.Equal(Catalog.All.Count, total);
        foreach (var (size, decos) in Catalog.BySlotSize)
            foreach (var d in decos)
                Assert.Equal(size, d.SlotCost);
    }
}
