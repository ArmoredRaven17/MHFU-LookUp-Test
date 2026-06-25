using System.Text.Json.Nodes;
using MhfuLookup.Core.Data;
using MhfuLookup.Core.Domain;
using Xunit;

namespace MhfuLookup.Core.Tests;

public class BowDamageTests
{
    // ── FAQ constants (F2 / F3) ──────────────────────────────────────────────────

    [Theory]
    [InlineData(BowShotType.Rapid, 1, 12)]
    [InlineData(BowShotType.Rapid, 4, 12 + 4 + 3 + 2)]
    [InlineData(BowShotType.Scatter, 2, 5 + 6 + 5)]
    [InlineData(BowShotType.Scatter, 5, 5 + 5 + 6 + 5 + 5)]
    [InlineData(BowShotType.Pierce, 1, 6 * 3)]
    [InlineData(BowShotType.Pierce, 5, 6 * 5)]
    public void ArrowPowerSums_MatchFaq(BowShotType type, int level, int expectedSum) =>
        Assert.Equal(expectedSum, BowDamage.ArrowPowers(type, level).Sum());

    [Theory]
    [InlineData(BowShotType.Scatter, 2, 3)]   // 5-6-5 = 3 arrows
    [InlineData(BowShotType.Pierce, 3, 5)]    // 6×5 hits
    [InlineData(BowShotType.Rapid, 1, 1)]
    public void ArrowCounts_MatchFaq(BowShotType type, int level, int expectedCount) =>
        Assert.Equal(expectedCount, BowDamage.ArrowPowers(type, level).Count);

    [Theory]
    [InlineData(1, 0.4)]
    [InlineData(2, 1.0)]
    [InlineData(3, 1.5)]
    [InlineData(4, 1.7)]
    public void RawChargeMods_MatchFaq(int level, double expected) =>
        Assert.Equal(expected, BowDamage.RawChargeMod(level));

    [Theory]
    [InlineData(1, 0.5)]
    [InlineData(2, 0.75)]
    [InlineData(3, 1.0)]
    [InlineData(4, 1.125)]
    public void ElementChargeMods_MatchFaq(int level, double expected) =>
        Assert.Equal(expected, BowDamage.ElementChargeMod(level));

    [Theory]
    [InlineData(0, 1.0)]
    [InlineData(50, 1.125)]    // +50% affinity (best bow) → 0.5×1.25 + 0.5×1.0
    [InlineData(40, 1.1)]      // +40% affinity → expected 1.10×
    [InlineData(-30, 0.925)]   // −30% affinity (Tiger line) → 0.3×0.75 + 0.7×1.0
    [InlineData(-40, 0.9)]     // −40% affinity (Ukanlos Bow) → 0.4 Feeble (×0.75) + 0.6 normal
    [InlineData(-100, 0.75)]   // every hit Feeble
    public void ExpectedCrit_FromAffinity(int affinity, double expected) =>
        Assert.Equal(expected, BowDamage.ExpectedCritMultiplier(affinity), 6);

    [Fact]
    public void NegativeAffinity_LowersRaw_PositiveRaises()
    {
        BowSpec WithAffinity(int aff) => new("B", 300, aff, BowElement.None, 0,
            new[] { new BowChargeShot(1, BowShotType.Rapid, 1) }, HasPowerCoating: false);

        var feeble = BowDamage.Compute(WithAffinity(-40), false)[0].RawAvg;   // Ukanlos Bow
        var neutral = BowDamage.Compute(WithAffinity(0), false)[0].RawAvg;
        var keen = BowDamage.Compute(WithAffinity(50), false)[0].RawAvg;

        Assert.True(feeble < neutral, "negative affinity must reduce the Raw index");
        Assert.True(keen > neutral, "positive affinity must raise the Raw index");
        Assert.Equal(neutral * 0.90, feeble, 6);    // −40% → ×0.90
        Assert.Equal(neutral * 1.125, keen, 6);     // +50% → ×1.125
    }

    // ── Reproduce the FAQ's worked single-shot example end-to-end ────────────────
    // Dragonhead Harp III: ATP 240, Rapid Lv1, Charge 3, on Rathalos head (shot 55 / water 30).
    // The FAQ gets 29 raw + 9 element. We rebuild the full formula from our building blocks to
    // prove the tables and modifiers line up with the source.

    [Fact]
    public void FaqExample_RawAndElement_Reproduced()
    {
        double atp = 240, arrow = BowDamage.ArrowPowers(BowShotType.Rapid, 1).Sum() * 0.01;
        double range = 1.5, hitzoneShot = 0.55, defense = 1.0, rage = 1.0, crit = 1.0;

        var raw = atp * BowDamage.RawChargeMod(3) * arrow * range * crit * hitzoneShot * defense * rage / 1.2;
        Assert.Equal(29, (int)raw);

        double element = 300, hitzoneWater = 0.30;
        var ele = element * BowDamage.ElementChargeMod(3) * hitzoneWater * defense * rage / 10.0;
        Assert.Equal(9, (int)ele);
    }

    // ── Neutral-index Compute ────────────────────────────────────────────────────

    [Fact]
    public void Compute_NeutralIndex_RawAndElementPerCharge()
    {
        // Abominable Bow II: ATK 288, Ice 200, charges Rapid3 / Pierce4 / Rapid4 / Scatter5.
        var bow = new BowSpec("Abominable Bow II", 288, 0, BowElement.Ice, 200, new[]
        {
            new BowChargeShot(1, BowShotType.Rapid, 3),
            new BowChargeShot(2, BowShotType.Pierce, 4),
            new BowChargeShot(3, BowShotType.Rapid, 4),
            new BowChargeShot(4, BowShotType.Scatter, 5),
        }, HasPowerCoating: true);

        var rows = BowDamage.Compute(bow, powerCoating: false);
        Assert.Equal(4, rows.Count);

        // Charge 4 (Scatter 5 = 5-5-6-5-5, 5 arrows, sum 26):
        var c4 = rows[3];
        Assert.Equal(5, c4.ArrowCount);
        Assert.Equal(288 * 1.7 * 0.26 / 1.2, c4.RawAvg, 4);       // raw uses arrow-power sum
        Assert.Equal(200 * 1.125 * 5 / 10.0, c4.Element, 4);      // element uses arrow count
    }

