using MhfuLookup.Core.Domain;
using MhfuLookup.Core.Models;
using Xunit;

namespace MhfuLookup.Core.Tests;

public class ProgressTests
{
    private static ArmorPiece Piece(IEnumerable<string> materials, string slot = "head") => new()
    {
        SetId = "t", SetName = "t", Slot = slot, ClassType = "Both",
        Rank = "Low", Rarity = 1, GenderExclusive = null, HasPairedNames = false,
        NameMale = "t", NameFemale = "t",
        Materials = materials.ToList(),
    };

    private static MaterialIndex MakeIndex(Dictionary<string, List<HubProgress>> map) =>
        new(map.ToDictionary(kv => kv.Key, kv => new MaterialAvailability(kv.Key, kv.Value)));

    // ── HunterProgress validation ──

    [Fact]
    public void ProgressDefaultIsMax()
    {
        var p = new HunterProgress();
        Assert.Equal(9, p.VillageStar);
        Assert.Equal(8, p.GuildStar);
        Assert.Equal(3, p.GuildGStar);
    }

    [Fact]
    public void ProgressValidatesRanges()
    {
        _ = new HunterProgress(villageStar: 0, guildStar: 0, guildGStar: 0);
        _ = new HunterProgress(villageStar: 9, guildStar: 8, guildGStar: 3);
        Assert.Throws<ArgumentOutOfRangeException>(() => new HunterProgress(villageStar: 10));
        Assert.Throws<ArgumentOutOfRangeException>(() => new HunterProgress(villageStar: -1));
        Assert.Throws<ArgumentOutOfRangeException>(() => new HunterProgress(guildStar: 9));
        Assert.Throws<ArgumentOutOfRangeException>(() => new HunterProgress(guildGStar: 4));
    }

    [Fact]
    public void ProgressZeroExcludesHub()
    {
        var p = new HunterProgress(villageStar: 0, guildStar: 8, guildGStar: 3);
        Assert.False(p.IsAtOrPast(new HubProgress("Village", 1)));
        Assert.True(p.IsAtOrPast(new HubProgress("Guild", 1)));
    }

    [Fact]
    public void ProgressUnknownHubReturnsFalse()
    {
        var p = new HunterProgress();
        Assert.False(p.IsAtOrPast(new HubProgress("Mystery", 1)));
    }

    [Fact]
    public void ProgressIsHashable()
    {
        var s = new HashSet<HunterProgress> { new(villageStar: 4) };
        Assert.Contains(new HunterProgress(villageStar: 4), s);
    }

    // ── IsMaterialAvailable ──

    [Fact]
    public void MaterialAvailableWhenInReach()
    {
        var idx = MakeIndex(new() { ["Mountain Herb"] = new() { new("Village", 1) } });
        var p = new HunterProgress(villageStar: 4, guildStar: 0, guildGStar: 0);
        Assert.True(ProgressChecks.IsMaterialAvailable("Mountain Herb", p, idx));
    }

    [Fact]
    public void MaterialUnavailableWhenOutOfReach()
    {
        var idx = MakeIndex(new() { ["Akantor Fang"] = new() { new("Guild G", 2) } });
        var p = new HunterProgress(villageStar: 9, guildStar: 8, guildGStar: 0);
        Assert.False(ProgressChecks.IsMaterialAvailable("Akantor Fang", p, idx));
    }

    [Fact]
    public void MaterialAvailableWhenAnySourceInReach()
    {
        var idx = MakeIndex(new() { ["Bone"] = new() { new("Village", 5), new("Guild", 1) } });
        var p = new HunterProgress(villageStar: 0, guildStar: 2, guildGStar: 0);
        Assert.True(ProgressChecks.IsMaterialAvailable("Bone", p, idx));
    }

    [Fact]
    public void UnsourcedMaterialDefaultAvailable()
    {
        var idx = MakeIndex(new());
        var p = new HunterProgress(villageStar: 1, guildStar: 0, guildGStar: 0);
        Assert.True(ProgressChecks.IsMaterialAvailable("Mega Potion", p, idx));
    }

    [Fact]
    public void UnsourcedMaterialStrictMode()
    {
        var idx = MakeIndex(new());
        var p = new HunterProgress(villageStar: 1, guildStar: 0, guildGStar: 0);
        Assert.False(ProgressChecks.IsMaterialAvailable("Mega Potion", p, idx, treatUnsourcedAsAvailable: false));
    }

    // ── IsPieceAvailable ──

    [Fact]
    public void PieceBlockedByOneUnavailableMaterial()
    {
        var idx = MakeIndex(new()
        {
            ["Iron Ore"] = new() { new("Village", 1) },
            ["Akantor Fang"] = new() { new("Guild G", 2) },
        });
        var p = new HunterProgress(villageStar: 2, guildStar: 0, guildGStar: 0);
        var pc = Piece(new[] { "3 Iron Ore", "1 Akantor Fang" });
        Assert.False(ProgressChecks.IsPieceAvailable(pc, p, idx));
    }

    [Fact]
    public void PieceWithAllMaterialsAvailable()
    {
        var idx = MakeIndex(new()
        {
            ["Iron Ore"] = new() { new("Village", 1) },
            ["Bone"] = new() { new("Village", 1) },
        });
        var p = new HunterProgress(villageStar: 2, guildStar: 0, guildGStar: 0);
        var pc = Piece(new[] { "3 Iron Ore", "2 Bone" });
        Assert.True(ProgressChecks.IsPieceAvailable(pc, p, idx));
    }

    [Fact]
    public void PieceWithNoMaterialsIsAvailable()
    {
        var idx = MakeIndex(new());
        var p = new HunterProgress();
        var pc = Piece(Array.Empty<string>());
        Assert.True(ProgressChecks.IsPieceAvailable(pc, p, idx));
    }

    [Fact]
    public void PieceUnsourcedMaterialDefaultAvailable()
    {
        var idx = MakeIndex(new());
        var p = new HunterProgress(villageStar: 1, guildStar: 0, guildGStar: 0);
        var pc = Piece(new[] { "1 Mega Potion" });
        Assert.True(ProgressChecks.IsPieceAvailable(pc, p, idx));
    }
}
