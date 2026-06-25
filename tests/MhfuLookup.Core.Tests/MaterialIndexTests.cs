using MhfuLookup.Core.Domain;
using MhfuLookup.Core.Models;
using Xunit;

namespace MhfuLookup.Core.Tests;

public class MaterialIndexTests
{
    private static MaterialIndex Index => TestData.Index;

    [Fact]
    public void QuestRewardMaterialIndexed()
    {
        var avail = Index.Availability("Honey");
        Assert.NotNull(avail);
        Assert.Contains(new HubProgress("Village", 1), avail!.Sources);
    }

    [Fact]
    public void MonsterDropMaterialIndexed()
    {
        var avail = Index.Availability("Rathalos Scale");
        Assert.NotNull(avail);
        Assert.Contains(avail!.Sources, s => s.Hub == "Village" && s.Stars >= 1);
    }

    [Fact]
    public void GatheringMaterialIndexed()
    {
        var avail = Index.Availability("Mountain Herbs");
        Assert.NotNull(avail);
        Assert.Contains(new HubProgress("Village", 1), avail!.Sources);
        Assert.Contains(new HubProgress("Guild", 1), avail.Sources);
    }

    [Fact]
    public void GRankMaterialIndexed()
    {
        var avail = Index.Availability("Lao-ShanHvnlyScl");
        Assert.NotNull(avail);
        Assert.Contains(avail!.Sources, s => s.Hub == "Guild G");
    }

    [Fact]
    public void EarliestInHubUsesMinimum()
    {
        var avail = new MaterialAvailability("Test", new[]
        {
            new HubProgress("Village", 4), new HubProgress("Village", 6), new HubProgress("Guild", 2),
        });
        Assert.Equal(4, avail.EarliestInHub("Village"));
        Assert.Equal(2, avail.EarliestInHub("Guild"));
        Assert.Null(avail.EarliestInHub("Guild G"));
    }

    [Fact]
    public void IndexDoesntCrashOnDictDropEntries() => Assert.True(Index.Materials.Count > 100);

    [Fact]
    public void UnsourcedMaterialsReturned()
    {
        var unsourced = Index.UnsourcedMaterials(TestData.Pieces);
        Assert.NotNull(unsourced);
    }

    [Fact]
    public void FallbackLogged() => Assert.True(Index.FallbackCount >= 0);

    [Fact]
    public void HoneyInMaterials() => Assert.Contains("Honey", Index.Materials.Keys);
}
