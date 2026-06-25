using MhfuLookup.Core.Domain;
using Xunit;

namespace MhfuLookup.Core.Tests;

public class BowSimulatorTests
{
    private static BowSpec Bow(int atk, int affinity, BowShotType type, int level, bool power = false) =>
        new("Sim", atk, affinity, BowElement.None, 0,
            new[] { new BowChargeShot(4, type, level) }, HasPowerCoating: power);

    private static BowChargeShot Shot(BowSpec b) => b.Charges[0];

    [Fact]
    public void ZeroAffinity_HasNoVariance_AndMatchesNeutralIndex()
    {
        var bow = Bow(300, 0, BowShotType.Rapid, 5);
        var sim = BowSimulator.Simulate(bow, Shot(bow), powerCoating: false, shots: 50, new Random(1));

        // No affinity → every roll is ×1.0, so every shot is identical and equals the index Avg.
        var indexAvg = BowDamage.Compute(bow, false)[0].RawAvg;
        Assert.Equal(indexAvg, sim.AvgRaw, 6);
        Assert.Equal(sim.MinRaw, sim.MaxRaw, 6);
        Assert.Equal(0, sim.TotalCrits);
        Assert.Equal(0, sim.TotalFeebles);
        Assert.Equal(sim.NormalRaw, sim.AvgRaw, 6);
    }

    [Fact]
    public void NegativeAffinity_OnlyFeebles_BoundedBelowNormal()
    {
        var bow = Bow(300, -40, BowShotType.Rapid, 5);
        var sim = BowSimulator.Simulate(bow, Shot(bow), false, shots: 200, new Random(7));

        Assert.Equal(0, sim.TotalCrits);                 // negative affinity never crits
        Assert.True(sim.TotalFeebles > 0);
        Assert.True(sim.MinRaw < sim.NormalRaw);         // a Feeble-heavy shot dips below normal
        Assert.True(sim.MaxRaw <= sim.NormalRaw + 1e-9); // best it can do is an all-normal shot
        Assert.True(sim.AvgRaw < sim.NormalRaw);
    }

    [Fact]
    public void PositiveAffinity_OnlyCrits_BoundedAboveNormal()
    {
        var bow = Bow(300, 50, BowShotType.Rapid, 5);
        var sim = BowSimulator.Simulate(bow, Shot(bow), false, shots: 200, new Random(7));

        Assert.Equal(0, sim.TotalFeebles);               // positive affinity never Feebles
        Assert.True(sim.TotalCrits > 0);
        Assert.True(sim.MaxRaw > sim.NormalRaw);         // a crit-heavy shot rises above normal
        Assert.True(sim.MinRaw >= sim.NormalRaw - 1e-9); // worst it can do is an all-normal shot
    }

    [Fact]
    public void ObservedCritRate_ConvergesToAffinity_OverManyArrows()
    {
        // 1-arrow shots make every roll a clean affinity coin-flip, so the rate should track 40%.
        var bow = Bow(200, -40, BowShotType.Rapid, 1);
        var sim = BowSimulator.Simulate(bow, Shot(bow), false, shots: 20000, new Random(12345));

        var feebleRate = (double)sim.TotalFeebles / sim.TotalHits;
        Assert.Equal(0.40, feebleRate, 1);   // within ~0.05 of 40%
    }

    [Fact]
    public void AverageRaw_ConvergesToNeutralIndexAvg()
    {
        var bow = Bow(384, 20, BowShotType.Rapid, 4, power: true);
        var sim = BowSimulator.Simulate(bow, Shot(bow), powerCoating: true, shots: 20000, new Random(99));

        var indexAvg = BowDamage.Compute(bow, true)[0].RawAvg;
        // Simulated mean should land near the analytic Avg (relative tolerance ~1%).
        Assert.True(Math.Abs(sim.AvgRaw - indexAvg) / indexAvg < 0.02,
            $"sim {sim.AvgRaw:0.0} vs index {indexAvg:0.0}");
    }

    [Fact]
    public void Deterministic_ForAGivenSeed()
    {
        var bow = Bow(300, -40, BowShotType.Rapid, 5);
        var a = BowSimulator.Simulate(bow, Shot(bow), false, 20, new Random(42));
        var b = BowSimulator.Simulate(bow, Shot(bow), false, 20, new Random(42));
        Assert.Equal(a.Shots.Select(s => s.Raw), b.Shots.Select(s => s.Raw));
    }
}