    [Fact]
    public void Compute_RawRange_FollowsAffinitySign()
    {
        BowSpec Bow(int aff) => new("B", 300, aff, BowElement.None, 0,
            new[] { new BowChargeShot(1, BowShotType.Rapid, 1) }, HasPowerCoating: false);

        // Positive affinity: normal → crit. Min is a normal hit, Max is a crit, no Feeble.
        var pos = BowDamage.Compute(Bow(50), false)[0];
        var posBase = 300 * 0.4 * 0.12 / 1.2;                 // raw before crit
        Assert.Equal(posBase * 1.0, pos.RawMin, 6);          // never Feeble
        Assert.Equal(posBase * 1.125, pos.RawAvg, 6);
        Assert.Equal(posBase * 1.25, pos.RawMax, 6);         // crit ceiling

        // Negative affinity: Feeble → normal. Min is a Feeble hit, Max is a normal hit, no crit.
        var neg = BowDamage.Compute(Bow(-40), false)[0];
        Assert.Equal(posBase * 0.75, neg.RawMin, 6);         // Feeble floor
        Assert.Equal(posBase * 0.90, neg.RawAvg, 6);
        Assert.Equal(posBase * 1.0, neg.RawMax, 6);          // never crits

        // Zero affinity: flat — min = avg = max.
        var zero = BowDamage.Compute(Bow(0), false)[0];
        Assert.Equal(zero.RawMin, zero.RawAvg, 6);
        Assert.Equal(zero.RawAvg, zero.RawMax, 6);
    }

    [Theory]
    [InlineData(0, 1.0, 1.0)]
    [InlineData(50, 1.0, 1.25)]    // positive: normal floor, crit ceiling
    [InlineData(-40, 0.75, 1.0)]   // negative: Feeble floor, normal ceiling
    public void CritMultiplierBounds(int affinity, double min, double max)
    {
        Assert.Equal(min, BowDamage.MinCritMultiplier(affinity), 6);
        Assert.Equal(max, BowDamage.MaxCritMultiplier(affinity), 6);
    }

    [Fact]
    public void Compute_PowerCoating_BoostsRawOnly_WhenSupported()
    {
        var bow = new BowSpec("T", 200, 0, BowElement.Fire, 100, new[]
        {
            new BowChargeShot(1, BowShotType.Rapid, 1),
        }, HasPowerCoating: true);

        var bare = BowDamage.Compute(bow, powerCoating: false)[0];
        var powered = BowDamage.Compute(bow, powerCoating: true)[0];

        Assert.True(powered.PowerApplied);
        Assert.Equal(bare.RawAvg * 1.5, powered.RawAvg, 6);   // raw boosted ×1.5
        Assert.Equal(bare.Element, powered.Element, 6);       // element untouched
    }

    [Fact]
    public void Compute_PowerCoating_Ignored_WhenBowCannotLoadIt()
    {
        var bow = new BowSpec("NoPwr", 200, 0, BowElement.None, 0, new[]
        {
            new BowChargeShot(1, BowShotType.Rapid, 1),
        }, HasPowerCoating: false);

        var bare = BowDamage.Compute(bow, powerCoating: false)[0];
        var powered = BowDamage.Compute(bow, powerCoating: true)[0];

        Assert.False(powered.PowerApplied);
        Assert.Equal(bare.RawAvg, powered.RawAvg, 6);
    }

    // ── Parsing a stored WeaponRow ───────────────────────────────────────────────

    [Fact]
    public void Parse_ReadsCharges_Element_AndCoating()
    {
        var doc = (JsonObject)JsonNode.Parse("""
        {
          "special": "Ice 100 / Def +10",
          "charges": ["Rapid 2", "Pierce 3", "Rapid 4"],
          "coatings": ["Pwr", "Poi", "Par"]
        }
        """)!;
        var row = new WeaponRow(1, "x", "Bow", "Test Bow", 240, 40, 1, 0, null, doc);

        var bow = BowDamage.Parse(row);
        Assert.NotNull(bow);
        Assert.Equal(BowElement.Ice, bow!.Element);
        Assert.Equal(100, bow.ElementValue);
        Assert.True(bow.HasPowerCoating);
        Assert.Equal(3, bow.Charges.Count);
        Assert.Equal(new BowChargeShot(2, BowShotType.Pierce, 3), bow.Charges[1]);
    }

    [Fact]
    public void Parse_NoElement_ForStatusOrDefenseOnlySpecials()
    {
        var doc = (JsonObject)JsonNode.Parse("""
        { "special": "ParaC", "charges": ["Rapid 2"], "coatings": ["Par"] }
        """)!;
        var row = new WeaponRow(1, "x", "Bow", "Para Bow", 200, 0, 0, 0, null, doc);

        var bow = BowDamage.Parse(row)!;
        Assert.Equal(BowElement.None, bow.Element);
        Assert.False(bow.HasPowerCoating);
    }

    [Fact]
    public void Parse_ReturnsNull_ForNonBow() =>
        Assert.Null(BowDamage.Parse(new WeaponRow(1, "x", "Hammer", "H", 100, 0, 0, 0, null, new JsonObject())));
}
